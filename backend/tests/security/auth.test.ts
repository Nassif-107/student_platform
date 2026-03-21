import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Auth & Security', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- Unauthenticated access ----

  it('unauthenticated request to protected route returns 401', async () => {
    const app = await getApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ---- Expired token ----

  it('expired token returns 401', async () => {
    const app = await getApp();

    // Sign a token that expired 1 hour ago
    const expiredToken = jwt.sign(
      { id: '000000000000000000000001', email: 'expired@test.ru', role: 'student' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1h' }
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: authHeader(expiredToken),
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  // ---- Invalid token ----

  it('invalid token returns 401', async () => {
    const app = await getApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: authHeader('not.a.valid.jwt.token'),
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  // ---- Missing token — NO_TOKEN code ----

  it('missing token returns 401 with NO_TOKEN code', async () => {
    const app = await getApp();

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      // No Authorization header
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NO_TOKEN');
  });

  // ---- Invalid token — INVALID_TOKEN code ----

  it('invalid token returns 401 with INVALID_TOKEN code', async () => {
    const app = await getApp();

    // Token signed with wrong secret
    const badToken = jwt.sign(
      { id: '000000000000000000000001', email: 'bad@test.ru', role: 'student' },
      'wrong_secret_that_does_not_match_env'
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: authHeader(badToken),
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  // ---- Role-based access: moderator can create course, student cannot ----

  it('moderator can create course, student cannot (403)', async () => {
    const app = await getApp();
    const { UserModel } = await import('../../src/modules/users/users.model.js');

    // Student: should get 403
    const { accessToken: studentToken } = await registerTestUser(app, {
      email: 'student-rbac@university.ru',
    });

    const coursePayload = {
      title: 'Тестовый курс',
      code: 'TST01',
      description: 'Описание тестового курса для проверки прав доступа',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      year: 1,
      semester: 1,
      type: 'обязательный',
      credits: 3,
      professor: { name: 'Тестов Т.Т.' },
    };

    const studentRes = await app.inject({
      method: 'POST',
      url: '/api/courses',
      headers: authHeader(studentToken),
      payload: coursePayload,
    });

    expect(studentRes.statusCode).toBe(403);

    // Moderator: should succeed
    const { accessToken: modBase, user: modUser } = await registerTestUser(app, {
      email: 'moderator-rbac@university.ru',
    });
    await UserModel.updateOne(
      { _id: (modUser as Record<string, unknown>)._id },
      { $set: { role: 'moderator' } }
    );

    // Re-login to get token with updated role
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'moderator-rbac@university.ru', password: 'testpassword123' },
    });
    const modToken = JSON.parse(loginRes.body).data.accessToken as string;

    const modRes = await app.inject({
      method: 'POST',
      url: '/api/courses',
      headers: authHeader(modToken),
      payload: { ...coursePayload, code: 'TST02' },
    });

    expect(modRes.statusCode).toBe(201);
  });

  // ---- Admin can access platform analytics, student cannot ----

  it('admin can access platform analytics, student cannot (403)', async () => {
    const app = await getApp();
    const { UserModel } = await import('../../src/modules/users/users.model.js');

    // Student: should get 403
    const { accessToken: studentToken } = await registerTestUser(app, {
      email: 'student-analytics@university.ru',
    });

    const studentRes = await app.inject({
      method: 'GET',
      url: '/api/analytics/platform',
      headers: authHeader(studentToken),
    });

    expect(studentRes.statusCode).toBe(403);

    // Admin: should succeed
    const { user: adminUser } = await registerTestUser(app, {
      email: 'admin-analytics@university.ru',
    });
    await UserModel.updateOne(
      { _id: (adminUser as Record<string, unknown>)._id },
      { $set: { role: 'admin' } }
    );

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin-analytics@university.ru', password: 'testpassword123' },
    });
    const adminToken = JSON.parse(loginRes.body).data.accessToken as string;

    const adminRes = await app.inject({
      method: 'GET',
      url: '/api/analytics/platform',
      headers: authHeader(adminToken),
    });

    expect(adminRes.statusCode).toBe(200);
    const body = JSON.parse(adminRes.body);
    expect(body.success).toBe(true);
  });

  // ---- Refresh token rotation (old token invalidated) ----

  it('refresh token rotation works — old token is invalidated', async () => {
    const app = await getApp();
    const { refreshToken: oldRefreshToken } = await registerTestUser(app);

    // Use the refresh token to get new tokens
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: oldRefreshToken },
    });

    expect(refreshRes.statusCode).toBe(200);
    const newTokens = JSON.parse(refreshRes.body).data;
    expect(newTokens.accessToken).toBeDefined();
    expect(newTokens.refreshToken).toBeDefined();
    // New refresh token should be different
    expect(newTokens.refreshToken).not.toBe(oldRefreshToken);

    // Old refresh token should now be invalidated
    const replayRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: oldRefreshToken },
    });

    expect(replayRes.statusCode).toBe(401);
    const replayBody = JSON.parse(replayRes.body);
    expect(replayBody.success).toBe(false);
  });
});
