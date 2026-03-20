import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import {
  listProfessors,
  getProfessorDetail,
  getProfessorReviews,
  getProfessorCoursesHandler,
} from './professors.controller.js';

const professorQuerySchema = z.object({
  universityId: z.string().optional(),
  faculty: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const idParamSchema = z.object({
  id: z.string().length(24),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const professorsRoutes: FastifyPluginAsync = async (app) => {
  // GET /professors — list with filters
  app.get(
    '/',
    { preHandler: [validate({ querystring: professorQuerySchema })] },
    listProfessors as RouteHandlerMethod
  );

  // GET /professors/:id — professor detail
  app.get(
    '/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    getProfessorDetail as RouteHandlerMethod
  );

  // GET /professors/:id/reviews — professor reviews
  app.get(
    '/:id/reviews',
    {
      preHandler: [
        validate({ params: idParamSchema, querystring: paginationSchema }),
      ],
    },
    getProfessorReviews as RouteHandlerMethod
  );

  // GET /professors/:id/courses — courses they teach (Neo4j)
  app.get(
    '/:id/courses',
    { preHandler: [validate({ params: idParamSchema })] },
    getProfessorCoursesHandler as RouteHandlerMethod
  );
};
