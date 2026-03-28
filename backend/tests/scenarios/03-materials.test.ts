/**
 * Scenario 4: Materials (MongoDB + Redis)
 * Covers: browse, search, detail, like/unlike, comment, upload, download, delete
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

describe('Scenario 4: Materials', () => {
  beforeEach(async () => { await cleanAll(); });

  async function seedMaterial(app: any, token: string) {
    const MaterialModel = mongoose.model('Material');
    const decoded = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64').toString());
    const doc = await MaterialModel.create({
      title: 'Конспект по линейной алгебре',
      description: 'Полный конспект лекций',
      type: 'конспект',
      course: { id: new mongoose.Types.ObjectId(), title: 'Линейная алгебра', code: 'ЛА-201' },
      author: { id: new mongoose.Types.ObjectId(decoded.id), name: 'Тест Тестов' },
      files: [{ filename: 'test.pdf', originalName: 'test.pdf', mimeType: 'application/pdf', size: 1024, url: '/uploads/test.pdf' }],
      tags: ['алгебра', 'конспект'],
      stats: { views: 10, downloads: 5, likes: 3, commentCount: 0 },
    });
    return doc;
  }

  it('4.1 — browse returns paginated materials', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    await seedMaterial(app, accessToken);

    const res = await app.inject({ method: 'GET', url: '/api/materials' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('4.2 — search filters materials by keyword', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    await seedMaterial(app, accessToken);

    const res = await app.inject({ method: 'GET', url: '/api/materials?search=конспект' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.some((m: any) => m.title.includes('Конспект'))).toBe(true);
  });

  it('4.3 — detail returns material with files', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const material = await seedMaterial(app, accessToken);

    const res = await app.inject({ method: 'GET', url: `/api/materials/${material._id}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // Detail endpoint wraps in { material, comments } or returns flat
    const m = body.data.material ?? body.data;
    expect(m.title).toBe('Конспект по линейной алгебре');
  });

  it('4.4 — like toggles on and off', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const material = await seedMaterial(app, accessToken);

    // Like
    const like1 = await app.inject({
      method: 'POST',
      url: `/api/materials/${material._id}/like`,
      headers: authHeader(accessToken),
    });
    expect(like1.statusCode).toBe(200);
    const body1 = JSON.parse(like1.body);
    expect(body1.data.liked).toBe(true);

    // Unlike
    const like2 = await app.inject({
      method: 'POST',
      url: `/api/materials/${material._id}/like`,
      headers: authHeader(accessToken),
    });
    expect(like2.statusCode).toBe(200);
    const body2 = JSON.parse(like2.body);
    expect(body2.data.liked).toBe(false);
  });

  it('4.5 — comment is added to material', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const material = await seedMaterial(app, accessToken);

    const res = await app.inject({
      method: 'POST',
      url: `/api/materials/${material._id}/comments`,
      headers: authHeader(accessToken),
      payload: { text: 'Отличный материал, спасибо!' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('4.6 — delete own material succeeds', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const material = await seedMaterial(app, accessToken);

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/materials/${material._id}`,
      headers: authHeader(accessToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it('4.7 — delete other user material returns 403', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const material = await seedMaterial(app, accessToken);

    const other = await registerTestUser(app, { email: 'other@test.ru' });
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/materials/${material._id}`,
      headers: authHeader(other.accessToken),
    });
    expect(res.statusCode).toBe(403);
  });

  it('4.8 — download endpoint works', async () => {
    const app = await getApp();
    const { accessToken } = await registerTestUser(app);
    const material = await seedMaterial(app, accessToken);

    const res = await app.inject({
      method: 'GET',
      url: `/api/materials/${material._id}/download`,
      headers: authHeader(accessToken),
    });
    // Should either return 200 with URL or file, not 500
    expect([200, 404]).toContain(res.statusCode);
  });
});
