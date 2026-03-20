import type { FastifyRequest, FastifyReply } from 'fastify';
import { success, error, paginated } from '../../utils/api-response.js';
import { validateFileType } from '../../utils/file-validation.js';
import { formatFullName } from '../../utils/format.js';
import * as materialsService from './materials.service.js';
import { UserModel } from '../users/users.model.js';
import type { MaterialQueryInput, AddCommentInput } from '@student-platform/shared';

const MATERIAL_ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/zip',
];

export async function getMaterials(
  request: FastifyRequest<{ Querystring: MaterialQueryInput }>,
  reply: FastifyReply
): Promise<void> {
  const result = await materialsService.getMaterials(request.query);
  reply.send(paginated(result.materials, result.total, result.page, result.limit));
}

export async function getMaterialById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await materialsService.getMaterialById(request.params.id);

  if (!result) {
    reply.code(404).send(error('NOT_FOUND', 'Материал не найден'));
    return;
  }

  reply.send(success({ material: result.material, comments: result.comments }));
}

export async function createMaterial(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parts = request.parts();
  const fields: Record<string, string> = {};
  const files = [];

  for await (const part of parts) {
    if (part.type === 'file') {
      // Buffer the file and validate magic bytes before accepting
      const buffer = await part.toBuffer();
      const { valid } = validateFileType(buffer, part.mimetype, MATERIAL_ALLOWED_MIMES);
      if (!valid) {
        reply.code(400).send(error('BAD_REQUEST', 'Тип файла не поддерживается'));
        return;
      }
      files.push({ ...part, _buffer: buffer });
    } else {
      fields[part.fieldname] = (part as { value: string }).value;
    }
  }

  if (files.length === 0) {
    reply.code(400).send(error('VALIDATION_ERROR', 'Необходимо загрузить хотя бы один файл'));
    return;
  }

  const user = await UserModel.findById(request.user.id).lean();
  if (!user) {
    reply.code(401).send(error('UNAUTHORIZED', 'Пользователь не найден'));
    return;
  }

  const authorName = formatFullName(user.name);
  const data = {
    title: fields.title,
    courseId: fields.courseId,
    courseTitle: fields.courseTitle,
    courseCode: fields.courseCode,
    type: fields.type,
    description: fields.description,
    tags: fields.tags ? JSON.parse(fields.tags) : undefined,
    semester: fields.semester,
  };

  const material = await materialsService.createMaterial(
    data as Parameters<typeof materialsService.createMaterial>[0],
    files,
    { ...request.user, name: authorName, avatar: user.avatar }
  );

  reply.code(201).send(success(material));
}

export async function toggleLike(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const result = await materialsService.toggleLike(request.params.id, request.user.id);
    reply.send(success(result));
  } catch (err) {
    if ((err as Error).message === 'NOT_FOUND') {
      reply.code(404).send(error('NOT_FOUND', 'Материал не найден'));
      return;
    }
    throw err;
  }
}

export async function addComment(
  request: FastifyRequest<{ Params: { id: string }; Body: AddCommentInput }>,
  reply: FastifyReply
): Promise<void> {
  const user = await UserModel.findById(request.user.id).lean();
  if (!user) {
    reply.code(401).send(error('UNAUTHORIZED', 'Пользователь не найден'));
    return;
  }

  try {
    const authorName = formatFullName(user.name);
    const comment = await materialsService.addComment(
      request.params.id,
      { ...request.user, name: authorName, avatar: user.avatar },
      request.body
    );
    reply.code(201).send(success(comment));
  } catch (err) {
    if ((err as Error).message === 'NOT_FOUND') {
      reply.code(404).send(error('NOT_FOUND', 'Материал не найден'));
      return;
    }
    throw err;
  }
}

export async function deleteMaterial(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    await materialsService.deleteMaterial(
      request.params.id,
      request.user.id,
      request.user.role
    );
    reply.send(success({ deleted: true }));
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'NOT_FOUND') {
      reply.code(404).send(error('NOT_FOUND', 'Материал не найден'));
      return;
    }
    if (message === 'FORBIDDEN') {
      reply.code(403).send(error('FORBIDDEN', 'Недостаточно прав для удаления'));
      return;
    }
    throw err;
  }
}

export async function downloadMaterial(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user?.id ?? 'anonymous';
  const material = await materialsService.downloadMaterial(request.params.id, userId);

  if (!material || material.files.length === 0) {
    reply.code(404).send(error('NOT_FOUND', 'Файл не найден'));
    return;
  }

  reply.send(success({ files: material.files }));
}
