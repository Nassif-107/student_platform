import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { authenticate } from '../../plugins/auth.plugin.js';
import { validate } from '../../middleware/validate.js';
import { updateProfileSchema } from '@student-platform/shared';
import * as usersController from './users.controller.js';

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // GET /users/me — get own profile (authenticated) — BEFORE /:id
  app.get('/me', { preHandler: [authenticate] }, usersController.getMe as RouteHandlerMethod);

  // PATCH /users/me — update own profile (authenticated) — BEFORE /:id
  app.patch(
    '/me',
    { preHandler: [authenticate, validate({ body: updateProfileSchema })] },
    usersController.updateMe as RouteHandlerMethod
  );

  // POST /users/me/avatar — upload avatar (authenticated) — BEFORE /:id
  app.post('/me/avatar', { preHandler: [authenticate] }, usersController.uploadAvatar as RouteHandlerMethod);

  // GET /users/search — search users by query — BEFORE /:id
  app.get('/search', usersController.searchUsers as RouteHandlerMethod);

  // GET /users/:id — public profile
  app.get('/:id', usersController.getUser as RouteHandlerMethod);

  // PATCH /users/:id — update own profile (authenticated)
  app.patch(
    '/:id',
    {
      preHandler: [authenticate, validate({ body: updateProfileSchema })],
    },
    usersController.updateProfile as RouteHandlerMethod
  );

  // GET /users/:id/activity — user's recent activity
  app.get('/:id/activity', usersController.getUserActivity as RouteHandlerMethod);

  // GET /users/:id/materials — materials uploaded by user
  app.get('/:id/materials', usersController.getUserMaterials as RouteHandlerMethod);
};
