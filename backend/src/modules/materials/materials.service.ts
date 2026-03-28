import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { MultipartFile } from '@fastify/multipart';
import { env } from '../../config/env.js';
import { getRedis } from '../../config/redis.js';
import { trackActivity } from '../../utils/influx-writer.js';
import { deleteCachePattern } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';
import { ServiceError } from '../../utils/service-error.js';
import { MaterialModel, type MaterialDocument } from './materials.model.js';
import { CommentModel, type CommentDocument } from './comments.model.js';
import { UserModel } from '../users/users.model.js';
import { notifyMultipleUsers } from '../notifications/notifications.service.js';
import { runCypher } from '../../config/neo4j.js';
import type { MaterialQueryInput, CreateMaterialInput, AddCommentInput } from '@student-platform/shared';
import type { JwtPayload } from '../../plugins/auth.plugin.js';

/** A MultipartFile that may already have its content buffered (e.g. after validation). */
interface BufferedFile extends MultipartFile {
  _buffer?: Buffer;
}

interface MaterialsResult {
  materials: MaterialDocument[];
  total: number;
  page: number;
  limit: number;
}

interface MaterialDetail {
  material: MaterialDocument;
  comments: CommentDocument[];
}

const SORT_MAP: Record<string, Record<string, -1 | 1>> = {
  newest: { createdAt: -1 },
  popular: { 'stats.views': -1 },
  downloads: { 'stats.downloads': -1 },
  likes: { 'stats.likes': -1 },
};

export async function getMaterials(query: MaterialQueryInput): Promise<MaterialsResult> {
  const { courseId, type, search, sort, page, limit } = query;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (courseId) {
    filter['course.id'] = new Types.ObjectId(courseId);
  }
  if (type) {
    filter.type = type;
  }
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [{ title: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
  }

  const sortOrder = SORT_MAP[sort] ?? SORT_MAP.newest;

  const [materials, total] = await Promise.all([
    MaterialModel.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .select('-likedBy')
      .lean(),
    MaterialModel.countDocuments(filter),
  ]);

  if (search) {
    trackActivity('search_queries', { type: 'material' }, { query: search, resultCount: materials.length });
  }

  return { materials: materials as unknown as MaterialDocument[], total, page, limit };
}

export async function getMaterialById(
  id: string,
  page = 1,
  limit = 20
): Promise<MaterialDetail | null> {
  const material = await MaterialModel.findById(id)
    .select('-likedBy')
    .lean() as MaterialDocument | null;

  if (!material) return null;

  const redis = await getRedis();
  const viewKey = `counter:material:${id}:views`;
  await redis.incr(viewKey);
  await redis.expire(viewKey, 86400);

  trackActivity(
    'material_activity',
    { action: 'view', type: material.type },
    { materialId: id, count: 1 }
  );

  const commentSkip = (page - 1) * limit;
  const comments = await CommentModel.find({ 'target.type': 'material', 'target.id': id })
    .sort({ createdAt: -1 })
    .skip(commentSkip)
    .limit(limit)
    .lean() as unknown as CommentDocument[];

  return { material, comments };
}

export async function createMaterial(
  data: CreateMaterialInput,
  files: BufferedFile[],
  user: JwtPayload & { name: string; avatar?: string }
): Promise<MaterialDocument> {
  const uploadDir = path.join(env.UPLOAD_DIR, 'materials');
  await fs.mkdir(uploadDir, { recursive: true });

  const savedFiles = [];
  for (const file of files) {
    const ext = path.extname(file.filename).toLowerCase() || '';
    const safeFilename = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, safeFilename);
    const buffer = file._buffer ?? await file.toBuffer();
    await fs.writeFile(filePath, buffer);

    savedFiles.push({
      filename: safeFilename,
      originalName: file.filename,
      mimeType: file.mimetype,
      size: buffer.length,
      url: `/uploads/materials/${safeFilename}`,
    });
  }

  const material = await MaterialModel.create({
    title: data.title,
    course: {
      id: new Types.ObjectId(data.courseId),
      title: data.courseTitle,
      code: data.courseCode,
    },
    type: data.type,
    description: data.description,
    author: { id: new Types.ObjectId(user.id), name: user.name, avatar: user.avatar },
    files: savedFiles,
    tags: data.tags ?? [],
    semester: data.semester,
  });

  await UserModel.findByIdAndUpdate(user.id, {
    $inc: { 'stats.materialsUploaded': 1, 'stats.reputation': 5 },
  });

  trackActivity('material_activity', { action: 'create', type: data.type }, { count: 1 });
  await deleteCachePattern('app:cache:materials:*');

  // Notify enrolled students (Neo4j query for course enrollees, exclude author)
  try {
    const result = await runCypher(
      `MATCH (s:Student)-[:ENROLLED_IN]->(c:Course {id: $courseId})
       WHERE s.id <> $authorId
       RETURN s.id AS id LIMIT 50`,
      { courseId: data.courseId, authorId: user.id },
    );
    const enrolledIds = result.records.map((r) => r.get('id') as string).filter(Boolean);
    if (enrolledIds.length > 0) {
      notifyMultipleUsers(
        enrolledIds,
        'MATERIAL_NEW',
        'Новый материал по вашему курсу',
        `${user.name} загрузил "${material.title}" по курсу "${data.courseTitle}"`,
        `/materials/${material._id}`,
      ).catch((err) => logger.error(err, '[Materials] Failed to notify enrolled students'));
    }
  } catch (err) {
    logger.error(err, '[Materials] Neo4j query for enrolled students failed');
  }

  return material;
}

