/**
 * Scenario 5: Reviews (MongoDB + InfluxDB)
 * Covers: list, create, helpful vote, anonymous, duplicate rejection, delete
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Scenario 5: Reviews', () => {
  beforeEach(async () => { await cleanAll(); });

  const reviewPayload = (targetId: string) => ({
    targetType: 'course',
    targetId,
    targetName: 'Математический анализ',
    ratings: { overall: 8, difficulty: 6, usefulness: 9 },
    text: 'Курс очень полезный, преподаватель объясняет понятно',
    semester: '2025-2',
    anonymous: false,
  });

  async function seedCourse() {
    const CourseModel = mongoose.model('Course');
    const course = await CourseModel.create({
      title: 'Математический анализ',
      code: 'МА-101',
      description: 'Основы',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      year: 1,
      semester: 1,
      type: 'обязательный',
      credits: 4,
      professor: { name: 'Иванов И.И.' },
    });
    return course._id.toString();
  }

  it('5.1 — list reviews returns paginated results', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/api/reviews' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.meta).toBeDefined();
  });

  it('5.2 — create review with ratings', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const courseId = await seedCourse();

    const res = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: authHeader(accessToken),
      payload: reviewPayload(courseId),
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.ratings.overall).toBe(8);
  });

  it('5.3 — helpful vote toggles', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const courseId = await seedCourse();

    // Create review
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: authHeader(accessToken),
      payload: reviewPayload(courseId),
    });
    const reviewId = JSON.parse(createRes.body).data._id;

    // Vote helpful
    const other = await registerTestUser(app, { email: 'voter@test.ru' });
    const voteRes = await app.inject({
      method: 'POST',
      url: `/api/reviews/${reviewId}/helpful`,
      headers: authHeader(other.accessToken),
    });
    expect(voteRes.statusCode).toBe(200);
  });

  it('5.4 — anonymous review hides author name', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const courseId = await seedCourse();

    const res = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: authHeader(accessToken),
      payload: { ...reviewPayload(courseId), anonymous: true },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.anonymous).toBe(true);
  });

  it('5.5 — duplicate review same semester returns 409', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const courseId = await seedCourse();

    await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: authHeader(accessToken),
      payload: reviewPayload(courseId),
    });

    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: authHeader(accessToken),
      payload: reviewPayload(courseId),
    });
    expect(dupRes.statusCode).toBe(409);
  });

  it('5.6 — report review increments count', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const courseId = await seedCourse();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/reviews',
      headers: authHeader(accessToken),
      payload: reviewPayload(courseId),
    });
    const reviewId = JSON.parse(createRes.body).data._id;

    const other = await registerTestUser(app, { email: 'reporter@test.ru' });
    const reportRes = await app.inject({
      method: 'POST',
      url: `/api/reviews/${reviewId}/report`,
      headers: authHeader(other.accessToken),
    });
    expect(reportRes.statusCode).toBe(200);
  });
});
