import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

/** Helper: create a forum question and return its id + creator token. */
async function createTestQuestion(app: Awaited<ReturnType<typeof getApp>>, email?: string) {
  const { accessToken } = await registerTestUser(app, {
    email: email ?? `forum-${Date.now()}@university.ru`,
  });

  const res = await app.inject({
    method: 'POST',
    url: '/api/forum/questions',
    headers: authHeader(accessToken),
    payload: {
      title: 'Как решить задачу по рекурсии?',
      body: 'Не могу понять как реализовать обход дерева в глубину рекурсивно. Помогите пожалуйста.',
      tags: ['алгоритмы', 'рекурсия'],
    },
  });

  const questionId = JSON.parse(res.body).data._id as string;
  return { questionId, accessToken };
}

describe('Forum Module — /api/forum', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/forum/questions ----

  describe('GET /api/forum/questions', () => {
    it('returns paginated questions', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/forum/questions',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ---- POST /api/forum/questions ----

  describe('POST /api/forum/questions', () => {
    it('creates a question', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/forum/questions',
        headers: authHeader(accessToken),
        payload: {
          title: 'Вопрос о базах данных',
          body: 'В чём разница между SQL и NoSQL базами данных? Какие плюсы и минусы?',
          tags: ['базы данных'],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Вопрос о базах данных');
    });
  });

  // ---- POST /api/forum/questions/:id/answers ----

  describe('POST /api/forum/questions/:id/answers', () => {
    it('adds an answer to a question', async () => {
      const app = await getApp();
      const { questionId } = await createTestQuestion(app, 'asker@university.ru');

      const { accessToken: answererToken } = await registerTestUser(app, {
        email: 'answerer@university.ru',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/forum/questions/${questionId}/answers`,
        headers: authHeader(answererToken),
        payload: {
          body: 'Нужно использовать стек вызовов для обхода в глубину. Вот пример кода...',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- PATCH /api/forum/questions/:id/answers/:answerId/accept ----

  describe('PATCH /api/forum/questions/:id/answers/:answerId/accept', () => {
    it('accepts an answer (question author only)', async () => {
      const app = await getApp();
      const { questionId, accessToken: authorToken } = await createTestQuestion(
        app,
        'q-author@university.ru'
      );

      // Another user answers
      const { accessToken: answererToken } = await registerTestUser(app, {
        email: 'answerer-accept@university.ru',
      });

      const answerRes = await app.inject({
        method: 'POST',
        url: `/api/forum/questions/${questionId}/answers`,
        headers: authHeader(answererToken),
        payload: { body: 'Вот правильное решение с использованием рекурсии.' },
      });

      const answerId = JSON.parse(answerRes.body).data._id as string;

      // Author accepts
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/forum/questions/${questionId}/answers/${answerId}/accept`,
        headers: authHeader(authorToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- POST /api/forum/questions/:id/vote ----

  describe('POST /api/forum/questions/:id/vote', () => {
    it('votes on a question', async () => {
      const app = await getApp();
      const { questionId } = await createTestQuestion(app, 'q-vote@university.ru');

      const { accessToken: voterToken } = await registerTestUser(app, {
        email: 'voter@university.ru',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/forum/questions/${questionId}/vote`,
        headers: authHeader(voterToken),
        payload: { value: 1 },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });
});
