/**
 * Cross-DB integration test: Analytics across InfluxDB + MongoDB + Redis.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

const getCourseModel = () => mongoose.model('Course');
const getUserModel = () => mongoose.model('User');

beforeEach(cleanAll);

describe('Analytics flow — cross-DB', () => {
  it('GET /api/analytics/personal returns data for authenticated user', async () => {
    const app = await getApp();
    const { user, accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/personal',
      headers: authHeader(accessToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    // Should return analytics structure even if empty
    const data = body.data;
    expect(data).toHaveProperty('activityByDay');
    expect(data).toHaveProperty('materialsStats');
  });

  it('GET /api/analytics/leaderboard returns sorted users', async () => {
    const app = await getApp();

    const UserModel = getUserModel();

    // Create users with different reputation scores
    const fakeHash = '$2b$12$fakehashvalue1234567890';
    await UserModel.create([
      {
        email: 'leader1@university.ru',
        passwordHash: fakeHash,
        name: { first: 'Лидер', last: 'Один' },
        university: { name: 'КубГТУ' },
        faculty: 'ИКС',
        specialization: 'ПИ',
        year: 3,
        stats: { reputation: 100 },
      },
      {
        email: 'leader2@university.ru',
        passwordHash: fakeHash,
        name: { first: 'Лидер', last: 'Два' },
        university: { name: 'КубГТУ' },
        faculty: 'ИКС',
        specialization: 'ПИ',
        year: 2,
        stats: { reputation: 50 },
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/leaderboard',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    const leaderboard = body.data.leaderboard ?? body.data;
    expect(Array.isArray(leaderboard)).toBe(true);
    // First entry should have higher or equal reputation than second
    if (leaderboard.length >= 2) {
      expect(leaderboard[0].reputation).toBeGreaterThanOrEqual(
        leaderboard[1].reputation,
      );
    }
  });

  it('GET /api/analytics/courses/popular returns MongoDB aggregation data', async () => {
    const app = await getApp();

    const CourseModel = getCourseModel();

    // Create courses with enrollment data
    await CourseModel.create([
      {
        title: 'Популярный курс',
        code: 'POP101',
        description: 'Описание',
        university: { name: 'КубГТУ' },
        faculty: 'ИКС',
        year: 2,
        semester: 1,
        type: 'обязательный',
        credits: 4,
        professor: { name: 'Проф. Тестов' },
        stats: { enrolledCount: 150 },
      },
      {
        title: 'Менее популярный курс',
        code: 'LESS101',
        description: 'Описание',
        university: { name: 'КубГТУ' },
        faculty: 'ИКС',
        year: 3,
        semester: 2,
        type: 'по выбору',
        credits: 3,
        professor: { name: 'Проф. Другой' },
        stats: { enrolledCount: 30 },
      },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/courses/popular',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    const data = body.data;
    expect(data).toHaveProperty('coursesByEnrollment');
    expect(Array.isArray(data.coursesByEnrollment)).toBe(true);
  });
});
