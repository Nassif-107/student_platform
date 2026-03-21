/**
 * Redis connectivity and data structure tests.
 * Verifies PING, STRING with TTL, LIST with LTRIM, SORTED SET ordering,
 * pipeline execution, and UNLINK.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getRedis } from '../../src/config/redis.js';
import { cleanRedis } from '../helpers.js';

beforeEach(cleanRedis);

describe('Redis', () => {
  it('connection works (PING returns PONG)', async () => {
    const redis = await getRedis();
    const result = await redis.ping();
    expect(result).toBe('PONG');
  });

  it('STRING: set/get with TTL works', async () => {
    const redis = await getRedis();
    await redis.set('test:string', 'hello', 'EX', 60);

    const value = await redis.get('test:string');
    expect(value).toBe('hello');

    const ttl = await redis.ttl('test:string');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('STRING: expires after TTL', async () => {
    const redis = await getRedis();
    // Set with 1-second TTL
    await redis.set('test:expire', 'temp', 'PX', 500);

    const before = await redis.get('test:expire');
    expect(before).toBe('temp');

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 600));

    const after = await redis.get('test:expire');
    expect(after).toBeNull();
  });

  it('LIST: LPUSH + LTRIM caps list length', async () => {
    const redis = await getRedis();
    const key = 'test:list';
    const maxLen = 3;

    // Push 5 items, trim to 3 after each push
    for (let i = 1; i <= 5; i++) {
      await redis.lpush(key, `item-${i}`);
      await redis.ltrim(key, 0, maxLen - 1);
    }

    const items = await redis.lrange(key, 0, -1);
    expect(items).toHaveLength(maxLen);
    // Most recent items should be at the front
    expect(items[0]).toBe('item-5');
    expect(items[1]).toBe('item-4');
    expect(items[2]).toBe('item-3');
  });

  it('SORTED SET: ZADD + ZREVRANGE returns correct order', async () => {
    const redis = await getRedis();
    const key = 'test:zset';

    await redis.zadd(key, 100, 'alice');
    await redis.zadd(key, 200, 'bob');
    await redis.zadd(key, 150, 'charlie');

    // ZREVRANGE returns highest score first
    const topDown = await redis.zrevrange(key, 0, -1, 'WITHSCORES');
    // Result: ['bob', '200', 'charlie', '150', 'alice', '100']
    expect(topDown[0]).toBe('bob');
    expect(topDown[1]).toBe('200');
    expect(topDown[2]).toBe('charlie');
    expect(topDown[3]).toBe('150');
    expect(topDown[4]).toBe('alice');
    expect(topDown[5]).toBe('100');
  });

  it('pipeline executes multiple commands', async () => {
    const redis = await getRedis();
    const pipeline = redis.pipeline();

    pipeline.set('pipe:a', 'val-a');
    pipeline.set('pipe:b', 'val-b');
    pipeline.get('pipe:a');
    pipeline.get('pipe:b');

    const results = await pipeline.exec();
    expect(results).not.toBeNull();
    expect(results).toHaveLength(4);

    // Pipeline results are [error, value] tuples
    const [, getA] = results![2]!;
    const [, getB] = results![3]!;
    expect(getA).toBe('val-a');
    expect(getB).toBe('val-b');
  });

  it('UNLINK deletes key asynchronously', async () => {
    const redis = await getRedis();
    await redis.set('test:unlink', 'goodbye');

    const before = await redis.get('test:unlink');
    expect(before).toBe('goodbye');

    const deleted = await redis.unlink('test:unlink');
    expect(deleted).toBe(1);

    const after = await redis.get('test:unlink');
    expect(after).toBeNull();
  });
});
