import { Point } from '@influxdata/influxdb-client';
import { getInfluxWriteApi } from '../config/influx.js';
import { logger } from './logger.js';

/**
 * Non-blocking activity tracking via InfluxDB.
 * Errors are logged but never thrown — analytics failures must not break application logic.
 */
export function trackActivity(
  measurement: string,
  tags: Record<string, string>,
  fields: Record<string, string | number | boolean>
): void {
  try {
    const writeApi = getInfluxWriteApi();
    const point = new Point(measurement);

    for (const [key, value] of Object.entries(tags)) {
      point.tag(key, value);
    }

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'string') {
        point.stringField(key, value);
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          point.intField(key, value);
        } else {
          point.floatField(key, value);
        }
      } else if (typeof value === 'boolean') {
        point.booleanField(key, value);
      }
    }

    writeApi.writePoint(point);
  } catch (err) {
    logger.error(err, '[InfluxWriter] Failed to track activity');
  }
}
