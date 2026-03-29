import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.plugin.js';
import { validate } from '../../middleware/validate.js';
import {
  listGroups,
  getGroup,
  createGroup,
  joinGroup,
  leaveGroup,
  teamSuggestions,
  updateGroupHandler,
  deleteGroupHandler,
  getChatMessages,
} from './groups.controller.js';

const createGroupSchema = z.object({
  name: z.string().min(3).max(100),
  courseId: z.string().min(1),
  courseTitle: z.string().min(1),
  type: z.enum(['study', 'project', 'exam_prep']),
  description: z.string().max(500).optional(),
  maxMembers: z.number().int().min(2).max(10).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  maxMembers: z.number().int().min(2).max(10).optional(),
  status: z.enum(['open', 'closed']).optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

const suggestionsQuerySchema = z.object({
  courseId: z.string().min(1),
  skills: z.string().optional(),
});

export const groupsRoutes: FastifyPluginAsync = async (app) => {
  // GET / — list with filters
  app.get('/', listGroups as RouteHandlerMethod);

  // GET /suggestions — team matching (authenticated) — must be before /:id
  app.get(
    '/suggestions',
    { preHandler: [authenticate, validate({ query: suggestionsQuerySchema })] },
    teamSuggestions as RouteHandlerMethod
  );

  // GET /:id — detail
  app.get(
    '/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    getGroup as RouteHandlerMethod
  );

  // POST / — create (authenticated)
  app.post(
    '/',
    { preHandler: [authenticate, validate({ body: createGroupSchema })] },
    createGroup as RouteHandlerMethod
  );

  // PATCH /:id — update (authenticated)
  app.patch(
    '/:id',
    { preHandler: [authenticate, validate({ params: idParamSchema, body: updateGroupSchema })] },
    updateGroupHandler as RouteHandlerMethod
  );

  // DELETE /:id — delete (authenticated)
  app.delete(
    '/:id',
    { preHandler: [authenticate, validate({ params: idParamSchema })] },
    deleteGroupHandler as RouteHandlerMethod
  );

  // POST /:id/join — join (authenticated)
  app.post(
    '/:id/join',
    { preHandler: [authenticate, validate({ params: idParamSchema })] },
    joinGroup as RouteHandlerMethod
  );

  // DELETE /:id/leave — leave (authenticated)
  app.delete(
    '/:id/leave',
    { preHandler: [authenticate, validate({ params: idParamSchema })] },
    leaveGroup as RouteHandlerMethod
  );

  // GET /:id/messages — chat history (authenticated)
  app.get(
    '/:id/messages',
    { preHandler: [authenticate, validate({ params: idParamSchema })] },
    getChatMessages as RouteHandlerMethod
  );
};
