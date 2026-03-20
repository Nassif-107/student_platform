import type { FastifyRequest, FastifyReply } from 'fastify';
import { success, error } from '../../utils/api-response.js';
import { formatFullName } from '../../utils/format.js';
import * as deadlinesService from './deadlines.service.js';
import { UserModel } from '../users/users.model.js';

// ---------- GET /deadlines ----------

export async function listDeadlines(request: FastifyRequest, reply: FastifyReply) {
  const deadlines = await deadlinesService.getMyDeadlines(request.user.id);
  return reply.send(success(deadlines));
}

// ---------- POST /deadlines ----------

export async function createDeadline(
  request: FastifyRequest<{
    Body: {
      courseId: string;
      courseTitle: string;
      courseCode: string;
      title: string;
      type: string;
      description?: string;
      dueDate: string;
    };
  }>,
  reply: FastifyReply
) {
  const user = request.user;
  const dbUser = await UserModel.findById(user.id).lean();
  const userName = dbUser ? formatFullName(dbUser.name) : 'Unknown';

  const deadline = await deadlinesService.createDeadline(request.body, {
    id: user.id,
    name: userName,
  });

  return reply.code(201).send(success(deadline));
}

// ---------- GET /deadlines/:id ----------

export async function getDeadline(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const deadline = await deadlinesService.getDeadlineById(request.params.id);

  if (!deadline) {
    return reply.code(404).send(error('NOT_FOUND', 'Дедлайн не найден'));
  }

  return reply.send(success(deadline));
}

// ---------- PATCH /deadlines/:id ----------

export async function updateDeadline(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { title?: string; description?: string; dueDate?: string; type?: string };
  }>,
  reply: FastifyReply
) {
  const result = await deadlinesService.updateDeadline(
    request.params.id,
    request.user.id,
    request.body
  );

  if ('error' in result) {
    const statusMap = { DEADLINE_NOT_FOUND: 404, NOT_AUTHOR: 403 } as const;
    const msgMap = {
      DEADLINE_NOT_FOUND: 'Дедлайн не найден',
      NOT_AUTHOR: 'Только автор может редактировать дедлайн',
    } as const;
    return reply
      .code(statusMap[result.error as keyof typeof statusMap] ?? 400)
      .send(error(result.error!, msgMap[result.error as keyof typeof msgMap] ?? result.error!));
  }

  return reply.send(success(result.deadline));
}

// ---------- DELETE /deadlines/:id ----------

export async function deleteDeadlineHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await deadlinesService.deleteDeadline(request.params.id, request.user.id);

  if ('error' in result) {
    const statusMap = { DEADLINE_NOT_FOUND: 404, NOT_AUTHOR: 403 } as const;
    const msgMap = {
      DEADLINE_NOT_FOUND: 'Дедлайн не найден',
      NOT_AUTHOR: 'Только автор может удалить дедлайн',
    } as const;
    return reply
      .code(statusMap[result.error as keyof typeof statusMap] ?? 400)
      .send(error(result.error!, msgMap[result.error as keyof typeof msgMap] ?? result.error!));
  }

  return reply.send(success({ deleted: true }));
}

// ---------- GET /deadlines/upcoming ----------

export async function upcomingDeadlines(
  request: FastifyRequest<{ Querystring: { days?: string } }>,
  reply: FastifyReply
) {
  const days = request.query.days ? Number(request.query.days) : 7;
  const deadlines = await deadlinesService.getUpcomingDeadlines(request.user.id, days);
  return reply.send(success(deadlines));
}

// ---------- POST /deadlines/:id/confirm ----------

export async function confirmDeadline(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await deadlinesService.confirmDeadline(request.params.id, request.user.id);

  if ('error' in result) {
    const statusMap = { DEADLINE_NOT_FOUND: 404, ALREADY_CONFIRMED: 409 } as const;
    const msgMap = {
      DEADLINE_NOT_FOUND: 'Дедлайн не найден',
      ALREADY_CONFIRMED: 'Вы уже подтвердили этот дедлайн',
    } as const;
    return reply
      .code(statusMap[result.error as keyof typeof statusMap] ?? 400)
      .send(error(result.error!, msgMap[result.error as keyof typeof msgMap] ?? result.error!));
  }

  return reply.send(success({ confirmed: true, confirmations: result.confirmations }));
}
