/**
 * Unit + integration tests for cache utilities.
 * Pure functions (buildCacheKey) are tested without DB.
 * Async functions (getCache, setCache, deleteCache, deleteCachePattern)
 * require a running Redis — they are tested in the same file since
 * the global setup connects to Redis before any tests run.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCacheKey,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
} from '../../src/utils/cache.js';
import { cleanRedis } from '../helpers.js';

// ── buildCacheKey (pure function) ──────────────────────────────────

describe('buildCacheKey', () => {
  it('builds a simple key from string segments', () => {
    const key = buildCacheKey('user', '123');
    expect(key).toBe('app:cache:user:123');
  });

  it('produces a deterministic key with object segment', () => {
    const key = buildCacheKey('course', 'list', { page: 1, faculty: 'IT' });
    expect(key).toBe('app:cache:course:list:{"faculty":"IT","page":1}');
  });

  it('produces the same key regardless of object key order', () => {
    const key1 = buildCacheKey('course', 'list', { faculty: 'IT', page: 1 });
    const key2 = buildCacheKey('course', 'list', { page: 1, faculty: 'IT' });
    expect(key1).toBe(key2);
  });

  it('ignores null and undefined values in object segments', () => {
    const keyWithNulls = buildCacheKey('items', {
      page: 1,
      filter: null as unknown as string,
      search: undefined as unknown as string,
    });
    const keyClean = buildCacheKey('items', { page: 1 });
    expect(keyWithNulls).toBe(keyClean);
  });
});

// ── Async cache operations (require Redis) ─────────────────────────

describe('cache operations (Redis)', () => {
  beforeEach(cleanRedis);

  it('getCache returns null for a missing key', async () => {
    const result = await getCache('app:cache:nonexistent:key');
    expect(result).toBeNull();
  });

  it('setCache + getCache round-trip works', async () => {
    const key = 'app:cache:test:roundtrip';
    const data = { id: 1, name: 'Тест' };

    await setCache(key, data, 60);
    const result = await getCache<typeof data>(key);

    expect(result).toEqual(data);
  });

  it('deleteCache removes the key', async () => {
    const key = 'app:cache:test:delete';
    await setCache(key, { value: 42 }, 60);

    await deleteCache(key);

    const result = await getCache(key);
    expect(result).toBeNull();
  });

  it('deleteCachePattern removes matching keys', async () => {
    // Set several keys with a common prefix
    await setCache('app:cache:materials:list:page1', { items: [] }, 60);
    await setCache('app:cache:materials:list:page2', { items: [] }, 60);
    await setCache('app:cache:materials:detail:abc', { item: {} }, 60);
    await setCache('app:cache:users:list', { users: [] }, 60);

    const deleted = await deleteCachePattern('app:cache:materials:*');

    expect(deleted).toBe(3);

    // The non-matching key should still exist
    const users = await getCache('app:cache:users:list');
    expect(users).not.toBeNull();

    // The matching keys should be gone
    const mat1 = await getCache('app:cache:materials:list:page1');
    expect(mat1).toBeNull();
  });
});
