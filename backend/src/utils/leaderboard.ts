import { getRedis } from '../config/redis.js';
import { logger } from './logger.js';

const REPUTATION_KEY = 'leaderboard:reputation';
const WEEKLY_KEY = 'leaderboard:weekly';
const WEEKLY_TTL = 604800; // 7 days

export interface LeaderboardEntry {
  userId: string;
  score: number;
  rank: number;
}

/**
 * Update a user's reputation score in the leaderboard.
 */
export async function updateReputation(userId: string, score: number): Promise<void> {
  try {
    const redis = await getRedis();
    const pipeline = redis.pipeline();
    pipeline.zadd(REPUTATION_KEY, score, userId);
    pipeline.zadd(WEEKLY_KEY, score, userId);
    pipeline.expire(WEEKLY_KEY, WEEKLY_TTL);
    await pipeline.exec();
  } catch (err) {
    logger.error(err, '[Leaderboard] Failed to update reputation');
  }
}

/**
 * Increment a user's reputation score by delta.
 */
export async function incrementReputation(userId: string, delta: number): Promise<void> {
  try {
    const redis = await getRedis();
    const pipeline = redis.pipeline();
    pipeline.zincrby(REPUTATION_KEY, delta, userId);
    pipeline.zincrby(WEEKLY_KEY, delta, userId);
    pipeline.expire(WEEKLY_KEY, WEEKLY_TTL);
    await pipeline.exec();
  } catch (err) {
    logger.error(err, '[Leaderboard] Failed to increment reputation');
  }
}

/**
 * Get top N users from the all-time leaderboard.
 */
export async function getTopUsers(limit = 10): Promise<LeaderboardEntry[]> {
  try {
    const redis = await getRedis();
    const results = await redis.zrevrange(REPUTATION_KEY, 0, limit - 1, 'WITHSCORES');

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({
        userId: results[i]!,
        score: parseFloat(results[i + 1]!),
        rank: Math.floor(i / 2) + 1,
      });
    }
    return entries;
  } catch (err) {
    logger.error(err, '[Leaderboard] Failed to get top users');
    return [];
  }
}

/**
 * Get a user's rank and score.
 */
export async function getUserRank(userId: string): Promise<{ rank: number; score: number } | null> {
  try {
    const redis = await getRedis();
    const [rank, score] = await Promise.all([
      redis.zrevrank(REPUTATION_KEY, userId),
      redis.zscore(REPUTATION_KEY, userId),
    ]);

    if (rank === null || score === null) return null;

    return { rank: rank + 1, score: parseFloat(score) };
  } catch (err) {
    logger.error(err, '[Leaderboard] Failed to get user rank');
    return null;
  }
}
