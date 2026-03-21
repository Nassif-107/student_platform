import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

/** Helper: create a course to use as a review target. */
async function createTestCourse(app: Awaited<ReturnType<typeof getApp>>) {
  const { UserModel } = await import('../../src/modules/users/users.model.js');

  const { accessToken, user } = await registerTestUser(app, {
    email: `mod-${Date.now()}@university.ru`,
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
      title: 'Математический анализ',
      code: 'MA101',
      description: 'Курс по мат. анализу',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      year: 1,
      semester: 1,
      type: 'обязательный',
      credits: 6,
      professor: { name: 'Профессор Матанов' },
    },
  });

  const courseId = JSON.parse(courseRes.body).data._id as string;
  return { courseId };
}

/** Helper: create a review and return its id. */
async function createReview(
  app: Awaited<ReturnType<typeof getApp>>,
  token: string,
  courseId: string,
  semester: string = '2025-весна'
) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/reviews',
    headers: authHeader(token),
    payload: {
      targetType: 'course',
      targetId: courseId,
      targetName: 'Математический анализ',
      ratings: { overall: 8, difficulty: 7, usefulness: 9 },
      text: 'Хороший курс, много практических задач на занятиях',
      semester,
      anonymous: false,
    },
  });
  return res;
}

describe('Reviews Module — /api/reviews', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/reviews ----

  describe('GET /api/reviews', () => {
    it('returns a paginated list', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/reviews',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ---- POST /api/reviews ----

  describe('POST /api/reviews', () => {
    it('creates a review with ratings', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'reviewer@university.ru',
      });

      const res = await createReview(app, accessToken, courseId);

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.ratings.overall).toBe(8);
    });

    it('rejects duplicate review for same semester with 409', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'dup-reviewer@university.ru',
      });

      // First review
      await createReview(app, accessToken, courseId, '2025-весна');

      // Duplicate review for same target and semester
      const res = await createReview(app, accessToken, courseId, '2025-весна');

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('DUPLICATE');
    });
  });

  // ---- POST /api/reviews/:id/helpful ----

  describe('POST /api/reviews/:id/helpful', () => {
    it('toggles helpful vote', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'helpful-voter@university.ru',
      });

      const createRes = await createReview(app, accessToken, courseId);
      const reviewId = JSON.parse(createRes.body).data._id as string;

      const { accessToken: voterToken } = await registerTestUser(app, {
        email: 'voter@university.ru',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/reviews/${reviewId}/helpful`,
        headers: authHeader(voterToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- POST /api/reviews/:id/report ----

  describe('POST /api/reviews/:id/report', () => {
    it('increments report count', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'report-target@university.ru',
      });

      const createRes = await createReview(app, accessToken, courseId);
      const reviewId = JSON.parse(createRes.body).data._id as string;

      const { accessToken: reporterToken } = await registerTestUser(app, {
        email: 'reporter@university.ru',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/reviews/${reviewId}/report`,
        headers: authHeader(reporterToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });
});
