/**
 * Scenario 7: Groups (MongoDB + Neo4j)
 * Scenario 8: Deadlines (MongoDB + Redis)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Scenario 7: Study Groups', () => {
  beforeEach(async () => { await cleanAll(); });

  it('7.1 — browse returns groups list', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/api/groups' });
    expect(res.statusCode).toBe(200);
  });

  it('7.2 — create group', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/groups',
      headers: authHeader(accessToken),
      payload: {
        name: 'Подготовка к экзамену по МатАну',
        type: 'exam_prep',
        description: 'Готовимся вместе к экзамену',
        maxMembers: 5,
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('7.3 — join group', async () => {
    const app = await getApp();
    const creator = await registerTestUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/groups',
      headers: authHeader(creator.accessToken),
      payload: { name: 'Группа', type: 'study', description: 'Описание', maxMembers: 10 },
    });
    const groupId = JSON.parse(createRes.body).data._id;

    const joiner = await registerTestUser(app, { email: 'joiner@test.ru' });
    const joinRes = await app.inject({
      method: 'POST',
      url: `/api/groups/${groupId}/join`,
      headers: authHeader(joiner.accessToken),
    });
    expect(joinRes.statusCode).toBe(200);
  });

  it('7.4 — leave group', async () => {
    const app = await getApp();
    const creator = await registerTestUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/groups',
      headers: authHeader(creator.accessToken),
      payload: { name: 'Группа2', type: 'study', description: 'Описание', maxMembers: 10 },
    });
    const groupId = JSON.parse(createRes.body).data._id;

    const joiner = await registerTestUser(app, { email: 'leaver@test.ru' });
    await app.inject({
      method: 'POST',
      url: `/api/groups/${groupId}/join`,
      headers: authHeader(joiner.accessToken),
    });

    const leaveRes = await app.inject({
      method: 'DELETE',
      url: `/api/groups/${groupId}/leave`,
      headers: authHeader(joiner.accessToken),
    });
    expect(leaveRes.statusCode).toBe(200);
  });

  it('7.5 — team suggestions endpoint works', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/groups/suggestions',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('7.6 — delete group (leader only)', async () => {
    const app = await getApp();
    const creator = await registerTestUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/groups',
      headers: authHeader(creator.accessToken),
      payload: { name: 'ToDelete', type: 'study', description: 'Del', maxMembers: 5 },
    });
    const groupId = JSON.parse(createRes.body).data._id;

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/groups/${groupId}`,
      headers: authHeader(creator.accessToken),
    });
    expect(delRes.statusCode).toBe(200);
  });
});

describe('Scenario 8: Deadlines', () => {
  beforeEach(async () => { await cleanAll(); });

  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  it('8.1 — browse deadlines', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/deadlines',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('8.2 — create deadline with future date', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/deadlines',
      headers: authHeader(accessToken),
      payload: {
        title: 'Сдать лабораторную работу 5',
        courseId: '000000000000000000000001',
        courseTitle: 'Математический анализ',
        courseCode: 'МА-101',
        type: 'лабораторная',
        dueDate: futureDate,
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('8.3 — reject deadline with past date', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/deadlines',
      headers: authHeader(accessToken),
      payload: {
        title: 'Просроченный дедлайн',
        courseId: '000000000000000000000001',
        courseTitle: 'Тест',
        courseCode: 'Т-1',
        type: 'лабораторная',
        dueDate: pastDate,
      },
    });
    expect([400, 422]).toContain(res.statusCode);
  });

  it('8.4 — confirm deadline', async () => {
    const app = await getApp();
    const creator = await registerTestUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/deadlines',
      headers: authHeader(creator.accessToken),
      payload: {
        title: 'Экзамен',
        courseId: '000000000000000000000001',
        courseTitle: 'Курс',
        courseCode: 'К-1',
        type: 'экзамен',
        dueDate: futureDate,
      },
    });
    const deadlineId = JSON.parse(createRes.body).data._id;

    const other = await registerTestUser(app, { email: 'confirmer@test.ru' });
    const confirmRes = await app.inject({
      method: 'POST',
      url: `/api/deadlines/${deadlineId}/confirm`,
      headers: authHeader(other.accessToken),
    });
    expect(confirmRes.statusCode).toBe(200);
  });

  it('8.5 — upcoming deadlines', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/deadlines/upcoming',
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });
});
