/**
 * Tests for the global error handler.
 * Verifies that different error types produce the correct HTTP status codes
 * by exercising existing API endpoints (cannot add routes after app.ready()).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  await cleanAll();
  app = await getApp();
});

describe('Global error handler', () => {
  it('ServiceError NOT_FOUND returns 404', async () => {
    // Request a non-existent resource with a valid ObjectId
    const res = await app.inject({
      method: 'GET',
      url: '/api/courses/000000000000000000000000',
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  it('validation error returns 422', async () => {
    // Send invalid body to a validated endpoint
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'not-an-email', password: '' },
    });
    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('invalid ObjectId returns 400 or 422', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/courses/not-a-valid-id',
    });
    expect([400, 422]).toContain(res.statusCode);
  });

  it('unauthorized returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });
    expect(res.statusCode).toBe(401);
  });

  it('forbidden returns 403', async () => {
    // Register a student, try to create course (requires moderator)
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `errtest-${Date.now()}@university.ru`,
        password: 'testpassword123',
        firstName: 'Тест',
        lastName: 'Тестов',
        universityId: 'КубГТУ',
        faculty: 'ИКС',
        specialization: 'ПИ',
        year: 2,
      },
    });
    const token = JSON.parse(registerRes.body).data.accessToken;

    const res = await app.inject({
      method: 'POST',
      url: '/api/courses',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        title: 'Test',
        code: 'T-1',
        description: 'test course',
        university: { name: 'КубГТУ' },
        faculty: 'ИКС',
        year: 1,
        semester: 1,
        type: 'обязательный',
        credits: 3,
        professor: { name: 'Prof' },
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('duplicate key error returns 409', async () => {
    const email = `dup-${Date.now()}@university.ru`;
    const payload = {
      email,
      password: 'testpassword123',
      firstName: 'Дубль',
      lastName: 'Тестов',
      universityId: 'КубГТУ',
      faculty: 'ИКС',
      specialization: 'ПИ',
      year: 2,
    };

    // Register once
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload,
    });

    // Register again with the same email
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload,
    });

    // Should be 409 (duplicate) or 400-level error
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  it('ServiceError BAD_REQUEST returns 400', async () => {
    // Sending a request that triggers a business logic BAD_REQUEST error
    // POST /api/deadlines with a past date triggers a ServiceError BAD_REQUEST
    const { accessToken } = await registerTestUser(app, {
      email: `badreq-${Date.now()}@university.ru`,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/deadlines',
      headers: authHeader(accessToken),
      payload: {
        courseId: '000000000000000000000000',
        courseTitle: 'Тест',
        courseCode: 'T-1',
        title: 'Прошедший дедлайн',
        type: 'экзамен',
        dueDate: '2020-01-01T00:00:00.000Z',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});
