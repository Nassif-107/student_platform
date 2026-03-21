import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Auth Module — /api/auth', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- POST /api/auth/register ----

  describe('POST /api/auth/register', () => {
    it('creates a user and returns tokens', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'newuser@university.ru',
          password: 'securepass123',
          firstName: 'Иван',
          lastName: 'Иванов',
          universityId: 'КубГТУ',
          faculty: 'Институт компьютерных систем',
          specialization: 'Прикладная информатика',
          year: 3,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe('newuser@university.ru');
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      // Password hash must not be exposed
      expect(body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects duplicate email with 409', async () => {
      const app = await getApp();

      // Register first user
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'dup@university.ru',
          password: 'securepass123',
          firstName: 'Мария',
          lastName: 'Петрова',
          universityId: 'КубГТУ',
          faculty: 'Институт компьютерных систем',
          specialization: 'Прикладная информатика',
          year: 2,
        },
      });

      // Attempt duplicate
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'dup@university.ru',
          password: 'anotherpass123',
          firstName: 'Анна',
          lastName: 'Сидорова',
          universityId: 'КубГТУ',
          faculty: 'Институт компьютерных систем',
          specialization: 'Прикладная информатика',
          year: 1,
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('DUPLICATE_EMAIL');
    });
  });

  // ---- POST /api/auth/login ----

  describe('POST /api/auth/login', () => {
    it('returns tokens for valid credentials', async () => {
      const app = await getApp();
      await registerTestUser(app, { email: 'login@university.ru', password: 'mypassword123' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login@university.ru',
          password: 'mypassword123',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.user.email).toBe('login@university.ru');
    });

    it('rejects wrong password with 401', async () => {
      const app = await getApp();
      await registerTestUser(app, { email: 'wrongpw@university.ru', password: 'correct123' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'wrongpw@university.ru',
          password: 'incorrect99',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  // ---- POST /api/auth/refresh ----

  describe('POST /api/auth/refresh', () => {
    it('returns new tokens given a valid refresh token', async () => {
      const app = await getApp();
      const { refreshToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });
  });

  // ---- POST /api/auth/logout ----

  describe('POST /api/auth/logout', () => {
    it('invalidates session', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- GET /api/auth/me ----

  describe('GET /api/auth/me', () => {
    it('returns current user profile', async () => {
      const app = await getApp();
      const { accessToken, user } = await registerTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(user.email);
      expect(body.data.passwordHash).toBeUndefined();
    });
  });
});
