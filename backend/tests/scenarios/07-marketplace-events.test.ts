/**
 * Scenario 9: Marketplace (MongoDB)
 * Scenario 10: Events (MongoDB + Neo4j)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Scenario 9: Marketplace', () => {
  beforeEach(async () => { await cleanAll(); });

  async function createListing(app: any, token: string) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/marketplace',
      headers: authHeader(token),
      payload: {
        title: 'Линейная алгебра, Кострикин, том 1',
        type: 'sell',
        price: 500,
        condition: 'хорошее',
        description: 'Учебник в хорошем состоянии, без пометок',
        location: 'Главный корпус, 2 этаж',
      },
    });
    return JSON.parse(res.body).data;
  }

  it('9.1 — browse listings', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/api/marketplace' });
    expect(res.statusCode).toBe(200);
  });

  it('9.2 — create listing', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/marketplace',
      headers: authHeader(accessToken),
      payload: {
        title: 'Учебник по физике',
        type: 'sell',
        price: 300,
        condition: 'нормальное',
        description: 'Учебник Савельева, 3 тома',
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('9.3 — listing detail', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const listing = await createListing(app, accessToken);

    const res = await app.inject({
      method: 'GET',
      url: `/api/marketplace/${listing._id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.title).toContain('Кострикин');
  });

  it('9.4 — toggle listing active/inactive', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const listing = await createListing(app, accessToken);

    const res = await app.inject({
      method: 'POST',
      url: `/api/marketplace/${listing._id}/toggle`,
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('9.5 — contact seller', async () => {
    const app = await getApp();
    const seller = await registerTestUser(app);
    const listing = await createListing(app, seller.accessToken);

    const buyer = await registerTestUser(app, { email: 'buyer@test.ru' });
    const res = await app.inject({
      method: 'POST',
      url: `/api/marketplace/${listing._id}/contact`,
      headers: authHeader(buyer.accessToken),
      payload: { message: 'Здравствуйте, учебник еще актуален?' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('9.6 — delete own listing', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const listing = await createListing(app, accessToken);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/marketplace/${listing._id}`,
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('Scenario 10: Events', () => {
  beforeEach(async () => { await cleanAll(); });

  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  async function createEvent(app: any, token: string) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: authHeader(token),
      payload: {
        title: 'Хакатон по ИИ',
        type: 'хакатон',
        description: 'Двухдневный хакатон по искусственному интеллекту',
        date: futureDate,
        time: '10:00',
        location: 'Аудитория 301',
        maxParticipants: 50,
        tags: ['ИИ', 'хакатон'],
      },
    });
    return JSON.parse(res.body).data;
  }

  it('10.1 — browse events', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/api/events' });
    expect(res.statusCode).toBe(200);
  });

  it('10.2 — create event', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: authHeader(accessToken),
      payload: {
        title: 'Конференция',
        type: 'конференция',
        description: 'Научная конференция по информатике',
        date: futureDate,
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('10.3 — toggle attendance', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const event = await createEvent(app, accessToken);

    const other = await registerTestUser(app, { email: 'attendee@test.ru' });

    // Register
    const attendRes = await app.inject({
      method: 'POST',
      url: `/api/events/${event._id}/attend`,
      headers: authHeader(other.accessToken),
    });
    expect(attendRes.statusCode).toBe(200);

    // Unregister
    const unattendRes = await app.inject({
      method: 'POST',
      url: `/api/events/${event._id}/attend`,
      headers: authHeader(other.accessToken),
    });
    expect(unattendRes.statusCode).toBe(200);
  });

  it('10.4 — event detail', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const event = await createEvent(app, accessToken);

    const res = await app.inject({
      method: 'GET',
      url: `/api/events/${event._id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.title).toBe('Хакатон по ИИ');
  });

  it('10.5 — participants list', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const event = await createEvent(app, accessToken);

    const res = await app.inject({
      method: 'GET',
      url: `/api/events/${event._id}/participants`,
    });
    expect(res.statusCode).toBe(200);
  });

  it('10.6 — attending friends (Neo4j)', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const event = await createEvent(app, accessToken);

    const res = await app.inject({
      method: 'GET',
      url: `/api/events/${event._id}/friends`,
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });
});
