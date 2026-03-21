/**
 * Cross-DB integration test: Notifications across MongoDB + Redis.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { cleanAll } from '../helpers.js';
import { getRedis } from '../../src/config/redis.js';

const getNotificationModel = () => mongoose.model('Notification');

// Lazy-load the notification service to avoid triggering model re-registration
// at import time. The service file imports NotificationModel from the model file.
let _notifService: typeof import('../../src/modules/notifications/notifications.service.js') | null = null;
async function getNotifService() {
  if (!_notifService) {
    _notifService = await import('../../src/modules/notifications/notifications.service.js');
  }
  return _notifService;
}

beforeEach(cleanAll);

describe('Notification flow — MongoDB + Redis', () => {
  const userId = new mongoose.Types.ObjectId().toString();

  it('createNotification creates MongoDB document and pushes to Redis', async () => {
    const { createNotification } = await getNotifService();
    const NotificationModel = getNotificationModel();

    await createNotification(
      userId,
      'MATERIAL_NEW',
      'Новый материал',
      'Добавлен новый конспект по курсу',
      '/materials/123',
    );

    // ── 1. Verify MongoDB document ──
    const docs = await NotificationModel.find({ userId }).lean();
    expect(docs.length).toBe(1);
    expect(docs[0]!.type).toBe('MATERIAL_NEW');
    expect(docs[0]!.title).toBe('Новый материал');
    expect(docs[0]!.read).toBe(false);

    // ── 2. Verify Redis unread list (LPUSH) ──
    const redis = await getRedis();
    const listKey = `notif:unread:${userId}`;
    const listLen = await redis.llen(listKey);
    expect(listLen).toBe(1);

    const item = await redis.lindex(listKey, 0);
    expect(item).not.toBeNull();
    const parsed = JSON.parse(item!);
    expect(parsed.type).toBe('MATERIAL_NEW');
    expect(parsed.title).toBe('Новый материал');

    // ── 3. Verify Redis unread count (INCR) ──
    const countKey = `notif:count:${userId}`;
    const countStr = await redis.get(countKey);
    expect(Number(countStr)).toBe(1);
  });

  it('multiple notifications increment the unread count correctly', async () => {
    const { createNotification, getUnreadCount } = await getNotifService();
    const NotificationModel = getNotificationModel();

    await createNotification(userId, 'MATERIAL_NEW', 'Уведомление 1', 'Текст 1');
    await createNotification(userId, 'DEADLINE_REMINDER', 'Уведомление 2', 'Текст 2');
    await createNotification(userId, 'FRIEND_REQUEST', 'Уведомление 3', 'Текст 3');

    const count = await getUnreadCount(userId);
    expect(count).toBe(3);

    const mongoCount = await NotificationModel.countDocuments({ userId, read: false });
    expect(mongoCount).toBe(3);
  });

  it('markOneRead decrements the Redis unread count', async () => {
    const { createNotification, markOneRead } = await getNotifService();
    const NotificationModel = getNotificationModel();

    await createNotification(userId, 'MATERIAL_NEW', 'Для чтения', 'Текст');

    const docs = await NotificationModel.find({ userId }).lean();
    const notifId = docs[0]!._id.toString();

    // Mark as read
    const result = await markOneRead(notifId, userId);
    expect(result.error).toBeUndefined();

    // Verify MongoDB
    const updated = await NotificationModel.findById(notifId).lean();
    expect(updated!.read).toBe(true);

    // Verify Redis count decremented
    const redis = await getRedis();
    const countStr = await redis.get(`notif:count:${userId}`);
    expect(Number(countStr)).toBe(0);
  });

  it('unread count does not go below zero', async () => {
    const { createNotification, markOneRead } = await getNotifService();
    const NotificationModel = getNotificationModel();

    await createNotification(userId, 'MATERIAL_NEW', 'Единственное', 'Текст');

    const docs = await NotificationModel.find({ userId }).lean();
    const notifId = docs[0]!._id.toString();

    // Mark as read twice — should not produce negative count
    await markOneRead(notifId, userId);
    await markOneRead(notifId, userId); // second call sees it's already read, no-ops

    const redis = await getRedis();
    const countStr = await redis.get(`notif:count:${userId}`);
    const count = Number(countStr);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
