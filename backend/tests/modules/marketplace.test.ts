import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

/** Helper: create a listing and return its id + creator token. */
async function createTestListing(app: Awaited<ReturnType<typeof getApp>>, email?: string) {
  const { accessToken } = await registerTestUser(app, {
    email: email ?? `seller-${Date.now()}@university.ru`,
  });

  const res = await app.inject({
    method: 'POST',
    url: '/api/marketplace',
    headers: authHeader(accessToken),
    payload: {
      title: 'Учебник по высшей математике',
      type: 'sell',
      price: 500,
      condition: 'хорошее',
      description: 'Учебник в отличном состоянии, немного помятая обложка',
      location: 'Корпус 1, ауд. 205',
    },
  });

  const listingId = JSON.parse(res.body).data._id as string;
  return { listingId, accessToken };
}

describe('Marketplace Module — /api/marketplace', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/marketplace ----

  describe('GET /api/marketplace', () => {
    it('returns listings', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/marketplace',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ---- POST /api/marketplace ----

  describe('POST /api/marketplace', () => {
    it('creates a listing', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: '/api/marketplace',
        headers: authHeader(accessToken),
        payload: {
          title: 'Калькулятор Casio',
          type: 'sell',
          price: 1200,
          condition: 'отличное',
          description: 'Инженерный калькулятор, как новый',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Калькулятор Casio');
    });
  });

  // ---- PATCH /api/marketplace/:id ----

  describe('PATCH /api/marketplace/:id', () => {
    it('updates listing status', async () => {
      const app = await getApp();
      const { listingId, accessToken } = await createTestListing(app, 'patcher@university.ru');

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/marketplace/${listingId}`,
        headers: authHeader(accessToken),
        payload: { status: 'reserved' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- DELETE /api/marketplace/:id ----

  describe('DELETE /api/marketplace/:id', () => {
    it('author can delete own listing', async () => {
      const app = await getApp();
      const { listingId, accessToken } = await createTestListing(app, 'deleter@university.ru');

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/marketplace/${listingId}`,
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });
});
