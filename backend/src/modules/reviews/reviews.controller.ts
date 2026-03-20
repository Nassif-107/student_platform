import type { FastifyRequest, FastifyReply } from 'fastify';
import { success, error, paginated } from '../../utils/api-response.js';
import { formatFullName } from '../../utils/format.js';
import * as reviewsService from './reviews.service.js';
import { UserModel } from '../users/users.model.js';
import type { CreateReviewInput, ReviewQueryInput } from '@student-platform/shared';

export async function getReviews(
  request: FastifyRequest<{ Querystring: ReviewQueryInput }>,
  reply: FastifyReply
): Promise<void> {
  const result = await reviewsService.getReviews(request.query);
  reply.send(paginated(result.reviews, result.total, result.page, result.limit));
}

export async function createReview(
  request: FastifyRequest<{ Body: CreateReviewInput }>,
  reply: FastifyReply
): Promise<void> {
  const user = await UserModel.findById(request.user.id).lean();
  if (!user) {
    reply.code(401).send(error('UNAUTHORIZED', 'Пользователь не найден'));
    return;
  }

  const authorName = formatFullName(user.name);

  try {
    const review = await reviewsService.createReview(request.body, {
      ...request.user,
      name: authorName,
    });
    reply.code(201).send(success(review));
  } catch (err) {
    if ((err as Error).message === 'DUPLICATE_REVIEW') {
      reply.code(409).send(
        error('DUPLICATE_REVIEW', 'Вы уже оставили отзыв для этого предмета в данном семестре')
      );
      return;
    }
    throw err;
  }
}

export async function toggleHelpful(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const result = await reviewsService.toggleHelpful(request.params.id, request.user.id);
    reply.send(success(result));
  } catch (err) {
    if ((err as Error).message === 'NOT_FOUND') {
      reply.code(404).send(error('NOT_FOUND', 'Отзыв не найден'));
      return;
    }
    throw err;
  }
}

export async function reportReview(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const result = await reviewsService.reportReview(request.params.id, request.user.id);
    reply.send(success(result));
  } catch (err) {
    if ((err as Error).message === 'NOT_FOUND') {
      reply.code(404).send(error('NOT_FOUND', 'Отзыв не найден'));
      return;
    }
    throw err;
  }
}

export async function getReview(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const review = await reviewsService.getReviewById(request.params.id);
  if (!review) {
    reply.code(404).send(error('NOT_FOUND', 'Отзыв не найден'));
    return;
  }
  reply.send(success(review));
}

export async function deleteReview(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const result = await reviewsService.deleteReview(
      request.params.id,
      request.user.id,
      request.user.role
    );
    reply.send(success(result));
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'NOT_FOUND') {
      reply.code(404).send(error('NOT_FOUND', 'Отзыв не найден'));
      return;
    }
    if (message === 'FORBIDDEN') {
      reply.code(403).send(error('FORBIDDEN', 'Удалить отзыв может только автор или модератор'));
      return;
    }
    throw err;
  }
}
