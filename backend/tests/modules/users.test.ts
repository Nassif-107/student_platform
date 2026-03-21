import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Users Module — /api/users', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/users/me ----

  describe('GET /api/users/me', () => {
    it('returns the authenticated user', async () => {
      const app = await getApp();
      const { accessToken, user } = await registerTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/users/me',
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(user.email);
    });
  });

  // ---- PATCH /api/users/me ----

  describe('PATCH /api/users/me', () => {
    it('updates profile fields', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/users/me',
        headers: authHeader(accessToken),
        payload: {
          bio: 'Студент-программист',
          skills: ['TypeScript', 'React'],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.bio).toBe('Студент-программист');
      expect(body.data.skills).toContain('TypeScript');
    });
  });

  // ---- GET /api/users/:id ----

  describe('GET /api/users/:id', () => {
    it("returns another user's profile", async () => {
      const app = await getApp();
      const { user } = await registerTestUser(app);
      const userId = (user as Record<string, unknown>)._id as string;

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${userId}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(user.email);
    });
  });

  // ---- GET /api/users/search?q=... ----

  describe('GET /api/users/search', () => {
    it('returns matching users', async () => {
      const app = await getApp();
      await registerTestUser(app, {
        firstName: 'Сергей',
        lastName: 'Кузнецов',
        email: 'sergey@university.ru',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/users/search?q=Сергей',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ---- POST /api/users/me/avatar ----

  describe('POST /api/users/me/avatar', () => {
    it('rejects non-image files', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const boundary = '----FormBoundary' + Date.now();
      const payload =
        `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="file"; filename="test.txt"\r\n' +
        'Content-Type: text/plain\r\n' +
        '\r\n' +
        'This is a plain text file\r\n' +
        `--${boundary}--\r\n`;

      const res = await app.inject({
        method: 'POST',
        url: '/api/users/me/avatar',
        headers: {
          ...authHeader(accessToken),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload: Buffer.from(payload),
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });
  });
});
