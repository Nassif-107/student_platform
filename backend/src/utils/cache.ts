import { getRedis } from '../config/redis.js';
import { logger } from './logger.js';

/**
 * Build a deterministic cache key from segments.
 * Example: buildCacheKey('course', 'list', { faculty: 'IT', page: 1 }) → 'app:cache:course:list:{"faculty":"IT","page":1}'
 */
export function buildCacheKey(...segments: (string | Record<string, unknown>)[]): string {
  const parts = ['app', 'cache'];
  for (const seg of segments) {
    if (typeof seg === 'string') {
      parts.push(seg);
    } else {
      // Sort keys for deterministic serialization
      const sorted = Object.keys(seg)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          if (seg[key] !== undefined && seg[key] !== null) {
            acc[key] = seg[key];
          }
          return acc;
        }, {});
      parts.push(JSON.stringify(sorted));
    }
  }
  return parts.join(':');
}

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  const raw = await redis.get(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn({ key, err }, 'Failed to parse cached value, returning null');
    return null;
  }
}

export async function setCache(
  key: string,
  data: unknown,
  ttlSeconds: number
): Promise<void> {
  const redis = await getRedis();
  const serialized = JSON.stringify(data);
  await redis.set(key, serialized, 'EX', ttlSeconds);
}

export async function deleteCache(key: string): Promise<void> {
  const redis = await getRedis();
  await redis.unlink(key);
}

export async function deleteCachePattern(pattern: string): Promise<number> {
  const redis = await getRedis();
  let cursor = '0';
  let deletedCount = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.unlink(key);
      }
      await pipeline.exec();
      deletedCount += keys.length;
    }
  } while (cursor !== '0');

  return deletedCount;
}
