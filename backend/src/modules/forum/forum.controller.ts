import type { FastifyRequest, FastifyReply } from 'fastify';
import { success, error, paginated } from '../../utils/api-response.js';
import { formatFullName } from '../../utils/format.js';
import { validateFileType } from '../../utils/file-validation.js';
import { saveUploadedFiles, type BufferedFile } from '../../utils/file-upload.js';
import * as forumService from './forum.service.js';
import { UserModel } from '../users/users.model.js';

const FORUM_ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
];

/** Parse multipart fields and files from a request */
async function parseMultipart(request: FastifyRequest) {
  const fields: Record<string, string> = {};
  const files: BufferedFile[] = [];

  const parts = request.parts();
  for await (const part of parts) {
    if (part.type === 'file') {
      const buffer = await part.toBuffer();
      const { valid } = validateFileType(buffer, part.mimetype, FORUM_ALLOWED_MIMES);
      if (valid) {
        files.push({ ...part, _buffer: buffer } as BufferedFile);
      }
    } else {
      fields[part.fieldname] = (part as { value: string }).value;
    }
  }

  return { fields, files };
}

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

  const { questions, total, page: p, limit: l } = result as { questions: unknown[]; total: number; page: number; limit: number };
  return reply.send(paginated(questions, total, p, l));
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

  const r = result as { question: unknown; answers: unknown[]; answersPage: number; answersLimit: number; totalAnswers: number };
  return reply.send(
    success({
      question: r.question,
      answers: r.answers,
      answersPagination: {
        page: r.answersPage,
        limit: r.answersLimit,
        total: r.totalAnswers,
      },
    })
  );
}

// ---------- POST /questions ----------

export async function createQuestion(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { fields, files } = await parseMultipart(request);

  const title = fields.title?.trim();
  const body = fields.body?.trim();
  if (!title || title.length < 5) {
    return reply.code(422).send(error('VALIDATION_ERROR', 'Заголовок должен содержать минимум 5 символов'));
  }
  if (!body || body.length < 10) {
    return reply.code(422).send(error('VALIDATION_ERROR', 'Описание должно содержать минимум 10 символов'));
  }

  const tags = fields.tags ? JSON.parse(fields.tags) : [];
  const attachments = await saveUploadedFiles(files, 'forum');

  const user = request.user;
  const dbUser = await UserModel.findById(user.id).lean();
  const authorName = dbUser ? formatFullName(dbUser.name) : 'Unknown';

  const question = await forumService.createQuestion(
    { title, body, courseId: fields.courseId, courseTitle: fields.courseTitle, tags, attachments },
    { id: user.id, name: authorName, avatar: dbUser?.avatar },
  );

  return reply.code(201).send(success(question));
}

// ---------- POST /questions/:id/answers ----------

export async function createAnswer(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { fields, files } = await parseMultipart(request);

  const body = fields.body?.trim();
  if (!body || body.length < 5) {
    return reply.code(422).send(error('VALIDATION_ERROR', 'Ответ должен содержать минимум 5 символов'));
  }

  const attachments = await saveUploadedFiles(files, 'forum');

  const user = request.user;
  const dbUser = await UserModel.findById(user.id).lean();
  const authorName = dbUser ? formatFullName(dbUser.name) : 'Unknown';

  const answer = await forumService.createAnswer(
    request.params.id,
    body,
    { id: user.id, name: authorName, avatar: dbUser?.avatar },
    attachments,
  );

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
