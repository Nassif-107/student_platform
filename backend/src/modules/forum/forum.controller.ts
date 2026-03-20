import type { FastifyRequest, FastifyReply } from 'fastify';
import { success, error, paginated } from '../../utils/api-response.js';
import { formatFullName } from '../../utils/format.js';
import * as forumService from './forum.service.js';
import { UserModel } from '../users/users.model.js';

// ---------- GET /questions ----------

export async function listQuestions(
  request: FastifyRequest<{
    Querystring: {
      courseId?: string;
      tags?: string;
      status?: string;
      search?: string;
      sort?: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  const { courseId, tags, status, search, sort, page, limit } = request.query;

  const parsedTags = tags
    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
    : undefined;
  const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const result = await forumService.getQuestions({
    courseId,
    tags: parsedTags,
    status,
    search,
    sort,
    page: Math.max(Number(page) || 1, 1),
    limit: parsedLimit,
  });

  return reply.send(paginated(result.questions, result.total, result.page, result.limit));
}

// ---------- GET /questions/:id ----------

export async function getQuestion(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { answersPage?: string; answersLimit?: string };
  }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const answersPage = request.query.answersPage ? Number(request.query.answersPage) : 1;
  const answersLimit = request.query.answersLimit ? Number(request.query.answersLimit) : 20;

  const result = await forumService.getQuestionById(id, answersPage, answersLimit);
  if (!result) {
    return reply.code(404).send(error('NOT_FOUND', 'Вопрос не найден'));
  }

  return reply.send(
    success({
      question: result.question,
      answers: result.answers,
      answersPagination: {
        page: result.answersPage,
        limit: result.answersLimit,
        total: result.totalAnswers,
      },
    })
  );
}

// ---------- POST /questions ----------

export async function createQuestion(
  request: FastifyRequest<{
    Body: {
      title: string;
      body: string;
      courseId?: string;
      courseTitle?: string;
      tags?: string[];
    };
  }>,
  reply: FastifyReply
) {
  const user = request.user;
  const dbUser = await UserModel.findById(user.id).lean();
  const authorName = dbUser ? formatFullName(dbUser.name) : 'Unknown';

  const question = await forumService.createQuestion(request.body, {
    id: user.id,
    name: authorName,
    avatar: dbUser?.avatar,
  });

  return reply.code(201).send(success(question));
}

// ---------- POST /questions/:id/answers ----------

export async function createAnswer(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { body: string };
  }>,
  reply: FastifyReply
) {
  const user = request.user;
  const dbUser = await UserModel.findById(user.id).lean();
  const authorName = dbUser ? formatFullName(dbUser.name) : 'Unknown';

  const answer = await forumService.createAnswer(request.params.id, request.body.body, {
    id: user.id,
    name: authorName,
    avatar: dbUser?.avatar,
  });

  if (!answer) {
    return reply.code(404).send(error('NOT_FOUND', 'Вопрос не найден'));
  }

  return reply.code(201).send(success(answer));
}

// ---------- PATCH /questions/:id/answers/:answerId/accept ----------

export async function acceptAnswer(
  request: FastifyRequest<{ Params: { id: string; answerId: string } }>,
  reply: FastifyReply
) {
  const result = await forumService.acceptAnswer(
    request.params.id,
    request.params.answerId,
    request.user.id
  );

  if ('error' in result) {
    const statusMap = { QUESTION_NOT_FOUND: 404, ANSWER_NOT_FOUND: 404, FORBIDDEN: 403 } as const;
    const code = statusMap[result.error as keyof typeof statusMap] ?? 400;
    const msgMap = {
      QUESTION_NOT_FOUND: 'Вопрос не найден',
      ANSWER_NOT_FOUND: 'Ответ не найден',
      FORBIDDEN: 'Только автор вопроса может принять ответ',
    } as const;
    return reply.code(code).send(error(result.error!, msgMap[result.error as keyof typeof msgMap] ?? result.error!));
  }

  return reply.send(success({ accepted: true }));
}

// ---------- PATCH /questions/:id ----------

export async function updateQuestion(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { title?: string; body?: string; tags?: string[] };
  }>,
  reply: FastifyReply
) {
  const result = await forumService.updateQuestion(
    request.params.id,
    request.user.id,
    request.body
  );

  if ('error' in result) {
    const statusMap = { QUESTION_NOT_FOUND: 404, FORBIDDEN: 403 } as const;
    const msgMap = {
      QUESTION_NOT_FOUND: 'Вопрос не найден',
      FORBIDDEN: 'Только автор может редактировать вопрос',
    } as const;
    return reply.code(statusMap[result.error as keyof typeof statusMap] ?? 400).send(error(result.error!, msgMap[result.error as keyof typeof msgMap] ?? result.error!));
  }

  return reply.send(success(result.question));
}

// ---------- DELETE /questions/:id ----------

export async function deleteQuestion(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const result = await forumService.deleteQuestion(
    request.params.id,
    request.user.id,
    request.user.role
  );

  if ('error' in result) {
    const statusMap = { QUESTION_NOT_FOUND: 404, FORBIDDEN: 403 } as const;
    const msgMap = {
      QUESTION_NOT_FOUND: 'Вопрос не найден',
      FORBIDDEN: 'Удалить вопрос может только автор или модератор',
    } as const;
    return reply.code(statusMap[result.error as keyof typeof statusMap] ?? 400).send(error(result.error!, msgMap[result.error as keyof typeof msgMap] ?? result.error!));
  }

  return reply.send(success({ deleted: true }));
}

// ---------- POST /questions/:id/vote ----------

export async function voteQuestion(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { value: 1 | -1 };
  }>,
  reply: FastifyReply
) {
  const result = await forumService.voteQuestion(
    request.params.id,
    request.user.id,
    request.body.value
  );

  if (!result) {
    return reply.code(404).send(error('NOT_FOUND', 'Вопрос не найден'));
  }

  return reply.send(success(result));
}

// ---------- POST /questions/:id/answers/:answerId/vote ----------

export async function voteAnswer(
  request: FastifyRequest<{
    Params: { id: string; answerId: string };
    Body: { value: 1 | -1 };
  }>,
  reply: FastifyReply
) {
  const result = await forumService.voteAnswer(
    request.params.answerId,
    request.user.id,
    request.body.value
  );

  if (!result) {
    return reply.code(404).send(error('NOT_FOUND', 'Ответ не найден'));
  }

  return reply.send(success(result));
}
