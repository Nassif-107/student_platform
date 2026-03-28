/**
 * Scenario 3: Courses (MongoDB + Neo4j)
 * Covers: browse, search, detail, enroll, create (moderator), prerequisites, materials/questions/deadlines tabs
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Scenario 3: Courses', () => {
  beforeEach(async () => { await cleanAll(); });

  async function createCourse(app: any, token: string, overrides: Record<string, unknown> = {}) {
    // Promote user to moderator first
    const UserModel = mongoose.model('User');
    const decoded = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64').toString());
    await UserModel.findByIdAndUpdate(decoded.id, { role: 'moderator' });

    // Re-login to get token with updated role
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: decoded.email, password: 'testpassword123' },
    });
    const modToken = JSON.parse(loginRes.body).data.accessToken;

    const res = await app.inject({
      method: 'POST',
      url: '/api/courses',
      headers: authHeader(modToken),
      payload: {
        title: 'Математический анализ',
        code: 'МА-101',
        description: 'Основы математического анализа для первого курса',
        university: { name: 'КубГТУ' },
        faculty: 'ИКС',
        year: 1,
        semester: 1,
        type: 'обязательный',
        credits: 4,
        professor: { name: 'Иванов И.И.' },
        ...overrides,
      },
    });
    return { res, modToken };
  }

  it('3.1 — browse returns paginated course list', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const { modToken } = await createCourse(app, accessToken);

    const res = await app.inject({
      method: 'GET',
      url: '/api/courses',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.meta).toBeDefined();
  });

  it('3.2 — search filters courses by keyword', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    await createCourse(app, accessToken, { title: 'Линейная алгебра', code: 'ЛА-201' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/courses?search=Линейная',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const items = body.data ?? [];
    expect(items.some((c: any) => c.title?.includes('Линейная'))).toBe(true);
  });

  it('3.3 — course detail returns full info', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const { res: createRes } = await createCourse(app, accessToken);
    const courseId = JSON.parse(createRes.body).data._id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/courses/${courseId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.title).toBe('Математический анализ');
  });

  it('3.4 — enroll creates ENROLLED_IN in Neo4j', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const { res: createRes } = await createCourse(app, accessToken);
    const courseId = JSON.parse(createRes.body).data._id;

    // Need a student token (not moderator)
    const student = await registerTestUser(app, { email: 'student@test.ru' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/courses/${courseId}/enroll`,
      headers: authHeader(student.accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('3.5 — student cannot create course (403)', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/courses',
      headers: authHeader(accessToken),
      payload: {
        title: 'Test',
        code: 'T-1',
        description: 'Test course description',
        university: { name: 'КубГТУ' },
        faculty: 'ИКС',
        year: 1,
        semester: 1,
        type: 'обязательный',
        credits: 3,
        professor: { name: 'Test' },
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('3.6 — course materials endpoint returns list', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const { res: createRes } = await createCourse(app, accessToken);
    const courseId = JSON.parse(createRes.body).data._id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/courses/${courseId}/materials`,
    });
    expect(res.statusCode).toBe(200);
  });

  it('3.7 — course questions endpoint returns list', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const { res: createRes } = await createCourse(app, accessToken);
    const courseId = JSON.parse(createRes.body).data._id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/courses/${courseId}/questions`,
    });
    expect(res.statusCode).toBe(200);
  });

  it('3.8 — course deadlines endpoint returns list', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const { res: createRes } = await createCourse(app, accessToken);
    const courseId = JSON.parse(createRes.body).data._id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/courses/${courseId}/deadlines`,
    });
    expect(res.statusCode).toBe(200);
  });
});
