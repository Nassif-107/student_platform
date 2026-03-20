import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

type RedisClient = Redis;

let redisClient: RedisClient | null = null;
let redisSubClient: RedisClient | null = null;

function createRedisInstance(name: string): RedisClient {
  const instance = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      logger.info(`[Redis:${name}] Reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  instance.on('connect', () => {
    logger.info(`[Redis:${name}] Connected`);
  });

  instance.on('error', (err: Error) => {
    logger.error(`[Redis:${name}] Error: ${err.message}`);
  });

  instance.on('close', () => {
    logger.info(`[Redis:${name}] Connection closed`);
  });

  return instance;
}

export async function getRedis(): Promise<RedisClient> {
  if (!redisClient) {
    redisClient = createRedisInstance('cmd');
    await redisClient.connect();
  }
  return redisClient;
}

export async function getRedisSub(): Promise<RedisClient> {
  if (!redisSubClient) {
    redisSubClient = createRedisInstance('sub');
    await redisSubClient.connect();
  }
  return redisSubClient;
}

export async function closeRedis(): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (redisClient) {
    tasks.push(
      redisClient.quit().then(() => {
        redisClient = null;
        logger.info('[Redis:cmd] Disconnected gracefully');
      })
    );
  }

  if (redisSubClient) {
    tasks.push(
      redisSubClient.quit().then(() => {
        redisSubClient = null;
        logger.info('[Redis:sub] Disconnected gracefully');
      })
    );
  }

  await Promise.all(tasks);
}
