import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

/**
 * Build a multipart/form-data payload for material upload.
 * The file attached is a minimal valid PDF (magic bytes %PDF).
 */
function buildMaterialMultipart(fields: Record<string, string>, boundary: string): Buffer {
  let body = '';

  for (const [key, value] of Object.entries(fields)) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
    body += `${value}\r\n`;
  }

  // Minimal PDF-like file (starts with %PDF magic bytes)
  const pdfContent = Buffer.from('%PDF-1.4 minimal test file content');
  body += `--${boundary}\r\n`;
  body += 'Content-Disposition: form-data; name="file"; filename="notes.pdf"\r\n';
  body += 'Content-Type: application/pdf\r\n\r\n';

  const prefix = Buffer.from(body, 'utf-8');
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');

  return Buffer.concat([prefix, pdfContent, suffix]);
}

/** Helper: create a course (moderator required) so materials have a valid courseId. */
async function createTestCourse(app: Awaited<ReturnType<typeof getApp>>) {
  const { UserModel } = await import('../../src/modules/users/users.model.js');

  const { accessToken, user } = await registerTestUser(app, {
    email: `mod-${Date.now()}@university.ru`,
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
      title: 'Алгоритмы',
      code: 'ALG01',
      description: 'Курс по алгоритмам и структурам данных',
      university: { name: 'КубГТУ' },
      faculty: 'ИКС',
      year: 2,
      semester: 1,
      type: 'обязательный',
      credits: 4,
      professor: { name: 'Алгоритмов А.А.' },
    },
  });

  const courseId = JSON.parse(courseRes.body).data._id as string;
  return { courseId, modToken };
}

describe('Materials Module — /api/materials', () => {
  beforeEach(async () => {
    await cleanAll();
  });

  // ---- GET /api/materials ----

  describe('GET /api/materials', () => {
    it('returns a paginated list', async () => {
      const app = await getApp();

      const res = await app.inject({
        method: 'GET',
        url: '/api/materials',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ---- POST /api/materials (multipart) ----

  describe('POST /api/materials', () => {
    it('creates a material via multipart upload', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'uploader@university.ru',
      });

      const boundary = '----MaterialBoundary' + Date.now();
      const payload = buildMaterialMultipart(
        {
          title: 'Конспект по алгоритмам',
          courseId,
          courseTitle: 'Алгоритмы',
          courseCode: 'ALG01',
          type: 'конспект',
          description: 'Подробный конспект лекций',
        },
        boundary
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/materials',
        headers: {
          ...authHeader(accessToken),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Конспект по алгоритмам');
    });
  });

  // ---- POST /api/materials/:id/like ----

  describe('POST /api/materials/:id/like', () => {
    it('toggles like on a material', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'liker@university.ru',
      });

      // Create material first
      const boundary = '----LikeBoundary' + Date.now();
      const payload = buildMaterialMultipart(
        {
          title: 'Лабораторная 1',
          courseId,
          courseTitle: 'Алгоритмы',
          courseCode: 'ALG01',
          type: 'лабораторная',
        },
        boundary
      );

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/materials',
        headers: {
          ...authHeader(accessToken),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      const materialId = JSON.parse(createRes.body).data._id as string;

      // Toggle like
      const res = await app.inject({
        method: 'POST',
        url: `/api/materials/${materialId}/like`,
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- POST /api/materials/:id/comments ----

  describe('POST /api/materials/:id/comments', () => {
    it('adds a comment', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'commenter@university.ru',
      });

      // Create material
      const boundary = '----CommentBoundary' + Date.now();
      const payload = buildMaterialMultipart(
        {
          title: 'Презентация',
          courseId,
          courseTitle: 'Алгоритмы',
          courseCode: 'ALG01',
          type: 'презентация',
        },
        boundary
      );

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/materials',
        headers: {
          ...authHeader(accessToken),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      const materialId = JSON.parse(createRes.body).data._id as string;

      // Add comment
      const res = await app.inject({
        method: 'POST',
        url: `/api/materials/${materialId}/comments`,
        headers: authHeader(accessToken),
        payload: { text: 'Отличный конспект, спасибо!' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ---- DELETE /api/materials/:id ----

  describe('DELETE /api/materials/:id', () => {
    it('author can delete own material', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);
      const { accessToken } = await registerTestUser(app, {
        email: 'author-del@university.ru',
      });

      // Create material
      const boundary = '----DeleteBoundary' + Date.now();
      const payload = buildMaterialMultipart(
        {
          title: 'Удалить это',
          courseId,
          courseTitle: 'Алгоритмы',
          courseCode: 'ALG01',
          type: 'другое',
        },
        boundary
      );

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/materials',
        headers: {
          ...authHeader(accessToken),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      const materialId = JSON.parse(createRes.body).data._id as string;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/materials/${materialId}`,
        headers: authHeader(accessToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.deleted).toBe(true);
    });

    it('non-author gets 403', async () => {
      const app = await getApp();
      const { courseId } = await createTestCourse(app);

      // Author creates material
      const { accessToken: authorToken } = await registerTestUser(app, {
        email: 'owner@university.ru',
      });
      const boundary = '----ForbidBoundary' + Date.now();
      const payload = buildMaterialMultipart(
        {
          title: 'Чужой материал',
          courseId,
          courseTitle: 'Алгоритмы',
          courseCode: 'ALG01',
          type: 'конспект',
        },
        boundary
      );

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/materials',
        headers: {
          ...authHeader(authorToken),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      const materialId = JSON.parse(createRes.body).data._id as string;

      // Different user tries to delete
      const { accessToken: otherToken } = await registerTestUser(app, {
        email: 'intruder@university.ru',
      });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/materials/${materialId}`,
        headers: authHeader(otherToken),
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });
});
