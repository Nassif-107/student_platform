import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../plugins/auth.plugin.js';
import {
  getPersonalAnalyticsHandler,
  getCourseAnalyticsHandler,
  getPlatformAnalyticsHandler,
  getPopularCoursesHandler,
  getUserTimelineHandler,
  getLeaderboardHandler,
} from './analytics.controller.js';

const idParamSchema = z.object({
  id: z.string().length(24),
});

const limitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  // GET /analytics/personal -- personal dashboard (authenticated)
  app.get(
    '/personal',
    { preHandler: [authenticate] },
    getPersonalAnalyticsHandler as RouteHandlerMethod
  );

  // GET /analytics/courses/popular -- course popularity ranking
  app.get(
    '/courses/popular',
    { preHandler: [validate({ query: limitQuerySchema })] },
    getPopularCoursesHandler as RouteHandlerMethod
  );

  // GET /analytics/user/timeline -- user activity timeline (authenticated)
  app.get(
    '/user/timeline',
    { preHandler: [authenticate] },
    getUserTimelineHandler as RouteHandlerMethod
  );

  // GET /analytics/leaderboard -- reputation leaderboard
  app.get(
    '/leaderboard',
    { preHandler: [validate({ query: limitQuerySchema })] },
    getLeaderboardHandler as RouteHandlerMethod
  );

  // GET /analytics/course/:id -- course trends
  app.get(
    '/course/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    getCourseAnalyticsHandler as RouteHandlerMethod
  );

  // GET /analytics/platform -- global platform stats (admin only)
  app.get(
    '/platform',
    { preHandler: [authorize('admin', 'moderator')] },
    getPlatformAnalyticsHandler as RouteHandlerMethod
  );
};
