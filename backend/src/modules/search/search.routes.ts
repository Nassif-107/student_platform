import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { searchHandler } from './search.controller.js';

const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      preHandler: [validate({ querystring: searchQuerySchema })],
    },
    searchHandler as RouteHandlerMethod,
  );
};
