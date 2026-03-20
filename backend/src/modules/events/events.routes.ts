import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../plugins/auth.plugin.js';
import {
  listEvents,
  createEventHandler,
  toggleAttendanceHandler,
  getAttendingFriendsHandler,
  getEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getParticipantsHandler,
} from './events.controller.js';

const eventsQuerySchema = z.object({
  universityId: z.string().length(24).optional(),
  type: z
    .enum(['хакатон', 'конференция', 'спорт', 'концерт', 'мастер-класс', 'другое'])
    .optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const idParamSchema = z.object({
  id: z.string().length(24),
});

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['хакатон', 'конференция', 'спорт', 'концерт', 'мастер-класс', 'другое']),
  description: z.string().min(1).max(5000),
  university: z
    .object({
      id: z.string().length(24).optional(),
      name: z.string().optional(),
    })
    .optional(),
  location: z.string().max(300).optional(),
  date: z.string().datetime({ offset: true }),
  time: z.string().max(20).optional(),
  maxParticipants: z.number().int().min(1).optional(),
  tags: z.array(z.string()).max(10).optional(),
  coverPhoto: z.string().url().optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  location: z.string().max(300).optional(),
  date: z.string().datetime({ offset: true }).optional(),
  time: z.string().max(20).optional(),
  maxParticipants: z.number().int().min(1).optional(),
  tags: z.array(z.string()).max(10).optional(),
  coverPhoto: z.string().url().optional(),
});

const participantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const eventsRoutes: FastifyPluginAsync = async (app) => {
  // GET /events -- list with filters
  app.get(
    '/',
    { preHandler: [validate({ query: eventsQuerySchema })] },
    listEvents as RouteHandlerMethod
  );

  // POST /events -- create event (authenticated)
  app.post(
    '/',
    {
      preHandler: [
        authenticate,
        validate({ body: createEventSchema }),
      ],
    },
    createEventHandler as RouteHandlerMethod
  );

  // GET /events/:id -- get event detail
  app.get(
    '/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    getEventHandler as RouteHandlerMethod
  );

  // PATCH /events/:id -- update event (authenticated, organizer only)
  app.patch(
    '/:id',
    {
      preHandler: [
        authenticate,
        validate({ params: idParamSchema, body: updateEventSchema }),
      ],
    },
    updateEventHandler as RouteHandlerMethod
  );

  // DELETE /events/:id -- delete event (authenticated, organizer or moderator)
  app.delete(
    '/:id',
    {
      preHandler: [authenticate, validate({ params: idParamSchema })],
    },
    deleteEventHandler as RouteHandlerMethod
  );

  // POST /events/:id/attend -- toggle attendance (authenticated)
  app.post(
    '/:id/attend',
    {
      preHandler: [authenticate, validate({ params: idParamSchema })],
    },
    toggleAttendanceHandler as RouteHandlerMethod
  );

  // GET /events/:id/friends -- attending friends (authenticated, Neo4j)
  app.get(
    '/:id/friends',
    {
      preHandler: [authenticate, validate({ params: idParamSchema })],
    },
    getAttendingFriendsHandler as RouteHandlerMethod
  );

  // GET /events/:id/participants -- list event participants
  app.get(
    '/:id/participants',
    {
      preHandler: [validate({ params: idParamSchema, query: participantsQuerySchema })],
    },
    getParticipantsHandler as RouteHandlerMethod
  );
};
