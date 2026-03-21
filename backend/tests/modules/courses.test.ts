import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

/** Helper to create a course via a moderator account. */
async function createCourseAsModerator(app: Awaited<ReturnType<typeof getApp>>) {
  const { UserModel } = await import(
    '../../src/modules/users/users.model.js'
  );

  // Register and promote to moderator
  const { accessToken, user } = await registerTestUser(app, {
    email: `mod-${Date.now()}@university.ru`,
  });
  await UserModel.updateOne(
    { _id: (user as Record<string, unknown>)._id },
    { $set: { role: 'moderator' } }
  );

  // Re-login to get a token that reflects the new role
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: user.email, password: 'testpassword123' },
  });
  const modToken = JSON.parse(loginRes.body).data.accessToken as string;

  const coursePayload = {
    title: 'Базы данных',
    code: 'BD101',
    description: 'Курс по реляционным и нереляционным базам данных',
    university: { name: 'КубГТУ' },
    faculty: 'Институт компьютерных систем',
    year: 2,
    semester: 1,
    type: 'обязательный',
    credits: 5,
    professor: { name: 'Профессор Иванов' },
  };

  const res = await app.inject({
    method: 'POST',
    url: '/api/courses',
    headers: authHeader(modToken),
    payload: coursePayload,
  });

  return { courseRes: res, modToken };
}

describe('Courses Module — /api/courses', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/courses ----

  describe('GET /api/courses', () => {
    it('returns a paginated list', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/courses',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
      expect(body.meta.page).toBeDefined();
    });

    it('filters by faculty and year', async () => {
      const app = await getApp();
      await createCourseAsModerator(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/courses?faculty=Институт компьютерных систем&year=2',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('text search works', async () => {
      const app = await getApp();
      await createCourseAsModerator(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/courses?search=Базы данных',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- POST /api/courses ----

  describe('POST /api/courses', () => {
    it('requires moderator/admin role', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app); // student role by default

      const res = await app.inject({
        method: 'POST',
        url: '/api/courses',
        headers: authHeader(accessToken),
        payload: {
          title: 'Test',
          code: 'T001',
          description: 'Тестовый курс',
          university: { name: 'КубГТУ' },
          faculty: 'ИКС',
          year: 1,
          semester: 1,
          type: 'обязательный',
          credits: 3,
          professor: { name: 'Тестов' },
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  // ---- GET /api/courses/:id ----

  describe('GET /api/courses/:id', () => {
    it('returns course detail', async () => {
      const app = await getApp();
      const { courseRes } = await createCourseAsModerator(app);
      const courseId = JSON.parse(courseRes.body).data._id as string;

      const res = await app.inject({
        method: 'GET',
        url: `/api/courses/${courseId}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Базы данных');
    });
  });

  // ---- POST /api/courses/:id/enroll ----

  describe('POST /api/courses/:id/enroll', () => {
    it('enrolls an authenticated student', async () => {
      const app = await getApp();
      const { courseRes } = await createCourseAsModerator(app);
      const courseId = JSON.parse(courseRes.body).data._id as string;

      const { accessToken } = await registerTestUser(app, {
        email: 'student-enroll@university.ru',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/courses/${courseId}/enroll`,
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });
});
