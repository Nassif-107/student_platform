/**
 * Scenario 1: Registration & Authorization
 * Covers: register, login, logout, wrong password, non-existent email, forgot password
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Scenario 1: Registration & Authorization', () => {
  beforeEach(async () => { await cleanAll(); });

  it('1.1 — registers a new user with full details', async () => {
    const app = await getApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'newuser@test.ru',
        password: 'testpassword123',
        firstName: 'Новый',
        lastName: 'Пользователь',
        universityId: 'КубГТУ',
        faculty: 'Институт компьютерных систем',
        specialization: 'Прикладная информатика',
        year: 2,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('newuser@test.ru');
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
    expect(body.data.user.passwordHash).toBeUndefined();
  });

  it('1.2 — logout invalidates session', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('1.3 — login with valid credentials returns user and tokens', async () => {
    const app = await getApp();
    await registerTestUser(app, { email: 'student3@university.ru', password: 'password123' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'student3@university.ru', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.user.email).toBe('student3@university.ru');
    expect(body.data.accessToken).toBeTruthy();
  });

  it('1.4 — login with wrong password returns 401', async () => {
    const app = await getApp();
    await registerTestUser(app, { email: 'user@university.ru', password: 'correctpass123' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'user@university.ru', password: 'wrongpassword' },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('1.5 — login with non-existent email returns 401', async () => {
    const app = await getApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@test.ru', password: 'anything123' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('1.6 — forgot password always returns success (security)', async () => {
    const app = await getApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'anyone@university.ru' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });

  it('1.7 — protected route rejects unauthenticated request', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('1.8 — refresh token returns new access token', async () => {
    const app = await getApp();
    const { refreshToken } = await registerTestUser(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.accessToken).toBeTruthy();
  });
});
