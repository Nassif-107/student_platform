import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../plugins/auth.plugin.js';
import {
  listNotifications,
  markAllReadHandler,
  getUnreadCountHandler,
  markOneReadHandler,
  deleteNotificationHandler,
} from './notifications.controller.js';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

export const notificationsRoutes: FastifyPluginAsync = async (app) => {
  // All notification routes require authentication
  app.addHook('preHandler', authenticate);

  // GET /notifications -- paginated list
  app.get(
    '/',
    { preHandler: [validate({ query: paginationSchema })] },
    listNotifications as RouteHandlerMethod
  );

  // PATCH /notifications/read -- mark all as read
  app.patch('/read', markAllReadHandler as RouteHandlerMethod);

  // GET /notifications/count -- unread count
  app.get('/count', getUnreadCountHandler as RouteHandlerMethod);

  // PATCH /notifications/:id/read -- mark single notification as read
  app.patch(
    '/:id/read',
    { preHandler: [validate({ params: idParamSchema })] },
    markOneReadHandler as RouteHandlerMethod
  );

  // DELETE /notifications/:id -- delete notification
  app.delete(
    '/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    deleteNotificationHandler as RouteHandlerMethod
  );
};
