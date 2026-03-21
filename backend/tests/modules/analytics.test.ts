import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Analytics Module — /api/analytics', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/analytics/personal ----

  describe('GET /api/analytics/personal', () => {
    it('returns personal stats for authenticated user', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/analytics/personal',
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });
  });

  // ---- GET /api/analytics/leaderboard ----

  describe('GET /api/analytics/leaderboard', () => {
    it('returns reputation ranking', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/analytics/leaderboard',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});