export async function toggleLike(
  materialId: string,
  userId: string
): Promise<{ liked: boolean; likes: number }> {
  const uid = new Types.ObjectId(userId);

  // Atomic: try to pull first. If nothing was pulled, add instead.
  const pullResult = await MaterialModel.findOneAndUpdate(
    { _id: materialId, likedBy: uid },
    { $pull: { likedBy: uid }, $inc: { 'stats.likes': -1 } },
    { new: true }
  ).lean();

  if (pullResult) {
    return { liked: false, likes: pullResult.stats?.likes ?? 0 };
  }

  // User hadn't liked — add atomically
  const addResult = await MaterialModel.findByIdAndUpdate(
    materialId,
    { $addToSet: { likedBy: uid }, $inc: { 'stats.likes': 1 } },
    { new: true }
  ).lean();

  if (!addResult) throw new ServiceError('Материал не найден', 'NOT_FOUND');

  // Grant reputation to material author
  await UserModel.findByIdAndUpdate(addResult.author.id, {
    $inc: { 'stats.reputation': 1 },
  });

  return { liked: true, likes: addResult.stats?.likes ?? 0 };
}

export async function addComment(
  materialId: string,
  user: JwtPayload & { name: string; avatar?: string },
  data: AddCommentInput
): Promise<CommentDocument> {
  const material = await MaterialModel.findById(materialId).lean();
  if (!material) throw new ServiceError('Материал не найден', 'NOT_FOUND');

  const comment = await CommentModel.create({
    target: { type: 'material', id: new Types.ObjectId(materialId) },
    author: { id: new Types.ObjectId(user.id), name: user.name, avatar: user.avatar },
    text: data.text,
  });

  await MaterialModel.findByIdAndUpdate(materialId, {
    $inc: { 'stats.commentCount': 1 },
  });

  return comment;
}

export async function deleteMaterial(
  materialId: string,
  userId: string,
  userRole: string
): Promise<void> {
  const material = await MaterialModel.findById(materialId).lean();
  if (!material) throw new ServiceError('Материал не найден', 'NOT_FOUND');

  const isAuthor = material.author.id.toString() === userId;
  const isModerator = userRole === 'moderator' || userRole === 'admin';

  if (!isAuthor && !isModerator) throw new ServiceError('Недостаточно прав', 'FORBIDDEN');

  for (const file of material.files) {
    const filePath = path.join(env.UPLOAD_DIR, 'materials', file.filename);
    await fs.unlink(filePath).catch((err) => {
      logger.warn({ filePath, err }, 'Failed to delete material file');
    });
  }

  await MaterialModel.findByIdAndDelete(materialId);
  await CommentModel.deleteMany({ 'target.type': 'material', 'target.id': materialId });

  await UserModel.findByIdAndUpdate(material.author.id, {
    $inc: { 'stats.materialsUploaded': -1 },
  });

  await deleteCachePattern('app:cache:materials:*');
}

export async function downloadMaterial(
  materialId: string,
  userId: string
): Promise<MaterialDocument | null> {
  const material = await MaterialModel.findById(materialId).lean() as MaterialDocument | null;
  if (!material) return null;

  const redis = await getRedis();
  const dlKey = `counter:material:${materialId}:downloads`;
  await redis.incr(dlKey);
  await redis.expire(dlKey, 86400);

  trackActivity(
    'material_activity',
    { action: 'download', type: material.type },
    { materialId, count: 1 }
  );

  return material;
}
