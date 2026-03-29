import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.plugin.js';
import { validate } from '../../middleware/validate.js';
import {
  listQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  voteQuestion,
  createAnswer,
  acceptAnswer,
  voteAnswer,
} from './forum.controller.js';

const createQuestionSchema = z.object({
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(5000),
  courseId: z.string().optional(),
  courseTitle: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
});

const updateQuestionSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  body: z.string().min(10).max(5000).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

const createAnswerSchema = z.object({
  body: z.string().min(5).max(5000),
});

const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

const answerParamSchema = z.object({
  id: z.string().min(1),
  answerId: z.string().min(1),
});

export const forumRoutes: FastifyPluginAsync = async (app) => {
  // GET /questions — list with filters
  app.get('/questions', listQuestions as RouteHandlerMethod);

  // GET /questions/:id — question detail + answers
  app.get(
    '/questions/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    getQuestion as RouteHandlerMethod
  );

  // POST /questions — create question (authenticated, multipart with optional file attachments)
  app.post(
    '/questions',
    { preHandler: [authenticate] },
    createQuestion as RouteHandlerMethod
  );

  // PATCH /questions/:id — update question (authenticated, author only)
  app.patch(
    '/questions/:id',
    {
      preHandler: [
        authenticate,
        validate({ params: idParamSchema, body: updateQuestionSchema }),
      ],
    },
    updateQuestion as RouteHandlerMethod
  );

  // DELETE /questions/:id — delete question (authenticated, author or moderator)
  app.delete(
    '/questions/:id',
    { preHandler: [authenticate, validate({ params: idParamSchema })] },
    deleteQuestion as RouteHandlerMethod
  );

  // POST /questions/:id/vote — vote on question (authenticated)
  app.post(
    '/questions/:id/vote',
    {
      preHandler: [
        authenticate,
        validate({ params: idParamSchema, body: voteSchema }),
      ],
    },
    voteQuestion as RouteHandlerMethod
  );

  // POST /questions/:id/answers — post answer (authenticated, multipart with optional file attachments)
  app.post(
    '/questions/:id/answers',
    { preHandler: [authenticate, validate({ params: idParamSchema })] },
    createAnswer as RouteHandlerMethod
  );

  // PATCH /questions/:id/answers/:answerId/accept — accept answer (authenticated)
  app.patch(
    '/questions/:id/answers/:answerId/accept',
    { preHandler: [authenticate, validate({ params: answerParamSchema })] },
    acceptAnswer as RouteHandlerMethod
  );

  // POST /questions/:id/answers/:answerId/vote — vote (authenticated)
  app.post(
    '/questions/:id/answers/:answerId/vote',
    {
      preHandler: [
        authenticate,
        validate({ params: answerParamSchema, body: voteSchema }),
      ],
    },
    voteAnswer as RouteHandlerMethod
  );
};
