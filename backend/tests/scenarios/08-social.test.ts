/**
 * Scenario 11: Friends & Social (Neo4j + Redis)
 * Scenario 12: Professors (MongoDB)
 * Scenario 13: Notifications (MongoDB + Redis)
 * Scenario 14: Analytics (InfluxDB + Redis)
 * Scenario 15: Profile & Settings
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Scenario 11: Friends & Social Network', () => {
  beforeEach(async () => { await cleanAll(); });

  it('11.1 — send friend request', async () => {
    const app = await getApp();
    const user1 = await registerTestUser(app, { email: 'user1@test.ru' });
    const user2 = await registerTestUser(app, { email: 'user2@test.ru' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/social/friends/${user2.user._id ?? user2.user.id}`,
      headers: authHeader(user1.accessToken),
    });
    expect(res.statusCode).toBe(201);
  });

  it('11.2 — accept friend request', async () => {
    const app = await getApp();
    const user1 = await registerTestUser(app, { email: 'sender@test.ru' });
    const user2 = await registerTestUser(app, { email: 'receiver@test.ru' });

    // Send request
    await app.inject({
      method: 'POST',
      url: `/api/social/friends/${user2.user._id ?? user2.user.id}`,
      headers: authHeader(user1.accessToken),
    });

    // Accept
    const acceptRes = await app.inject({
      method: 'POST',
      url: `/api/social/requests/${user1.user._id ?? user1.user.id}/accept`,
      headers: authHeader(user2.accessToken),
    });
    expect(acceptRes.statusCode).toBe(200);
  });

  it('11.3 — reject friend request', async () => {
    const app = await getApp();
    const user1 = await registerTestUser(app, { email: 'req1@test.ru' });
    const user2 = await registerTestUser(app, { email: 'req2@test.ru' });

    await app.inject({
      method: 'POST',
      url: `/api/social/friends/${user2.user._id ?? user2.user.id}`,
      headers: authHeader(user1.accessToken),
    });

    const rejectRes = await app.inject({
      method: 'POST',
      url: `/api/social/requests/${user1.user._id ?? user1.user.id}/reject`,
      headers: authHeader(user2.accessToken),
    });
    expect(rejectRes.statusCode).toBe(200);
  });

  it('11.4 — friend suggestions (Neo4j)', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/social/suggestions',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('11.5 — classmates endpoint', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/social/classmates',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('11.6 — remove friend', async () => {
    const app = await getApp();
    const user1 = await registerTestUser(app, { email: 'f1@test.ru' });
    const user2 = await registerTestUser(app, { email: 'f2@test.ru' });

    // Add friend
    await app.inject({
      method: 'POST',
      url: `/api/social/friends/${user2.user._id ?? user2.user.id}`,
      headers: authHeader(user1.accessToken),
    });
    await app.inject({
      method: 'POST',
      url: `/api/social/requests/${user1.user._id ?? user1.user.id}/accept`,
      headers: authHeader(user2.accessToken),
    });

    // Remove
    const removeRes = await app.inject({
      method: 'DELETE',
      url: `/api/social/friends/${user2.user._id ?? user2.user.id}`,
      headers: authHeader(user1.accessToken),
    });
    expect(removeRes.statusCode).toBe(200);
  });

  it('11.7 — pending requests list', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/social/requests',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('Scenario 12: Professors', () => {
  beforeEach(async () => { await cleanAll(); });

  it('12.1 — browse professors', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/api/professors' });
    expect(res.statusCode).toBe(200);
  });

  it('12.2 — professor detail', async () => {
    const app = await getApp();
    const ProfessorModel = (await import('mongoose')).default.model('Professor');
    const prof = await ProfessorModel.create({
      name: { first: 'Иван', last: 'Иванов', patronymic: 'Иванович' },
      department: 'Кафедра математики',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      position: 'Доцент',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/professors/${prof._id}`,
    });
    expect(res.statusCode).toBe(200);
  });

  it('12.3 — professor courses', async () => {
    const app = await getApp();
    const ProfessorModel = (await import('mongoose')).default.model('Professor');
    const prof = await ProfessorModel.create({
      name: { first: 'Тест', last: 'Препод' },
      department: 'Кафедра',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      position: 'Профессор',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/professors/${prof._id}/courses`,
    });
    expect(res.statusCode).toBe(200);
  });

  it('12.4 — professor reviews', async () => {
    const app = await getApp();
    const ProfessorModel = (await import('mongoose')).default.model('Professor');
    const prof = await ProfessorModel.create({
      name: { first: 'Мария', last: 'Петрова' },
      department: 'Кафедра',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      position: 'Старший преподаватель',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/professors/${prof._id}/reviews`,
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('Scenario 13: Notifications', () => {
  beforeEach(async () => { await cleanAll(); });

  it('13.1 — list notifications', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('13.2 — unread count', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications/count',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('13.3 — mark all as read', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/notifications/read',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('Scenario 14: Analytics', () => {
  beforeEach(async () => { await cleanAll(); });

  it('14.1 — personal analytics', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/personal',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('14.2 — leaderboard (Redis sorted set)', async () => {
    const app = await getApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/leaderboard',
    });
    expect(res.statusCode).toBe(200);
  });

  it('14.3 — popular courses', async () => {
    const app = await getApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/courses/popular',
    });
    expect(res.statusCode).toBe(200);
  });

  it('14.4 — activity timeline (InfluxDB)', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/user/timeline',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('14.5 — platform analytics (requires admin)', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    // Promote to admin
    const mongoose = (await import('mongoose')).default;
    const UserModel = mongoose.model('User');
    const decoded = JSON.parse(Buffer.from(accessToken.split('.')[1]!, 'base64').toString());
    await UserModel.findByIdAndUpdate(decoded.id, { role: 'admin' });

    // Re-login to get admin token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: decoded.email, password: 'testpassword123' },
    });
    const adminToken = JSON.parse(loginRes.body).data.accessToken;

    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/platform',
      headers: authHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('Scenario 15: Profile & Settings', () => {
  beforeEach(async () => { await cleanAll(); });

  it('15.1 — view own profile', async () => {
    const app = await getApp();
    const { accessToken, user } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: `/api/users/${user._id ?? user.id}`,
    });
    expect(res.statusCode).toBe(200);
  });

  it('15.2 — edit profile (bio, skills)', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      headers: authHeader(accessToken),
      payload: {
        bio: 'Студент 2 курса, увлекаюсь программированием',
        skills: ['React', 'TypeScript', 'Node.js'],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.bio).toBe('Студент 2 курса, увлекаюсь программированием');
  });

  it('15.3 — update notification settings', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me',
      headers: authHeader(accessToken),
      payload: {
        settings: {
          notifications: { deadlines: true, materials: false, friends: true, forum: true },
        },
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it('15.4 — delete account', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/users/me',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('15.5 — search users', async () => {
    const app = await getApp();
    await registerTestUser(app, { email: 'searchable@test.ru', firstName: 'Поиск', lastName: 'Тестов' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/users/search?q=Поиск',
    });
    expect(res.statusCode).toBe(200);
  });
});
