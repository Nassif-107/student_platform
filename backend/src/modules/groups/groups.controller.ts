import type { FastifyRequest, FastifyReply } from 'fastify';
import { success, error, paginated } from '../../utils/api-response.js';
import { formatFullName } from '../../utils/format.js';
import * as groupsService from './groups.service.js';
import { UserModel } from '../users/users.model.js';
import { ChatMessageModel } from './chat.model.js';

// ---------- GET /groups ----------

export async function listGroups(
  request: FastifyRequest<{
    Querystring: { courseId?: string; type?: string; status?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
) {
  const { courseId, type, status, page, limit } = request.query;

  const result = await groupsService.getGroups({
    courseId,
    type,
    status,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });

  const { groups, total, page: p, limit: l } = result as { groups: unknown[]; total: number; page: number; limit: number };
  return reply.send(paginated(groups, total, p, l));
}

// ---------- GET /groups/:id ----------

export async function getGroup(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const group = await groupsService.getGroupById(request.params.id);

  if (!group) {
    return reply.code(404).send(error('NOT_FOUND', 'Группа не найдена'));
  }

  return reply.send(success(group));
}

// ---------- POST /groups ----------

export async function createGroup(
  request: FastifyRequest<{
    Body: {
      name: string;
      courseId: string;
      courseTitle: string;
      type: 'study' | 'project' | 'exam_prep';
      description?: string;
      maxMembers?: number;
    };
  }>,
  reply: FastifyReply
) {
  const user = request.user;
  const dbUser = await UserModel.findById(user.id).lean();
  const userName = dbUser ? formatFullName(dbUser.name) : 'Unknown';

  const group = await groupsService.createGroup(request.body, {
    id: user.id,
    name: userName,
  });

  return reply.code(201).send(success(group));
}

// ---------- POST /groups/:id/join ----------

export async function joinGroup(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  const dbUser = await UserModel.findById(user.id).lean();
  const userName = dbUser ? formatFullName(dbUser.name) : 'Unknown';

  const result = await groupsService.joinGroup(request.params.id, {
    id: user.id,
    name: userName,
  });

  if ('error' in result) {
    const statusMap = {
      GROUP_NOT_FOUND: 404,
      GROUP_FULL: 409,
      GROUP_CLOSED: 409,
      ALREADY_MEMBER: 409,
    } as const;
    const msgMap = {
      GROUP_NOT_FOUND: 'Группа не найдена',
      GROUP_FULL: 'Группа заполнена',
      GROUP_CLOSED: 'Группа закрыта',
      ALREADY_MEMBER: 'Вы уже состоите в этой группе',
    } as const;
    return reply
      .code(statusMap[result.error as keyof typeof statusMap] ?? 400)
      .send(error(result.error!, msgMap[result.error as keyof typeof msgMap] ?? result.error!));
  }

  return reply.send(success(result.group));
}

// ---------- DELETE /groups/:id/leave ----------

export async function leaveGroup(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await groupsService.leaveGroup(request.params.id, request.user.id);

  if ('error' in result) {
    const statusMap = { GROUP_NOT_FOUND: 404, NOT_A_MEMBER: 409 } as const;
    const msgMap = {
      GROUP_NOT_FOUND: 'Группа не найдена',
      NOT_A_MEMBER: 'Вы не состоите в этой группе',
    } as const;
    return reply
      .code(statusMap[result.error as keyof typeof statusMap] ?? 400)
      .send(error(result.error!, msgMap[result.error as keyof typeof msgMap] ?? result.error!));
  }

  return reply.send(success({ left: true }));
}

// ---------- PATCH /groups/:id ----------

export async function updateGroupHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { name?: string; description?: string; maxMembers?: number; status?: 'open' | 'closed' };
  }>,
  reply: FastifyReply
) {
  const result = await groupsService.updateGroup(request.params.id, request.user.id, request.body);

  if ('error' in result) {
    const statusMap = { GROUP_NOT_FOUND: 404, NOT_LEADER: 403 } as const;
    const msgMap = {
      GROUP_NOT_FOUND: 'Группа не найдена',
      NOT_LEADER: 'Только лидер группы может её редактировать',
    } as const;
    return reply
      .code(statusMap[result.error as keyof typeof statusMap] ?? 400)
      .send(error(result.error!, msgMap[result.error as keyof typeof msgMap] ?? result.error!));
  }

  return reply.send(success(result.group));
}

// ---------- DELETE /groups/:id ----------

export async function deleteGroupHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await groupsService.deleteGroup(request.params.id, request.user.id, request.user.role);

  if ('error' in result) {
    const statusMap = { GROUP_NOT_FOUND: 404, NOT_LEADER: 403 } as const;
    const msgMap = {
      GROUP_NOT_FOUND: 'Группа не найдена',
      NOT_LEADER: 'Только лидер группы может удалить группу',
    } as const;
    return reply
      .code(statusMap[result.error as keyof typeof statusMap] ?? 400)
      .send(error(result.error!, msgMap[result.error as keyof typeof msgMap] ?? result.error!));
  }

  return reply.send(success({ deleted: true }));
}

// ---------- GET /groups/suggestions ----------

export async function teamSuggestions(
  request: FastifyRequest<{
    Querystring: { courseId: string; skills?: string };
  }>,
  reply: FastifyReply
) {
  const { courseId, skills } = request.query;
  const skillList = skills ? skills.split(',').map((s) => s.trim()) : [];

  const suggestions = await groupsService.getTeamSuggestions(
    request.user.id,
    courseId,
    skillList
  );

  return reply.send(success(suggestions));
}

// ---------- GET /groups/:id/messages ----------

export async function getChatMessages(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: string; before?: string } }>,
  reply: FastifyReply
) {
  const limit = Math.min(Number(request.query.limit) || 50, 100);
  const filter: Record<string, unknown> = { groupId: request.params.id };
  if (request.query.before) {
    filter.createdAt = { $lt: new Date(request.query.before) };
  }

  const messages = await ChatMessageModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Reverse to chronological order and add isMine flag
  const items = messages.reverse().map((m) => ({
    id: m._id.toString(),
    userId: m.userId.toString(),
    userName: m.userName,
    text: m.text,
    timestamp: m.createdAt.toISOString(),
    isMine: m.userId.toString() === request.user.id,
  }));

  return reply.send(success(items));
}
