import mongoose from 'mongoose';
import { getRedis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * Background job: flushes Redis view/download counters to MongoDB.
 * Runs on a configurable interval (default: 60s).
 *
 * Redis keys:
 *   counter:material:{id}:views     → stats.views
 *   counter:material:{id}:downloads → stats.downloads
 */

const SYNC_INTERVAL_MS = 60_000; // 1 minute
let timer: ReturnType<typeof setInterval> | null = null;

async function syncMaterialCounters(): Promise<void> {
  try {
    const redis = await getRedis();

    // Scan for view counters
    let cursor = '0';
    let synced = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'counter:material:*', 'COUNT', 100);
      cursor = nextCursor;

      for (const key of keys) {
        const parts = key.split(':');
        // key format: counter:material:{id}:{type}
        if (parts.length !== 4) continue;

        const materialId = parts[2]!;
        const counterType = parts[3]!; // 'views' or 'downloads'

        if (counterType !== 'views' && counterType !== 'downloads') continue;

        // Atomically get and reset the counter
        const value = await redis.getdel(key);
        if (!value || value === '0') continue;

        const count = parseInt(value, 10);
        if (isNaN(count) || count <= 0) continue;

        const field = counterType === 'views' ? 'stats.views' : 'stats.downloads';
        await mongoose.model('Material').findByIdAndUpdate(materialId, {
          $inc: { [field]: count },
        });

        synced++;
      }
    } while (cursor !== '0');

    if (synced > 0) {
      logger.info(`[SyncCounters] Flushed ${synced} counter(s) to MongoDB`);
    }
  } catch (err) {
    logger.error(err, '[SyncCounters] Failed to sync counters');
  }
}

/**
 * Start the background counter sync job.
 */
export function startCounterSync(): void {
  if (timer) return;
  logger.info(`[SyncCounters] Starting counter sync every ${SYNC_INTERVAL_MS / 1000}s`);
  timer = setInterval(syncMaterialCounters, SYNC_INTERVAL_MS);
  // Run once immediately
  syncMaterialCounters();
}

/**
 * Stop the background counter sync job.
 */
export function stopCounterSync(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('[SyncCounters] Stopped counter sync');
  }
}
