/**
 * Cross-DB integration test: Material lifecycle.
 * Tests material creation, liking, and viewing across MongoDB and Redis.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';
import { getRedis } from '../../src/config/redis.js';

const getMaterialModel = () => mongoose.model('Material');

beforeEach(cleanAll);

describe('Material lifecycle — cross-DB', () => {
  it('registers user, creates material, likes it, views it across MongoDB + Redis', async () => {
    const app = await getApp();

    // ── 1. Register a moderator user (needed to create courses) ──
    const { user, accessToken } = await registerTestUser(app);
    const userId = user._id;

    // Promote user to moderator for course creation
    await mongoose.connection.db!
      .collection('users')
      .updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { $set: { role: 'moderator' } },
      );

    // ── 2. Create a course ──
    const courseRes = await app.inject({
      method: 'POST',
      url: '/api/courses',
      headers: authHeader(accessToken),
      payload: {
        title: 'Тестовый курс для материалов',
        code: 'MAT101',
        description: 'Описание тестового курса',
        university: { name: 'КубГТУ' },
        faculty: 'Институт компьютерных систем',
        year: 2,
        semester: 1,
        type: 'обязательный',
        credits: 4,
        professor: { name: 'Проф. Тестов' },
      },
    });

    expect(courseRes.statusCode).toBe(201);
    const courseBody = JSON.parse(courseRes.body);
    const courseId = courseBody.data.course._id;

    // ── 3. Create a material directly in MongoDB ──
    // (multipart upload is complex; we test the DB layer directly)
    const MaterialModel = getMaterialModel();
    const material = await MaterialModel.create({
      title: 'Конспект лекции 1',
      course: { id: new mongoose.Types.ObjectId(courseId), title: 'Тестовый курс', code: 'MAT101' },
      type: 'конспект',
      author: { id: new mongoose.Types.ObjectId(userId), name: 'Тест Тестов' },
      files: [
        {
          filename: 'test-file.pdf',
          originalName: 'лекция1.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: '/uploads/materials/test-file.pdf',
        },
      ],
      tags: ['лекция', 'тест'],
    });

    expect(material._id).toBeDefined();
    expect(material.stats.likes).toBe(0);

    // ── 4. Like the material via API — verify MongoDB atomic update ──
    const likeRes = await app.inject({
      method: 'POST',
      url: `/api/materials/${material._id}/like`,
      headers: authHeader(accessToken),
    });

    expect(likeRes.statusCode).toBe(200);
    const likeBody = JSON.parse(likeRes.body);
    expect(likeBody.data.liked).toBe(true);
    expect(likeBody.data.likes).toBe(1);

    // Verify in MongoDB
    const afterLike = await MaterialModel.findById(material._id).lean();
    expect(afterLike!.stats.likes).toBe(1);
    expect(afterLike!.likedBy.map((id) => id.toString())).toContain(userId);

    // ── 5. View material — verify Redis counter incremented ──
    const viewRes = await app.inject({
      method: 'GET',
      url: `/api/materials/${material._id}`,
    });

    expect(viewRes.statusCode).toBe(200);

    const redis = await getRedis();
    const viewKey = `counter:material:${material._id}:views`;
    const viewCount = await redis.get(viewKey);
    expect(Number(viewCount)).toBeGreaterThanOrEqual(1);
  });
});
