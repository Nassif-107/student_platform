import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

/** Helper: create a course so we have a valid courseId for groups. */
async function createTestCourse(app: Awaited<ReturnType<typeof getApp>>) {
  const { UserModel } = await import('../../src/modules/users/users.model.js');

  const { accessToken, user } = await registerTestUser(app, {
    email: `mod-grp-${Date.now()}@university.ru`,
  });
  await UserModel.updateOne(
    { _id: (user as Record<string, unknown>)._id },
    { $set: { role: 'moderator' } }
  );

  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: user.email, password: 'testpassword123' },
  });
  const modToken = JSON.parse(loginRes.body).data.accessToken as string;

  const courseRes = await app.inject({
    method: 'POST',
    url: '/api/courses',
    headers: authHeader(modToken),
    payload: {
      title: 'Операционные системы',
      code: 'OS101',
      description: 'Курс по ОС',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      year: 3,
      semester: 1,
      type: 'обязательный',
      credits: 4,
      professor: { name: 'Осов О.О.' },
    },
  });

  const courseId = JSON.parse(courseRes.body).data._id as string;
  return { courseId };
}

/** Helper: create a group and return its id + creator token. */
async function createTestGroup(
  app: Awaited<ReturnType<typeof getApp>>,
  courseId: string,
  email?: string
) {
  const { accessToken } = await registerTestUser(app, {
    email: email ?? `grp-creator-${Date.now()}@university.ru`,
  });

  const res = await app.inject({
    method: 'POST',
    url: '/api/groups',
    headers: authHeader(accessToken),
    payload: {
      name: 'Подготовка к экзамену',
      courseId,
      courseTitle: 'Операционные системы',
      type: 'exam_prep',
      description: 'Готовимся к экзамену вместе',
      maxMembers: 5,
    },
  });

  const groupId = JSON.parse(res.body).data._id as string;
  return { groupId, accessToken };
}

describe('Groups Module — /api/groups', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/groups ----

  describe('GET /api/groups', () => {
    it('returns a list of groups', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/groups',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ---- POST /api/groups ----

  describe('POST /api/groups', () => {
    it('creates a group', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'grp-post@university.ru',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/groups',
        headers: authHeader(accessToken),
        payload: {
          name: 'Учебная группа по ОС',
          courseId,
          courseTitle: 'Операционные системы',
          type: 'study',
          maxMembers: 4,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Учебная группа по ОС');
    });
  });

  // ---- POST /api/groups/:id/join ----

  describe('POST /api/groups/:id/join', () => {
    it('joins a group', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { groupId } = await createTestGroup(app, courseId, 'grp-owner@university.ru');

      const { accessToken: joinerToken } = await registerTestUser(app, {
        email: 'joiner@university.ru',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/groups/${groupId}/join`,
        headers: authHeader(joinerToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- DELETE /api/groups/:id/leave ----

  describe('DELETE /api/groups/:id/leave', () => {
    it('leaves a group', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { groupId } = await createTestGroup(app, courseId, 'grp-owner-leave@university.ru');

      const { accessToken: memberToken } = await registerTestUser(app, {
        email: 'leaver@university.ru',
      });

      // Join first
      await app.inject({
        method: 'POST',
        url: `/api/groups/${groupId}/join`,
        headers: authHeader(memberToken),
      });

      // Then leave
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/groups/${groupId}/leave`,
        headers: authHeader(memberToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });
});
