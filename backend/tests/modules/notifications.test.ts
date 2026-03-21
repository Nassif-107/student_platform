import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Notifications Module — /api/notifications', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/notifications ----

  describe('GET /api/notifications', () => {
    it('returns paginated notifications', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/notifications',
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ---- PATCH /api/notifications/read ----

  describe('PATCH /api/notifications/read', () => {
    it('marks all notifications as read', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/notifications/read',
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- GET /api/notifications/count ----

  describe('GET /api/notifications/count', () => {
    it('returns unread count', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/notifications/count',
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      // Count should be a number (0 for new user)
      expect(typeof body.data.count).toBe('number');
    });
  });
});
