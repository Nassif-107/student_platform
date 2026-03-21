import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

/** Helper: create an event and return its id + creator token. */
async function createTestEvent(app: Awaited<ReturnType<typeof getApp>>, email?: string) {
  const { accessToken } = await registerTestUser(app, {
    email: email ?? `organizer-${Date.now()}@university.ru`,
  });

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  const res = await app.inject({
    method: 'POST',
    url: '/api/events',
    headers: authHeader(accessToken),
    payload: {
      title: 'Хакатон по ИИ',
      type: 'хакатон',
      description: 'Двухдневный хакатон по искусственному интеллекту для студентов всех курсов',
      location: 'Корпус 7, конференц-зал',
      date: futureDate.toISOString(),
      time: '10:00',
      maxParticipants: 100,
      tags: ['ИИ', 'машинное обучение'],
    },
  });

  const eventId = JSON.parse(res.body).data._id as string;
  return { eventId, accessToken };
}

describe('Events Module — /api/events', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/events ----

  describe('GET /api/events', () => {
    it('returns events', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/events',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ---- POST /api/events ----

  describe('POST /api/events', () => {
    it('creates an event', async () => {
      const app = await getApp();
      const { accessToken } = await registerTestUser(app);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const res = await app.inject({
        method: 'POST',
        url: '/api/events',
        headers: authHeader(accessToken),
        payload: {
          title: 'Конференция по веб-разработке',
          type: 'конференция',
          description: 'Конференция посвящённая современным технологиям фронтенд-разработки',
          date: futureDate.toISOString(),
          location: 'Главный корпус, ауд. 301',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Конференция по веб-разработке');
    });
  });

  // ---- POST /api/events/:id/attend ----

  describe('POST /api/events/:id/attend', () => {
    it('toggles attendance', async () => {
      const app = await getApp();
      const { eventId } = await createTestEvent(app, 'event-org@university.ru');

      const { accessToken: attendeeToken } = await registerTestUser(app, {
        email: 'attendee@university.ru',
      });

      // Attend
      const res = await app.inject({
        method: 'POST',
        url: `/api/events/${eventId}/attend`,
        headers: authHeader(attendeeToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });
});
