/**
 * Redis feature implementation tests.
 * Verifies cache utilities (buildCacheKey, getCache, setCache, deleteCachePattern),
 * presence tracking (setOnline, setOffline, isOnline with TTL),
 * leaderboard (updateReputation, getTopUsers, getUserRank),
 * and counter pattern (incr/getdel).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getRedis } from '../../src/config/redis.js';
import { buildCacheKey, getCache, setCache, deleteCachePattern } from '../../src/utils/cache.js';
import { setOnline, setOffline, isOnline } from '../../src/utils/presence.js';
import { updateReputation, getTopUsers, getUserRank } from '../../src/utils/leaderboard.js';
import { cleanRedis } from '../helpers.js';

beforeEach(cleanRedis);

// ─── Cache ─────────────────────────────────────────────────────────

describe('Redis Cache', () => {
  it('buildCacheKey creates deterministic keys', () => {
    const key1 = buildCacheKey('course', 'list', { faculty: 'ИКС', page: 1 });
    const key2 = buildCacheKey('course', 'list', { page: 1, faculty: 'ИКС' });
    // Keys should be identical regardless of object key order
    expect(key1).toBe(key2);
    expect(key1).toContain('app:cache:course:list:');
  });

  it('buildCacheKey omits null and undefined values', () => {
    const key = buildCacheKey('course', 'list', { faculty: 'ИКС', sort: undefined, limit: null as unknown as undefined });
    expect(key).not.toContain('sort');
    expect(key).not.toContain('limit');
    expect(key).toContain('faculty');
  });

  it('getCache/setCache round-trip works', async () => {
    const key = buildCacheKey('test', 'roundtrip');
    const data = { courses: [{ id: 1, title: 'Алгоритмы' }], total: 1 };

    await setCache(key, data, 60);
    const cached = await getCache<typeof data>(key);

    expect(cached).not.toBeNull();
    expect(cached!.total).toBe(1);
    expect(cached!.courses[0]!.title).toBe('Алгоритмы');
  });

  it('getCache returns null for missing key', async () => {
    const result = await getCache('app:cache:nonexistent:key');
    expect(result).toBeNull();
  });

  it('setCache respects TTL', async () => {
    const key = buildCacheKey('test', 'ttl');
    await setCache(key, { value: 1 }, 1); // 1 second TTL

    const redis = await getRedis();
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(1);
  });

  it('deleteCachePattern removes matching keys', async () => {
    await setCache(buildCacheKey('course', 'list', { page: 1 }), { p: 1 }, 60);
    await setCache(buildCacheKey('course', 'list', { page: 2 }), { p: 2 }, 60);
    await setCache(buildCacheKey('user', 'profile', { id: 'x' }), { u: 'x' }, 60);

    const deleted = await deleteCachePattern('app:cache:course:*');
    expect(deleted).toBe(2);

    // User cache should still be there
    const userCache = await getCache(buildCacheKey('user', 'profile', { id: 'x' }));
    expect(userCache).not.toBeNull();
  });
});

// ─── Presence ──────────────────────────────────────────────────────

describe('Redis Presence', () => {
  it('setOnline/setOffline/isOnline cycle', async () => {
    const userId = 'presence-user-1';

    // Initially offline
    expect(await isOnline(userId)).toBe(false);

    // Set online
    await setOnline(userId);
    expect(await isOnline(userId)).toBe(true);

    // Set offline
    await setOffline(userId);
    expect(await isOnline(userId)).toBe(false);
  });

  it('presence key has a TTL', async () => {
    const userId = 'presence-ttl-user';
    await setOnline(userId);

    const redis = await getRedis();
    const ttl = await redis.ttl(`presence:${userId}`);
    // Default TTL is 120 seconds
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(120);
  });

  it('TTL expires correctly (short TTL test)', async () => {
    const redis = await getRedis();
    const userId = 'presence-expire-user';

    // Set directly with a very short TTL (500ms) to test expiry
    await redis.set(`presence:${userId}`, 'online', 'PX', 500);
    expect(await isOnline(userId)).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(await isOnline(userId)).toBe(false);
  });
});

// ─── Leaderboard ───────────────────────────────────────────────────

describe('Redis Leaderboard', () => {
  it('updateReputation + getTopUsers returns ordered results', async () => {
    await updateReputation('user-a', 100);
    await updateReputation('user-b', 300);
    await updateReputation('user-c', 200);

    const top = await getTopUsers(10);

    expect(top.length).toBe(3);
    expect(top[0]!.userId).toBe('user-b');
    expect(top[0]!.score).toBe(300);
    expect(top[0]!.rank).toBe(1);
    expect(top[1]!.userId).toBe('user-c');
    expect(top[1]!.score).toBe(200);
    expect(top[1]!.rank).toBe(2);
    expect(top[2]!.userId).toBe('user-a');
    expect(top[2]!.score).toBe(100);
    expect(top[2]!.rank).toBe(3);
  });

  it('getTopUsers respects limit', async () => {
    await updateReputation('lb-1', 10);
    await updateReputation('lb-2', 20);
    await updateReputation('lb-3', 30);
    await updateReputation('lb-4', 40);

    const top2 = await getTopUsers(2);
    expect(top2.length).toBe(2);
    expect(top2[0]!.userId).toBe('lb-4');
    expect(top2[1]!.userId).toBe('lb-3');
  });

  it('getUserRank returns correct rank', async () => {
    await updateReputation('rank-a', 50);
    await updateReputation('rank-b', 150);
    await updateReputation('rank-c', 100);

    const rankB = await getUserRank('rank-b');
    expect(rankB).not.toBeNull();
    expect(rankB!.rank).toBe(1);
    expect(rankB!.score).toBe(150);

    const rankC = await getUserRank('rank-c');
    expect(rankC).not.toBeNull();
    expect(rankC!.rank).toBe(2);

    const rankA = await getUserRank('rank-a');
    expect(rankA).not.toBeNull();
    expect(rankA!.rank).toBe(3);
  });

  it('getUserRank returns null for unknown user', async () => {
    const result = await getUserRank('nonexistent-user');
    expect(result).toBeNull();
  });
});

// ─── Counter (incr / getdel) ───────────────────────────────────────

describe('Redis Counter', () => {
  it('incr/getdel cycle for sync', async () => {
    const redis = await getRedis();
    const key = 'counter:test:sync';

    // Increment several times
    await redis.incr(key);
    await redis.incr(key);
    await redis.incr(key);

    // Read current value
    const value = await redis.get(key);
    expect(value).toBe('3');

    // getdel: read and delete atomically
    const consumed = await redis.getdel(key);
    expect(consumed).toBe('3');

    // Key should be gone
    const after = await redis.get(key);
    expect(after).toBeNull();
  });
});
