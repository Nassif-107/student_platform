import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  getEvents,
  createEvent,
  toggleAttendance,
  getAttendingFriends,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventParticipants,
} from './events.service.js';
import { UserModel } from '../users/users.model.js';
import { success, error, paginated } from '../../utils/api-response.js';
import { formatFullName } from '../../utils/format.js';

interface EventsQuerystring {
  universityId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

interface IdParams {
  id: string;
}

interface CreateEventBody {
  title: string;
  type: string;
  description: string;
  university?: { id?: string; name?: string };
  location?: string;
  date: string;
  time?: string;
  maxParticipants?: number;
  tags?: string[];
  coverPhoto?: string;
}

export async function listEvents(
  request: FastifyRequest<{ Querystring: EventsQuerystring }>,
  reply: FastifyReply
) {
  const result = await getEvents(request.query);
  return reply.send(paginated(result.items, result.total, result.page, result.limit));
}

export async function createEventHandler(
  request: FastifyRequest<{ Body: CreateEventBody }>,
  reply: FastifyReply
) {
  const user = request.user;
  const dbUser = await UserModel.findById(user.id).select('name').lean();
  const organizerName = dbUser ? formatFullName(dbUser.name) : user.email;
  const event = await createEvent(request.body, user.id, organizerName);
  return reply.status(201).send(success(event));
}

export async function toggleAttendanceHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const user = request.user;

  try {
    const result = await toggleAttendance(request.params.id, user.id);
    return reply.send(success(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка обработки участия';

    if (message.includes('не найдено')) {
      return reply.status(404).send(error('NOT_FOUND', message));
    }
    if (message.includes('заполнено')) {
      return reply.status(409).send(error('EVENT_FULL', message));
    }
    return reply.status(400).send(error('ATTENDANCE_FAILED', message));
  }
}

export async function getAttendingFriendsHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const user = request.user;
  const friends = await getAttendingFriends(request.params.id, user.id);
  return reply.send(success(friends));
}

// ---------- GET /events/:id ----------

export async function getEventHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  const event = await getEventById(request.params.id);

  if (!event) {
    return reply.status(404).send(error('NOT_FOUND', 'Мероприятие не найдено'));
  }

  return reply.send(success(event));
}

// ---------- PATCH /events/:id ----------

interface UpdateEventBody {
  title?: string;
  description?: string;
  location?: string;
  date?: string;
  time?: string;
  maxParticipants?: number;
  tags?: string[];
  coverPhoto?: string;
}

export async function updateEventHandler(
  request: FastifyRequest<{ Params: IdParams; Body: UpdateEventBody }>,
  reply: FastifyReply
) {
  try {
    const event = await updateEvent(request.params.id, request.user.id, request.body);
    return reply.send(success(event));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка обновления мероприятия';

    if (message.includes('не найдено')) {
      return reply.status(404).send(error('NOT_FOUND', message));
    }
    if (message.includes('организатор')) {
      return reply.status(403).send(error('FORBIDDEN', message));
    }
    return reply.status(400).send(error('UPDATE_FAILED', message));
  }
}

// ---------- DELETE /events/:id ----------

export async function deleteEventHandler(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
) {
  try {
    const isModerator = request.user.role === 'moderator' || request.user.role === 'admin';
    await deleteEvent(request.params.id, request.user.id, isModerator);
    return reply.send(success({ deleted: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка удаления мероприятия';

    if (message.includes('не найдено')) {
      return reply.status(404).send(error('NOT_FOUND', message));
    }
    if (message.includes('Недостаточно прав')) {
      return reply.status(403).send(error('FORBIDDEN', message));
    }
    return reply.status(400).send(error('DELETE_FAILED', message));
  }
}

// ---------- GET /events/:id/participants ----------

interface ParticipantsQuery {
  page?: number;
  limit?: number;
}

export async function getParticipantsHandler(
  request: FastifyRequest<{ Params: IdParams; Querystring: ParticipantsQuery }>,
  reply: FastifyReply
) {
  const page = request.query.page ?? 1;
  const limit = Math.min(request.query.limit ?? 20, 50);

  try {
    const result = await getEventParticipants(request.params.id, page, limit);
    return reply.send(paginated(result.items, result.total, result.page, result.limit));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка получения участников';

    if (message.includes('не найдено')) {
      return reply.status(404).send(error('NOT_FOUND', message));
    }
    return reply.status(400).send(error('PARTICIPANTS_FAILED', message));
  }
}
