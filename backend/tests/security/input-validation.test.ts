import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Input Validation & Sanitization', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- Invalid email on register ----

  it('invalid email on register returns 422', async () => {
    const app = await getApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'not-an-email',
        password: 'securepass123',
        firstName: 'Тест',
        lastName: 'Тестов',
        universityId: 'КубГТУ',
        faculty: 'ИКС',
        specialization: 'Прикладная информатика',
        year: 2,
      },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ---- Password too short ----

  it('password too short returns 422', async () => {
    const app = await getApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'short-pw@university.ru',
        password: 'abc',
        firstName: 'Тест',
        lastName: 'Тестов',
        universityId: 'КубГТУ',
        faculty: 'ИКС',
        specialization: 'Прикладная информатика',
        year: 2,
      },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // ---- Missing required fields ----

  it('missing required fields return 422', async () => {
    const app = await getApp();

    // Missing firstName, lastName, universityId, faculty, specialization, year
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'missing@university.ru',
        password: 'securepass123',
      },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    // Should contain details about which fields are missing
    expect(body.error.details).toBeDefined();
    expect(Array.isArray(body.error.details)).toBe(true);
    expect(body.error.details.length).toBeGreaterThan(0);
  });

  // ---- XSS in text fields ----

  it('XSS in text fields is handled (stored without executing)', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const xssPayload = '<script>alert("xss")</script>';

    // Try to set bio with XSS content
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      headers: authHeader(accessToken),
      payload: {
        bio: xssPayload,
      },
    });

    // The API should either sanitize or store as-is (no execution context in API).
    // The key is that it does not crash or return 500.
    expect(res.statusCode).toBeLessThan(500);

    if (res.statusCode === 200) {
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      // Bio should be stored (sanitization happens on frontend display)
      // or stripped of script tags
      expect(body.data.bio).toBeDefined();
    }
  });

  // ---- Invalid ObjectId in params ----

  it('invalid ObjectId in params returns 400 or 422', async () => {
    const app = await getApp();

    // courses/:id expects a 24-char hex string
    const res = await app.inject({
      method: 'GET',
      url: '/api/courses/not-a-valid-id',
    });

    // Should be 400 or 422 (validation error), not 500
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});
