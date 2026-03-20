import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  getNotifications,
  markAllRead,
  getUnreadCount,
  markOneRead,
  deleteNotification,
} from './notifications.service.js';
import { success, error, paginated } from '../../utils/api-response.js';

interface PaginationQuery {
  page?: number;
  limit?: number;
}

export async function listNotifications(
  request: FastifyRequest<{ Querystring: PaginationQuery }>,
  reply: FastifyReply
) {
  const user = request.user;
  const page = request.query.page ?? 1;
  const limit = Math.min(request.query.limit ?? 20, 50);

  const result = await getNotifications(user.id, page, limit);
  return reply.send(paginated(result.items, result.total, result.page, result.limit));
}

export async function markAllReadHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  await markAllRead(user.id);
  return reply.send(success({ read: true }));
}

export async function getUnreadCountHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  const count = await getUnreadCount(user.id);
  return reply.send(success({ count }));
}

// ---------- PATCH /notifications/:id/read ----------

interface IdParams {
  id: string;
}

export async function markOneReadHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const result = await markOneRead(request.params.id, request.user.id);

  if (result.error === 'NOT_FOUND') {
    return reply.status(404).send(error('NOT_FOUND', 'Уведомление не найдено'));
  }
  if (result.error === 'FORBIDDEN') {
    return reply.status(403).send(error('FORBIDDEN', 'Нет доступа к этому уведомлению'));
  }

  return reply.send(success({ read: true }));
}

// ---------- DELETE /notifications/:id ----------

export async function deleteNotificationHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const result = await deleteNotification(request.params.id, request.user.id);

  if (result.error === 'NOT_FOUND') {
    return reply.status(404).send(error('NOT_FOUND', 'Уведомление не найдено'));
  }
  if (result.error === 'FORBIDDEN') {
    return reply.status(403).send(error('FORBIDDEN', 'Нет доступа к этому уведомлению'));
  }

  return reply.send(success({ deleted: true }));
}
