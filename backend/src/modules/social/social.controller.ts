import type { FastifyRequest, FastifyReply } from 'fastify';
import { success, error } from '../../utils/api-response.js';
import * as socialService from './social.service.js';
import { getOnlineStatuses } from '../../utils/presence.js';

// ---------- GET /social/friends ----------

export async function listFriends(request: FastifyRequest, reply: FastifyReply) {
  const friends = await socialService.getFriends(request.user.id);
  return reply.send(success(friends));
}

// ---------- POST /social/friends/:id ----------

export async function addFriend(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await socialService.addFriend(request.user.id, request.params.id);

  if ('error' in result) {
    const msg = result.error === 'CANNOT_FRIEND_SELF'
      ? 'Нельзя добавить себя в друзья'
      : 'Заявка уже отправлена или вы уже друзья';
    return reply.code(400).send(error(result.error ?? 'ERROR', msg));
  }

  return reply.code(201).send(success({ sent: true }));
}

// ---------- DELETE /social/friends/:id ----------

export async function removeFriend(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  await socialService.removeFriend(request.user.id, request.params.id);
  return reply.send(success({ removed: true }));
}

// ---------- GET /social/suggestions ----------

export async function friendSuggestions(request: FastifyRequest, reply: FastifyReply) {
  const suggestions = await socialService.getSuggestions(request.user.id);
  return reply.send(success(suggestions));
}

// ---------- GET /social/classmates ----------

export async function classmates(request: FastifyRequest, reply: FastifyReply) {
  const classmatesList = await socialService.getClassmates(request.user.id);
  return reply.send(success(classmatesList));
}

// ---------- GET /social/requests ----------

export async function listRequests(request: FastifyRequest, reply: FastifyReply) {
  const requests = await socialService.getPendingRequests(request.user.id);
  return reply.send(success(requests));
}

// ---------- POST /social/requests/:id/accept ----------

export async function acceptFriendRequest(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await socialService.acceptRequest(request.user.id, request.params.id);

  if ('error' in result) {
    return reply.code(404).send(error('REQUEST_NOT_FOUND', 'Заявка в друзья не найдена'));
  }

  return reply.send(success({ accepted: true }));
}

// ---------- POST /social/requests/:id/reject ----------

export async function rejectFriendRequest(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await socialService.rejectRequest(request.user.id, request.params.id);

  if ('error' in result) {
    return reply.code(404).send(error('REQUEST_NOT_FOUND', 'Заявка в друзья не найдена'));
  }

  return reply.send(success({ rejected: true }));
}

// ---------- POST /social/presence ----------

export async function checkPresence(
  request: FastifyRequest<{ Body: { userIds: string[] } }>,
  reply: FastifyReply
) {
  const statuses = await getOnlineStatuses(request.body.userIds);
  return reply.send(success(statuses));
}
