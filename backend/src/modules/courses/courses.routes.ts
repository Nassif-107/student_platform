import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { authenticate, authorize } from '../../plugins/auth.plugin.js';
import {
  listCourses,
  getCourseDetail,
  createCourseHandler,
  getCourseStudentsHandler,
  getCoursePrerequisites,
  enrollInCourseHandler,
  getCourseMaterials,
  getCourseReviews,
  getCourseQuestions,
  getCourseDeadlines,
  getCourseRecommendationsHandler,
} from './courses.controller.js';

const courseQuerySchema = z.object({
  universityId: z.string().optional(),
  faculty: z.string().optional(),
  year: z.coerce.number().int().min(1).max(6).optional(),
  semester: z.coerce.number().int().min(1).max(2).optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  university: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().length(24),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  code: z.string().min(1).max(20),
  description: z.string().min(1).max(5000),
  university: z.object({
    id: z.string().length(24).optional(),
    name: z.string().min(1),
  }),
  faculty: z.string().min(1),
  year: z.number().int().min(1).max(6),
  semester: z.number().int().min(1).max(2),
  type: z.enum(['обязательный', 'по выбору', 'факультатив']),
  credits: z.number().int().min(1),
  professor: z.object({
    id: z.string().length(24).optional(),
    name: z.string().min(1),
  }),
  schedule: z
    .array(
      z.object({
        day: z.enum([
          'Понедельник',
          'Вторник',
          'Среда',
          'Четверг',
          'Пятница',
          'Суббота',
        ]),
        time: z.string(),
        room: z.string(),
        type: z.enum(['Лекция', 'Практика', 'Лабораторная']),
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
});

export const coursesRoutes: FastifyPluginAsync = async (app) => {
  // GET /courses — list with filters
  app.get(
    '/',
    { preHandler: [validate({ querystring: courseQuerySchema })] },
    listCourses as RouteHandlerMethod
  );

  // GET /courses/recommendations — personalized course recommendations
  app.get(
    '/recommendations',
    { preHandler: [authenticate] },
    getCourseRecommendationsHandler as RouteHandlerMethod
  );

  // GET /courses/:id — course detail
  app.get(
    '/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    getCourseDetail as RouteHandlerMethod
  );

  // POST /courses — create (moderator+ only)
  app.post(
    '/',
    {
      preHandler: [
        authorize('moderator', 'admin'),
        validate({ body: createCourseSchema }),
      ],
    },
    createCourseHandler as RouteHandlerMethod
  );

  // GET /courses/:id/materials — paginated materials
  app.get(
    '/:id/materials',
    {
      preHandler: [
        validate({ params: idParamSchema, querystring: paginationSchema }),
      ],
    },
    getCourseMaterials as RouteHandlerMethod
  );

  // GET /courses/:id/reviews — paginated reviews
  app.get(
    '/:id/reviews',
    {
      preHandler: [
        validate({ params: idParamSchema, querystring: paginationSchema }),
      ],
    },
    getCourseReviews as RouteHandlerMethod
  );

  // GET /courses/:id/questions — paginated questions
  app.get(
    '/:id/questions',
    {
      preHandler: [
        validate({ params: idParamSchema, querystring: paginationSchema }),
      ],
    },
    getCourseQuestions as RouteHandlerMethod
  );

  // GET /courses/:id/deadlines — upcoming deadlines
  app.get(
    '/:id/deadlines',
    { preHandler: [validate({ params: idParamSchema })] },
    getCourseDeadlines as RouteHandlerMethod
  );

  // GET /courses/:id/students — enrolled students (Neo4j)
  app.get(
    '/:id/students',
    { preHandler: [validate({ params: idParamSchema })] },
    getCourseStudentsHandler as RouteHandlerMethod
  );

  // GET /courses/:id/prerequisites — prerequisite chain (Neo4j)
  app.get(
    '/:id/prerequisites',
    { preHandler: [validate({ params: idParamSchema })] },
    getCoursePrerequisites as RouteHandlerMethod
  );

  // POST /courses/:id/enroll — enroll (authenticated)
  app.post(
    '/:id/enroll',
    {
      preHandler: [authenticate, validate({ params: idParamSchema })],
    },
    enrollInCourseHandler as RouteHandlerMethod
  );
};
