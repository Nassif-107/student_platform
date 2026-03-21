import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../plugins/auth.plugin.js';
import {
  listListings,
  createListingHandler,
  updateListingStatusHandler,
  getListingHandler,
  deleteListingHandler,
  toggleListingHandler,
  contactSellerHandler,
} from './marketplace.controller.js';

const listingsQuerySchema = z.object({
  type: z.enum(['sell', 'buy', 'exchange', 'free']).optional(),
  courseId: z.string().length(24).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  status: z.enum(['active', 'reserved', 'sold', 'closed']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const idParamSchema = z.object({
  id: z.string().length(24),
});

const createListingSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['sell', 'buy', 'exchange', 'free']),
  price: z.number().min(0).optional(),
  condition: z.enum(['отличное', 'хорошее', 'нормальное', 'потрёпанное']).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
  description: z.string().max(1000).optional(),
  course: z
    .object({
      id: z.string().length(24).optional(),
      title: z.string().optional(),
    })
    .optional(),
  location: z.string().max(200).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'reserved', 'sold', 'closed']),
});

export const marketplaceRoutes: FastifyPluginAsync = async (app) => {
  // GET /marketplace -- list with filters
  app.get(
    '/',
    { preHandler: [validate({ query: listingsQuerySchema })] },
    listListings as RouteHandlerMethod
  );

  // POST /marketplace -- create listing (authenticated)
  app.post(
    '/',
    {
      preHandler: [
        authenticate,
        validate({ body: createListingSchema }),
      ],
    },
    createListingHandler as RouteHandlerMethod
  );

  // GET /marketplace/:id -- get listing detail
  app.get(
    '/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    getListingHandler as RouteHandlerMethod
  );

  // PATCH /marketplace/:id -- update status (authenticated, seller only)
  app.patch(
    '/:id',
    {
      preHandler: [
        authenticate,
        validate({ params: idParamSchema, body: updateStatusSchema }),
      ],
    },
    updateListingStatusHandler as RouteHandlerMethod
  );

  // DELETE /marketplace/:id -- delete listing (authenticated, author only)
  app.delete(
    '/:id',
    {
      preHandler: [authenticate, validate({ params: idParamSchema })],
    },
    deleteListingHandler as RouteHandlerMethod
  );

  // POST /marketplace/:id/toggle -- toggle active/closed status
  app.post(
    '/:id/toggle',
    {
      preHandler: [authenticate, validate({ params: idParamSchema })],
    },
    toggleListingHandler as RouteHandlerMethod
  );

  // POST /marketplace/:id/contact -- contact seller
  app.post(
    '/:id/contact',
    {
      preHandler: [authenticate, validate({ params: idParamSchema })],
    },
    contactSellerHandler as RouteHandlerMethod
  );
};
