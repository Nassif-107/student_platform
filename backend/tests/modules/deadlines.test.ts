import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

/** Helper: create a course so deadlines can reference it. */
async function createTestCourse(app: Awaited<ReturnType<typeof getApp>>) {
  const { UserModel } = await import('../../src/modules/users/users.model.js');

  const { accessToken, user } = await registerTestUser(app, {
    email: `mod-dl-${Date.now()}@university.ru`,
  });
  await UserModel.updateOne(
    { _id: (user as Record<string, unknown>)._id },
    { $set: { role: 'moderator' } }
  );

  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: user.email, password: 'testpassword123' },
  });
  const modToken = JSON.parse(loginRes.body).data.accessToken as string;

  const courseRes = await app.inject({
    method: 'POST',
    url: '/api/courses',
    headers: authHeader(modToken),
    payload: {
      title: 'Физика',
      code: 'PH101',
      description: 'Общая физика',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      year: 1,
      semester: 2,
      type: 'обязательный',
      credits: 5,
      professor: { name: 'Физиков Ф.Ф.' },
    },
  });

  const courseId = JSON.parse(courseRes.body).data._id as string;
  return { courseId };
}

describe('Deadlines Module — /api/deadlines', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/deadlines ----

  describe('GET /api/deadlines', () => {
    it("returns user's deadlines", async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/deadlines',
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- POST /api/deadlines ----

  describe('POST /api/deadlines', () => {
    it('creates a deadline with a future date', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'dl-creator@university.ru',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);

      const res = await app.inject({
        method: 'POST',
        url: '/api/deadlines',
        headers: authHeader(accessToken),
        payload: {
          courseId,
          courseTitle: 'Физика',
          courseCode: 'PH101',
          title: 'Лабораторная работа 3',
          type: 'лабораторная',
          description: 'Сдать отчёт по лабораторной',
          dueDate: futureDate.toISOString(),
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Лабораторная работа 3');
    });

    it('rejects past due dates', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'dl-past@university.ru',
      });

      const pastDate = new Date('2020-01-01T00:00:00.000Z');

      const res = await app.inject({
        method: 'POST',
        url: '/api/deadlines',
        headers: authHeader(accessToken),
        payload: {
          courseId,
          courseTitle: 'Физика',
          courseCode: 'PH101',
          title: 'Прошедший дедлайн',
          type: 'экзамен',
          dueDate: pastDate.toISOString(),
        },
      });

      // The server should reject a past date — either 400 or 422
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.statusCode).toBeLessThan(500);
    });
  });

  // ---- POST /api/deadlines/:id/confirm ----

  describe('POST /api/deadlines/:id/confirm', () => {
    it('confirms a deadline', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken: creatorToken } = await registerTestUser(app, {
        email: 'dl-confirmer@university.ru',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/deadlines',
        headers: authHeader(creatorToken),
        payload: {
          courseId,
          courseTitle: 'Физика',
          courseCode: 'PH101',
          title: 'Экзамен по физике',
          type: 'экзамен',
          dueDate: futureDate.toISOString(),
        },
      });

      const deadlineId = JSON.parse(createRes.body).data._id as string;

      // Use a different user to confirm (creator is auto-confirmed on creation)
      const { accessToken: confirmerToken } = await registerTestUser(app, {
        email: 'dl-other-confirmer@university.ru',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/deadlines/${deadlineId}/confirm`,
        headers: authHeader(confirmerToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });
});
