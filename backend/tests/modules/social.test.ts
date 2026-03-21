import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Social Module — /api/social', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/social/friends ----

  describe('GET /api/social/friends', () => {
    it('returns friend list (empty for new user)', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/social/friends',
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- POST /api/social/friends/:id ----

  describe('POST /api/social/friends/:id', () => {
    it('sends a friend request', async () => {
      const app = await getApp();
      const { accessToken: senderToken } = await registerTestUser(app, {
        email: 'sender@university.ru',
      });
      const { user: targetUser } = await registerTestUser(app, {
        email: 'target@university.ru',
      });
      const targetId = (targetUser as Record<string, unknown>)._id as string;

      const res = await app.inject({
        method: 'POST',
        url: `/api/social/friends/${targetId}`,
        headers: authHeader(senderToken),
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- GET /api/social/suggestions ----

  describe('GET /api/social/suggestions', () => {
    it('returns friend recommendations', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'GET',
        url: '/api/social/suggestions',
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });
});
