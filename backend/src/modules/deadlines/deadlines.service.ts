import { DeadlineModel, type DeadlineDocument } from './deadlines.model.js';
import { runCypher } from '../../config/neo4j.js';
import { getRedis } from '../../config/redis.js';
import { trackActivity } from '../../utils/influx-writer.js';
import { getCache, setCache, buildCacheKey, deleteCachePattern } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';
import { ServiceError } from '../../utils/service-error.js';

const CACHE_TTL = 120; // 2 minutes — deadlines change frequently

interface AuthorInfo {
  id: string;
  name: string;
}

// ---------- Get My Deadlines ----------

export async function getMyDeadlines(userId: string) {
  const cacheKey = buildCacheKey('deadline', 'user', userId);
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const coursesResult = await runCypher(
    `MATCH (s:Student {id: $userId})-[:ENROLLED_IN]->(c:Course)
     RETURN c.id AS id`,
    { userId }
  );

  const courseIds = coursesResult.records.map((r) => r.get('id') as string);
  if (courseIds.length === 0) return [];

  const deadlines = await DeadlineModel.find({
    'course.id': { $in: courseIds },
    dueDate: { $gt: new Date() },
  })
    .sort({ dueDate: 1 })
    .lean();

  await setCache(cacheKey, deadlines, CACHE_TTL);
  return deadlines;
}

// ---------- Create Deadline ----------

export async function createDeadline(
  data: {
    courseId: string;
    courseTitle: string;
    courseCode: string;
    title: string;
    type: string;
    description?: string;
    dueDate: string;
  },
  user: AuthorInfo
) {
  const dueDate = new Date(data.dueDate);
  if (dueDate < new Date()) {
    throw new ServiceError('Дата дедлайна не может быть в прошлом', 'BAD_REQUEST');
  }

  const deadline = await DeadlineModel.create({
    course: { id: data.courseId, title: data.courseTitle, code: data.courseCode },
    title: data.title,
    type: data.type,
    description: data.description,
    dueDate,
    createdBy: { id: user.id, name: user.name },
    confirmedBy: [user.id],
  });

  await deleteCachePattern('app:cache:deadline:*');

  notifyEnrolledStudents(data.courseId, deadline._id.toString(), data.title).catch((err) => logger.error(err, '[Deadlines] Failed to notify enrolled students'));

  trackActivity(
    'deadline_activity',
    { action: 'create_deadline', courseCode: data.courseCode },
    { userId: user.id, deadlineId: deadline._id.toString() }
  );

  return deadline.toObject();
}

// ---------- Get Deadline by ID ----------

export async function getDeadlineById(id: string) {
  return DeadlineModel.findById(id).lean();
}

// ---------- Update Deadline ----------

export async function updateDeadline(
  deadlineId: string,
  userId: string,
  data: { title?: string; description?: string; dueDate?: string; type?: string }
) {
  const deadline = await DeadlineModel.findById(deadlineId);
  if (!deadline) return { error: 'DEADLINE_NOT_FOUND' as const };

  if (deadline.createdBy.id.toString() !== userId) {
    return { error: 'NOT_AUTHOR' as const };
  }

  if (data.title !== undefined) deadline.title = data.title;
  if (data.description !== undefined) deadline.description = data.description;
  if (data.dueDate !== undefined) deadline.dueDate = new Date(data.dueDate);
  if (data.type !== undefined) deadline.type = data.type as DeadlineDocument['type'];

  await deadline.save();

  await deleteCachePattern('app:cache:deadline:*');

  return { success: true, deadline: deadline.toObject() };
}

// ---------- Delete Deadline ----------

export async function deleteDeadline(deadlineId: string, userId: string) {
  const deadline = await DeadlineModel.findById(deadlineId).lean();
  if (!deadline) return { error: 'DEADLINE_NOT_FOUND' as const };

  if (deadline.createdBy.id.toString() !== userId) {
    return { error: 'NOT_AUTHOR' as const };
  }

  await DeadlineModel.deleteOne({ _id: deadlineId });

  await deleteCachePattern('app:cache:deadline:*');

  return { success: true };
}

// ---------- Upcoming Deadlines ----------

export async function getUpcomingDeadlines(userId: string, days: number = 7) {
  const coursesResult = await runCypher(
    `MATCH (s:Student {id: $userId})-[:ENROLLED_IN]->(c:Course)
     RETURN c.id AS id`,
    { userId }
  );

  const courseIds = coursesResult.records.map((r) => r.get('id') as string);
  if (courseIds.length === 0) return [];

  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return DeadlineModel.find({
    'course.id': { $in: courseIds },
    dueDate: { $gt: now, $lte: until },
  })
    .sort({ dueDate: 1 })
    .lean();
}

// ---------- Confirm Deadline ----------

export async function confirmDeadline(deadlineId: string, userId: string) {
  const deadline = await DeadlineModel.findById(deadlineId).lean();
  if (!deadline) return { error: 'DEADLINE_NOT_FOUND' as const };

  const alreadyConfirmed = deadline.confirmedBy.some((id) => id.toString() === userId);
  if (alreadyConfirmed) return { error: 'ALREADY_CONFIRMED' as const };

  await DeadlineModel.updateOne(
    { _id: deadlineId },
    {
      $inc: { confirmations: 1 },
      $push: { confirmedBy: userId },
    }
  );

  await deleteCachePattern('app:cache:deadline:*');

  return { success: true, confirmations: deadline.confirmations + 1 };
}

// ---------- Helpers ----------

async function notifyEnrolledStudents(courseId: string, deadlineId: string, title: string) {
  const result = await runCypher(
    `MATCH (s:Student)-[r:ENROLLED_IN]->(c:Course {id: $courseId})
     WHERE r.status = 'active'
     RETURN s.id AS id`,
    { courseId }
  );

  if (result.records.length === 0) return;

  const redis = await getRedis();
  const pipeline = redis.pipeline();

  for (const record of result.records) {
    const studentId = record.get('id') as string;
    pipeline.publish(
      `notifications:${studentId}`,
      JSON.stringify({ type: 'new_deadline', deadlineId, title, courseId })
    );
  }

  await pipeline.exec();
}
