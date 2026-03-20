import { NotificationModel, type NotificationType } from './notifications.model.js';
import { getRedis } from '../../config/redis.js';
import { emitToUser } from '../../config/socket.js';
import { logger } from '../../utils/logger.js';

const NOTIFICATION_TTL = 86400; // 24 hours — same for list and count

const UNREAD_LIST_KEY = (userId: string) => `notif:unread:${userId}`;
const UNREAD_COUNT_KEY = (userId: string) => `notif:count:${userId}`;
const MAX_UNREAD_LIST = 50;

// ---------------------------------------------------------------------------
// Core: create a single notification
// ---------------------------------------------------------------------------
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  // 1. Persist to MongoDB
  const doc = await NotificationModel.create({ userId, type, title, message, link });

  // 2. Push to Redis unread list + bump counter
  try {
    const redis = await getRedis();
    const pipeline = redis.pipeline();

    const payload = JSON.stringify({
      id: doc._id.toString(),
      type,
      title,
      message,
      link,
      createdAt: doc.createdAt.toISOString(),
    });

    pipeline.lpush(UNREAD_LIST_KEY(userId), payload);
    pipeline.ltrim(UNREAD_LIST_KEY(userId), 0, MAX_UNREAD_LIST - 1);
    pipeline.incr(UNREAD_COUNT_KEY(userId));
    pipeline.expire(UNREAD_LIST_KEY(userId), NOTIFICATION_TTL);
    pipeline.expire(UNREAD_COUNT_KEY(userId), NOTIFICATION_TTL);
    await pipeline.exec();
  } catch (err) {
    logger.error(err, '[Notifications] Redis pipeline error');
  }

  // 3. Real-time push via Socket.io
  try {
    emitToUser(userId, 'notification', { type, title, message, link });
  } catch {
    // Socket may not be connected; ignore silently
  }
}

// ---------------------------------------------------------------------------
// Batch: notify multiple users at once
// ---------------------------------------------------------------------------
export async function notifyMultipleUsers(
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  if (userIds.length === 0) return;

  // 1. Bulk insert into MongoDB
  const docs = userIds.map((userId) => ({
    userId,
    type,
    title,
    message,
    link,
    read: false,
  }));
  const inserted = await NotificationModel.insertMany(docs, { ordered: false });

  // 2. Redis pipeline for all users
  try {
    const redis = await getRedis();
    const pipeline = redis.pipeline();

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i]!;
      const doc = inserted[i]!;

      const payload = JSON.stringify({
        id: doc._id.toString(),
        type,
        title,
        message,
        link,
        createdAt: doc.createdAt.toISOString(),
      });

      pipeline.lpush(UNREAD_LIST_KEY(userId), payload);
      pipeline.ltrim(UNREAD_LIST_KEY(userId), 0, MAX_UNREAD_LIST - 1);
      pipeline.incr(UNREAD_COUNT_KEY(userId));
      pipeline.expire(UNREAD_LIST_KEY(userId), NOTIFICATION_TTL);
      pipeline.expire(UNREAD_COUNT_KEY(userId), NOTIFICATION_TTL);
    }

    await pipeline.exec();
  } catch (err) {
    logger.error('[Notifications] Redis batch pipeline error:', err);
  }

  // 3. Emit to each user via Socket.io
  for (const userId of userIds) {
    try {
      emitToUser(userId, 'notification', { type, title, message, link });
    } catch {
      // ignore per-user socket failures
    }
  }
}

// ---------------------------------------------------------------------------
// Read: paginated notification history
// ---------------------------------------------------------------------------
export async function getNotifications(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NotificationModel.countDocuments({ userId }),
  ]);

  return { items, total, page, limit };
}

// ---------------------------------------------------------------------------
// Mark all as read
// ---------------------------------------------------------------------------
export async function markAllRead(userId: string): Promise<void> {
  await NotificationModel.updateMany(
    { userId, read: false },
    { $set: { read: true } }
  );

  try {
    const redis = await getRedis();
    const pipeline = redis.pipeline();
    pipeline.set(UNREAD_COUNT_KEY(userId), '0', 'EX', NOTIFICATION_TTL);
    pipeline.del(UNREAD_LIST_KEY(userId));
    await pipeline.exec();
  } catch (err) {
    logger.error('[Notifications] Redis markAllRead error:', err);
  }
}

// ---------------------------------------------------------------------------
// Mark single notification as read
// ---------------------------------------------------------------------------
export async function markOneRead(
  notificationId: string,
  userId: string
): Promise<{ error?: string }> {
  const notification = await NotificationModel.findById(notificationId).lean();

  if (!notification) {
    return { error: 'NOT_FOUND' };
  }

  if (notification.userId.toString() !== userId) {
    return { error: 'FORBIDDEN' };
  }

  if (notification.read) {
    return {};
  }

  await NotificationModel.updateOne(
    { _id: notificationId },
    { $set: { read: true } }
  );

  try {
    const redis = await getRedis();
    const pipeline = redis.pipeline();
    pipeline.decr(UNREAD_COUNT_KEY(userId));
    pipeline.exec();
    // Ensure count doesn't go negative
    const count = await redis.get(UNREAD_COUNT_KEY(userId));
    if (count !== null && parseInt(count, 10) < 0) {
      await redis.set(UNREAD_COUNT_KEY(userId), '0', 'EX', NOTIFICATION_TTL);
    }
  } catch (err) {
    logger.error('[Notifications] Redis markOneRead error:', err);
  }

  return {};
}

// ---------------------------------------------------------------------------
// Delete notification
// ---------------------------------------------------------------------------
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<{ error?: string }> {
  const notification = await NotificationModel.findById(notificationId).lean();

  if (!notification) {
    return { error: 'NOT_FOUND' };
  }

  if (notification.userId.toString() !== userId) {
    return { error: 'FORBIDDEN' };
  }

  await NotificationModel.findByIdAndDelete(notificationId);

  if (!notification.read) {
    try {
      const redis = await getRedis();
      const pipeline = redis.pipeline();
      pipeline.decr(UNREAD_COUNT_KEY(userId));
      pipeline.exec();
      // Ensure count doesn't go negative
      const count = await redis.get(UNREAD_COUNT_KEY(userId));
      if (count !== null && parseInt(count, 10) < 0) {
        await redis.set(UNREAD_COUNT_KEY(userId), '0', 'EX', NOTIFICATION_TTL);
      }
    } catch (err) {
      logger.error('[Notifications] Redis deleteNotification error:', err);
    }
  }

  return {};
}

// ---------------------------------------------------------------------------
// Unread count (Redis-first, MongoDB fallback)
// ---------------------------------------------------------------------------
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const redis = await getRedis();
    const cached = await redis.get(UNREAD_COUNT_KEY(userId));

    if (cached !== null) {
      return parseInt(cached, 10);
    }
  } catch {
    // fall through to MongoDB
  }

  const count = await NotificationModel.countDocuments({ userId, read: false });

  // Warm the cache for next time
  try {
    const redis = await getRedis();
    await redis.set(UNREAD_COUNT_KEY(userId), String(count), 'EX', NOTIFICATION_TTL);
  } catch {
    // ignore
  }

  return count;
}
