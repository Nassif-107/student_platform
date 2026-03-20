import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { authenticate } from '../../plugins/auth.plugin.js';
import { validate } from '../../middleware/validate.js';
import {
  reviewQuerySchema,
  createReviewSchema,
  reviewIdParamSchema,
} from '@student-platform/shared';
import * as ctrl from './reviews.controller.js';

export const reviewsRoutes: FastifyPluginAsync = async (app) => {
  // GET /reviews - list by target
  app.get(
    '/',
    { preHandler: [validate({ query: reviewQuerySchema })] },
    ctrl.getReviews as RouteHandlerMethod
  );

  // POST /reviews - create review
  app.post(
    '/',
    {
      preHandler: [
        authenticate,
        validate({ body: createReviewSchema }),
      ],
    },
    ctrl.createReview as RouteHandlerMethod
  );

  // GET /reviews/:id - get review detail
  app.get(
    '/:id',
    { preHandler: [validate({ params: reviewIdParamSchema })] },
    ctrl.getReview as RouteHandlerMethod
  );

  // DELETE /reviews/:id - delete review (author or moderator)
  app.delete(
    '/:id',
    { preHandler: [authenticate, validate({ params: reviewIdParamSchema })] },
    ctrl.deleteReview as RouteHandlerMethod
  );

  // POST /reviews/:id/helpful - toggle helpful vote
  app.post(
    '/:id/helpful',
    { preHandler: [authenticate, validate({ params: reviewIdParamSchema })] },
    ctrl.toggleHelpful as RouteHandlerMethod
  );

  // POST /reviews/:id/report - report abuse
  app.post(
    '/:id/report',
    { preHandler: [authenticate, validate({ params: reviewIdParamSchema })] },
    ctrl.reportReview as RouteHandlerMethod
  );
};
