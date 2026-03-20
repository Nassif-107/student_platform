import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  getProfessors,
  getProfessorById,
  getProfessorCourses,
} from './professors.service.js';
import { success, error, paginated } from '../../utils/api-response.js';
import { ReviewModel } from '../reviews/reviews.model.js';

interface ProfessorQuerystring {
  universityId?: string;
  faculty?: string;
  search?: string;
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

export async function listProfessors(
  request: FastifyRequest<{ Querystring: ProfessorQuerystring }>,
  reply: FastifyReply
) {
  const result = await getProfessors(request.query);
  return reply.send(paginated(result.items, result.total, result.page, result.limit));
}

export async function getProfessorDetail(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const professor = await getProfessorById(request.params.id);
  if (!professor) {
    return reply.status(404).send(error('NOT_FOUND', 'Преподаватель не найден'));
  }
  return reply.send(success(professor));
}

export async function getProfessorReviews(
  request: FastifyRequest<{ Params: IdParams; Querystring: PaginationQuery }>,
  reply: FastifyReply
) {
  const page = request.query.page ?? 1;
  const limit = Math.min(request.query.limit ?? 20, 50);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    ReviewModel.find({ targetType: 'professor', targetId: request.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReviewModel.countDocuments({
      targetType: 'professor',
      targetId: request.params.id,
    }),
  ]);

  return reply.send(paginated(items, total, page, limit));
}

export async function getProfessorCoursesHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const courses = await getProfessorCourses(request.params.id);
  return reply.send(success(courses));
}
