import {
  InfluxDB,
  type WriteApi,
  type QueryApi,
} from '@influxdata/influxdb-client';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * InfluxDB Configuration
 *
 * Measurements:
 *   - user_activity: login, register, enroll, logout (tags: university, faculty, action)
 *   - material_activity: create, view, download (tags: action, type)
 *   - forum_activity: create_question, create_answer, view_question (tags: action)
 *   - review_metrics: create (tags: action, targetType; fields: overall, difficulty)
 *   - deadline_activity: create, confirm (tags: action)
 *
 * Retention: Configure via InfluxDB UI or CLI:
 *   influx bucket update --name metrics --retention 90d
 *
 * Downsampling: Configure via InfluxDB task:
 *   option task = { name: "downsample_daily", every: 1h }
 *   from(bucket: "metrics")
 *     |> range(start: -2h)
 *     |> aggregateWindow(every: 1d, fn: count)
 *     |> to(bucket: "metrics_downsampled")
 */

let client: InfluxDB | null = null;
let writeApi: WriteApi | null = null;
let queryApi: QueryApi | null = null;

function getClient(): InfluxDB {
  if (!client) {
    client = new InfluxDB({
      url: env.INFLUX_URL,
      token: env.INFLUX_TOKEN,
    });
    logger.info('[InfluxDB] Client created');
  }
  return client;
}

export function getInfluxWriteApi(): WriteApi {
  if (!writeApi) {
    writeApi = getClient().getWriteApi(env.INFLUX_ORG, env.INFLUX_BUCKET, 's', {
      batchSize: 100,
      flushInterval: 5000,
      maxRetries: 3,
      retryJitter: 200,
    });
    logger.info('[InfluxDB] Write API initialized');
  }
  return writeApi;
}

export function getInfluxQueryApi(): QueryApi {
  if (!queryApi) {
    queryApi = getClient().getQueryApi(env.INFLUX_ORG);
    logger.info('[InfluxDB] Query API initialized');
  }
  return queryApi;
}

export async function closeInflux(): Promise<void> {
  if (writeApi) {
    try {
      await writeApi.close();
      logger.info('[InfluxDB] Write API closed, pending writes flushed');
    } catch (err) {
      logger.error(err, '[InfluxDB] Error closing write API');
    }
    writeApi = null;
  }
  queryApi = null;
  client = null;
}
