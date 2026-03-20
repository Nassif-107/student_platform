import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  getCourses,
  getCourseById,
  createCourse,
  enrollInCourse,
  getPrerequisites,
  getRecommendations,
  getEnrolledStudents,
} from './courses.service.js';
import { success, error, paginated } from '../../utils/api-response.js';
import { parsePagination } from '../../utils/pagination.js';
import { MaterialModel } from '../materials/materials.model.js';
import { ReviewModel } from '../reviews/reviews.model.js';
import { QuestionModel } from '../forum/forum.model.js';
import { DeadlineModel } from '../deadlines/deadlines.model.js';

interface CourseQuerystring {
  universityId?: string;
  faculty?: string;
  year?: number;
  semester?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

interface IdParams {
  id: string;
}

interface PaginationQuery {
  page?: number;
  limit?: number;
}

export async function listCourses(
  request: FastifyRequest<{ Querystring: CourseQuerystring }>,
  reply: FastifyReply
) {
  const result = await getCourses(request.query) as { items: unknown[]; total: number; page: number; limit: number };
  return reply.send(paginated(result.items, result.total, result.page, result.limit));
}

export async function getCourseDetail(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const course = await getCourseById(request.params.id);
  if (!course) {
    return reply.status(404).send(error('NOT_FOUND', 'Курс не найден'));
  }
  return reply.send(success(course));
}

export async function createCourseHandler(
  request: FastifyRequest<{ Body: Record<string, unknown> }>,
  reply: FastifyReply
) {
  const user = request.user as { id: string; role: string };

  const course = await createCourse(
    request.body as unknown as Parameters<typeof createCourse>[0],
    user.id
  );
  return reply.status(201).send(success(course));
}

export async function getCourseStudentsHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const students = await getEnrolledStudents(request.params.id);
  return reply.send(success(students));
}

export async function getCoursePrerequisites(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const chain = await getPrerequisites(request.params.id);
  return reply.send(success(chain));
}

export async function enrollInCourseHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const user = request.user as { id: string };

  try {
    const result = await enrollInCourse(user.id, request.params.id);
    return reply.send(success(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка записи на курс';
    return reply.status(400).send(error('ENROLL_FAILED', message));
  }
}

export async function getCourseRecommendationsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as { id: string };
  const recommendations = await getRecommendations(user.id);
  return reply.send(success(recommendations));
}

export async function getCourseMaterials(
  request: FastifyRequest<{ Params: IdParams; Querystring: PaginationQuery }>,
  reply: FastifyReply
) {
  const { page, limit, skip } = parsePagination(request.query as Record<string, unknown>);

  const [items, total] = await Promise.all([
    MaterialModel.find({ 'course.id': request.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MaterialModel.countDocuments({ 'course.id': request.params.id }),
  ]);

  return reply.send(paginated(items, total, page, limit));
}

export async function getCourseReviews(
  request: FastifyRequest<{ Params: IdParams; Querystring: PaginationQuery }>,
  reply: FastifyReply
) {
  const { page, limit, skip } = parsePagination(request.query as Record<string, unknown>);

  const [items, total] = await Promise.all([
    ReviewModel.find({ 'target.type': 'course', 'target.id': request.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReviewModel.countDocuments({ 'target.type': 'course', 'target.id': request.params.id }),
  ]);

  return reply.send(paginated(items, total, page, limit));
}

export async function getCourseQuestions(
  request: FastifyRequest<{ Params: IdParams; Querystring: PaginationQuery }>,
  reply: FastifyReply
) {
  const { page, limit, skip } = parsePagination(request.query as Record<string, unknown>);

  const [items, total] = await Promise.all([
    QuestionModel.find({ 'course.id': request.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    QuestionModel.countDocuments({ 'course.id': request.params.id }),
  ]);

  return reply.send(paginated(items, total, page, limit));
}

export async function getCourseDeadlines(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const items = await DeadlineModel.find({
    'course.id': request.params.id,
    dueDate: { $gte: new Date() },
  })
    .sort({ dueDate: 1 })
    .lean();

  return reply.send(success(items));
}
