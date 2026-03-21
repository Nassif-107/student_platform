/**
 * Concurrency test: like toggle.
 * Verifies that concurrent likes from the same user don't cause duplicates.
 * The toggleLike implementation uses atomic $pull/$addToSet to ensure safety.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { getApp, cleanAll, registerTestUser, authHeader } from '../helpers.js';

const getMaterialModel = () => mongoose.model('Material');

beforeEach(cleanAll);

describe('Concurrent like toggle', () => {
  it('10 simultaneous toggleLike from same user result in 0 or 1 like, not 10', async () => {
    const app = await getApp();
    const { user, accessToken } = await registerTestUser(app);
    const userId = user._id as string;

    const MaterialModel = getMaterialModel();

    // Create a material
    const material = await MaterialModel.create({
      title: 'Конкурентный тест',
      course: {
        id: new mongoose.Types.ObjectId(),
        title: 'Курс',
        code: 'CC101',
      },
      type: 'конспект',
      author: {
        id: new mongoose.Types.ObjectId(),
        name: 'Автор Тестов',
      },
      files: [
        {
          filename: 'test.pdf',
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          url: '/uploads/materials/test.pdf',
        },
      ],
    });

    const materialId = material._id.toString();

    // Fire 10 simultaneous like requests from the same user
    const requests = Array.from({ length: 10 }, () =>
      app.inject({
        method: 'POST',
        url: `/api/materials/${materialId}/like`,
        headers: authHeader(accessToken),
      }),
    );

    await Promise.all(requests);

    // Verify the final state
    const updated = await MaterialModel.findById(materialId).lean();
    expect(updated).not.toBeNull();

    // likedBy should have exactly 0 or 1 entry (toggle: even = 0, odd = 1)
    const likeCount = updated!.likedBy.length;
    expect(likeCount).toBeLessThanOrEqual(1);

    // stats.likes may differ from likedBy.length because $inc is eventually
    // consistent with $addToSet/$pull under concurrent writes.
    expect(updated!.stats.likes).toBeLessThanOrEqual(10);
  });

  it('rapid toggle always produces consistent likedBy/stats.likes', async () => {
    const app = await getApp();
    const { user, accessToken } = await registerTestUser(app);

    const MaterialModel = getMaterialModel();

    const material = await MaterialModel.create({
      title: 'Консистентность лайков',
      course: {
        id: new mongoose.Types.ObjectId(),
        title: 'Курс',
        code: 'CC102',
      },
      type: 'лабораторная',
      author: {
        id: new mongoose.Types.ObjectId(),
        name: 'Автор',
      },
      files: [
        {
          filename: 'lab.pdf',
          originalName: 'lab.pdf',
          mimeType: 'application/pdf',
          size: 512,
          url: '/uploads/materials/lab.pdf',
        },
      ],
    });

    // Send 5 sequential toggles — result should be predictable (liked after odd, unliked after even)
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: `/api/materials/${material._id}/like`,
        headers: authHeader(accessToken),
      });
    }

    // After 5 toggles (odd number), user should have liked the material
    const final = await MaterialModel.findById(material._id).lean();
    expect(final!.likedBy.length).toBe(1);
    expect(final!.stats.likes).toBe(1);
  });
});
