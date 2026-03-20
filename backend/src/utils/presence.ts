import { getRedis } from '../config/redis.js';
import { logger } from './logger.js';

const PRESENCE_TTL = 120; // 2 minutes — renewed on heartbeat
const PRESENCE_KEY = (userId: string) => `presence:${userId}`;

/**
 * Mark a user as online. Called on socket connect and heartbeat.
 */
export async function setOnline(userId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(PRESENCE_KEY(userId), 'online', 'EX', PRESENCE_TTL);
  } catch (err) {
    logger.error(err, '[Presence] Failed to set online');
  }
}

/**
 * Mark a user as offline. Called on socket disconnect.
 */
export async function setOffline(userId: string): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.del(PRESENCE_KEY(userId));
  } catch (err) {
    logger.error(err, '[Presence] Failed to set offline');
  }
}

/**
 * Check if a user is online.
 */
export async function isOnline(userId: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    const val = await redis.get(PRESENCE_KEY(userId));
    return val === 'online';
  } catch {
    return false;
  }
}

/**
 * Check online status for multiple users at once.
 */
export async function getOnlineStatuses(userIds: string[]): Promise<Record<string, boolean>> {
  if (userIds.length === 0) return {};

  try {
    const redis = await getRedis();
    const pipeline = redis.pipeline();
    for (const id of userIds) {
      pipeline.get(PRESENCE_KEY(id));
    }
    const results = await pipeline.exec();

    const statuses: Record<string, boolean> = {};
    for (let i = 0; i < userIds.length; i++) {
      const [err, val] = results?.[i] ?? [null, null];
      statuses[userIds[i]!] = !err && val === 'online';
    }
    return statuses;
  } catch {
    return {};
  }
}
