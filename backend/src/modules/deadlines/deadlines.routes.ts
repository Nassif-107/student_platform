import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.plugin.js';
import { validate } from '../../middleware/validate.js';
import {
  listDeadlines,
  createDeadline,
  confirmDeadline,
  getDeadline,
  updateDeadline,
  deleteDeadlineHandler,
  upcomingDeadlines,
} from './deadlines.controller.js';

const createDeadlineSchema = z.object({
  courseId: z.string().min(1),
  courseTitle: z.string().min(1),
  courseCode: z.string().min(1),
  title: z.string().min(3).max(200),
  type: z.enum([
    'лабораторная',
    'курсовая',
    'экзамен',
    'зачёт',
    'домашнее задание',
    'другое',
  ]),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime(),
});

const updateDeadlineSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  type: z
    .enum([
      'лабораторная',
      'курсовая',
      'экзамен',
      'зачёт',
      'домашнее задание',
      'другое',
    ])
    .optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

export const deadlinesRoutes: FastifyPluginAsync = async (app) => {
  // All deadlines routes require authentication
  app.addHook('preHandler', authenticate);

  // GET / — my upcoming deadlines
  app.get('/', listDeadlines as RouteHandlerMethod);

  // GET /upcoming — upcoming deadlines within N days
  app.get('/upcoming', upcomingDeadlines as RouteHandlerMethod);

  // GET /:id — get deadline by ID
  app.get(
    '/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    getDeadline as RouteHandlerMethod
  );

  // POST / — create deadline
  app.post(
    '/',
    { preHandler: [validate({ body: createDeadlineSchema })] },
    createDeadline as RouteHandlerMethod
  );

  // PATCH /:id — update deadline
  app.patch(
    '/:id',
    { preHandler: [validate({ params: idParamSchema, body: updateDeadlineSchema })] },
    updateDeadline as RouteHandlerMethod
  );

  // DELETE /:id — delete deadline
  app.delete(
    '/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    deleteDeadlineHandler as RouteHandlerMethod
  );

  // POST /:id/confirm — confirm deadline
  app.post(
    '/:id/confirm',
    { preHandler: [validate({ params: idParamSchema })] },
    confirmDeadline as RouteHandlerMethod
  );
};
