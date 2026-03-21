/**
 * InfluxDB connectivity and write/query tests.
 * Verifies that we can write points, query them back with Flux,
 * use aggregateWindow, and that tags/fields are handled correctly.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Point } from '@influxdata/influxdb-client';
import { getInfluxWriteApi, getInfluxQueryApi } from '../../src/config/influx.js';
import { env } from '../../src/config/env.js';

/** Unique suffix to isolate data from parallel runs. */
const RUN_ID = `test-${Date.now()}`;

/** Flush writes and give InfluxDB a moment to index. */
async function flushAndWait(): Promise<void> {
  const writeApi = getInfluxWriteApi();
  await writeApi.flush();
  // InfluxDB needs a brief moment to make flushed data queryable
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

/** Collect rows from a Flux query. */
async function queryRows(flux: string): Promise<Record<string, unknown>[]> {
  const queryApi = getInfluxQueryApi();
  const rows: Record<string, unknown>[] = [];
  await new Promise<void>((resolve, reject) => {
    queryApi.queryRows(flux, {
      next(row, meta) {
        rows.push(meta.toObject(row));
      },
      error: reject,
      complete: resolve,
    });
  });
  return rows;
}

describe('InfluxDB', () => {
  it('can write a point (user_activity measurement)', async () => {
    const writeApi = getInfluxWriteApi();
    const point = new Point('user_activity')
      .tag('action', 'login')
      .tag('university', 'КубГТУ')
      .tag('runId', RUN_ID)
      .intField('count', 1)
      .stringField('userId', 'user-influx-write');

    writeApi.writePoint(point);
    await writeApi.flush();
    // If flush does not throw, the write was accepted
    expect(true).toBe(true);
  });

  it('can query data back with Flux (range + filter)', async () => {
    const writeApi = getInfluxWriteApi();
    const point = new Point('user_activity')
      .tag('action', 'test_query')
      .tag('runId', RUN_ID)
      .intField('count', 42);

    writeApi.writePoint(point);
    await flushAndWait();

    const flux = `
      from(bucket: "${env.INFLUX_BUCKET}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "user_activity")
        |> filter(fn: (r) => r.action == "test_query")
        |> filter(fn: (r) => r.runId == "${RUN_ID}")
        |> filter(fn: (r) => r._field == "count")
    `;

    const rows = await queryRows(flux);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r._value === 42)).toBe(true);
  });

  it('aggregateWindow works (group by 1m)', async () => {
    const writeApi = getInfluxWriteApi();

    // Write several points
    for (let i = 0; i < 3; i++) {
      const point = new Point('user_activity')
        .tag('action', 'agg_test')
        .tag('runId', RUN_ID)
        .intField('count', 1);
      writeApi.writePoint(point);
    }

    await flushAndWait();

    const flux = `
      from(bucket: "${env.INFLUX_BUCKET}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "user_activity")
        |> filter(fn: (r) => r.action == "agg_test")
        |> filter(fn: (r) => r.runId == "${RUN_ID}")
        |> filter(fn: (r) => r._field == "count")
        |> aggregateWindow(every: 1m, fn: sum, createEmpty: false)
    `;

    const rows = await queryRows(flux);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // Sum of 3 points with count=1 each
    const total = rows.reduce((acc, r) => acc + (Number(r._value) || 0), 0);
    expect(total).toBeGreaterThanOrEqual(3);
  });

  it('tags vs fields are correct (low cardinality tags, high cardinality fields)', async () => {
    const writeApi = getInfluxWriteApi();

    const point = new Point('user_activity')
      .tag('action', 'tags_check')
      .tag('university', 'КубГТУ')
      .tag('faculty', 'ИКС')
      .tag('runId', RUN_ID)
      .intField('count', 1)
      .stringField('userId', 'user-highcard');

    writeApi.writePoint(point);
    await flushAndWait();

    const flux = `
      from(bucket: "${env.INFLUX_BUCKET}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "user_activity")
        |> filter(fn: (r) => r.action == "tags_check")
        |> filter(fn: (r) => r.runId == "${RUN_ID}")
    `;

    const rows = await queryRows(flux);
    expect(rows.length).toBeGreaterThanOrEqual(1);

    // Tags are available as top-level properties in row objects
    const row = rows[0]!;
    expect(row.action).toBe('tags_check');
    expect(row.university).toBe('КубГТУ');
    expect(row.faculty).toBe('ИКС');
  });

  it('batch write flushes correctly', async () => {
    const writeApi = getInfluxWriteApi();
    const batchSize = 5;

    for (let i = 0; i < batchSize; i++) {
      const point = new Point('user_activity')
        .tag('action', 'batch_test')
        .tag('runId', RUN_ID)
        .intField('count', 1)
        .stringField('batchIdx', String(i));
      writeApi.writePoint(point);
    }

    await flushAndWait();

    const flux = `
      from(bucket: "${env.INFLUX_BUCKET}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "user_activity")
        |> filter(fn: (r) => r.action == "batch_test")
        |> filter(fn: (r) => r.runId == "${RUN_ID}")
        |> filter(fn: (r) => r._field == "count")
    `;

    const rows = await queryRows(flux);
    expect(rows.length).toBeGreaterThanOrEqual(batchSize);
  });

  it('non-blocking: write errors do not throw synchronously', () => {
    // trackActivity-style: writing a point should not throw even with
    // potentially bad data — errors are deferred to flush.
    const writeApi = getInfluxWriteApi();
    const point = new Point('user_activity')
      .tag('action', 'nonblocking')
      .intField('count', 1);

    // This should not throw
    expect(() => writeApi.writePoint(point)).not.toThrow();
  });
});
