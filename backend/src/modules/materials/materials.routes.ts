import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { authenticate } from '../../plugins/auth.plugin.js';
import { validate } from '../../middleware/validate.js';
import {
  materialQuerySchema,
  materialIdParamSchema,
  addCommentSchema,
} from '@student-platform/shared';
import * as ctrl from './materials.controller.js';

export const materialsRoutes: FastifyPluginAsync = async (app) => {
  // GET /materials - list with filters
  app.get(
    '/',
    { preHandler: [validate({ query: materialQuerySchema })] },
    ctrl.getMaterials as RouteHandlerMethod
  );

  // GET /materials/:id - detail + comments
  app.get(
    '/:id',
    { preHandler: [validate({ params: materialIdParamSchema })] },
    ctrl.getMaterialById as RouteHandlerMethod
  );

  // POST /materials - upload (authenticated, multipart, rate limited: 10/min)
  app.post(
    '/',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      preHandler: [authenticate],
    },
    ctrl.createMaterial as RouteHandlerMethod
  );

  // POST /materials/:id/like - toggle like
  app.post(
    '/:id/like',
    { preHandler: [authenticate, validate({ params: materialIdParamSchema })] },
    ctrl.toggleLike as RouteHandlerMethod
  );

  // POST /materials/:id/comments - add comment
  app.post(
    '/:id/comments',
    {
      preHandler: [
        authenticate,
        validate({ params: materialIdParamSchema, body: addCommentSchema }),
      ],
    },
    ctrl.addComment as RouteHandlerMethod
  );

  // DELETE /materials/:id - delete (author or moderator)
  app.delete(
    '/:id',
    { preHandler: [authenticate, validate({ params: materialIdParamSchema })] },
    ctrl.deleteMaterial as RouteHandlerMethod
  );

  // GET /materials/:id/download - download file
  app.get(
    '/:id/download',
    { preHandler: [validate({ params: materialIdParamSchema })] },
    ctrl.downloadMaterial as RouteHandlerMethod
  );
};
