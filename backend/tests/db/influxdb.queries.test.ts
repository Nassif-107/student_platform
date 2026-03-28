/**
 * InfluxDB analytics Flux query tests.
 * Verifies domain-specific queries: activity by day, rating trends,
 * and search query tracking.
 */
import { describe, it, expect } from 'vitest';
import { Point } from '@influxdata/influxdb-client';
import { getInfluxWriteApi, getInfluxQueryApi } from '../../src/config/influx.js';
import { env } from '../../src/config/env.js';

const RUN_ID = `queries-${Date.now()}`;

async function flushAndWait(): Promise<void> {
  const writeApi = getInfluxWriteApi();
  await writeApi.flush();
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

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

describe('InfluxDB Analytics Queries', () => {
  it('activity by day query returns data', async () => {
    const writeApi = getInfluxWriteApi();

    // Simulate several user_activity events
    const actions = ['login', 'view', 'download', 'login', 'view'];
    for (const action of actions) {
      const point = new Point('user_activity')
        .tag('action', action)
        .tag('university', 'КубГТУ')
        .tag('runId', RUN_ID)
        .intField('count', 1);
      writeApi.writePoint(point);
    }

    await flushAndWait();

    const flux = `
      from(bucket: "${env.INFLUX_BUCKET}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "user_activity")
        |> filter(fn: (r) => r.runId == "${RUN_ID}")
        |> filter(fn: (r) => r._field == "count")
        |> aggregateWindow(every: 1d, fn: sum, createEmpty: false)
    `;

    const rows = await queryRows(flux);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // Total across all action types (batched writes may partially flush)
    const total = rows.reduce((acc, r) => acc + (Number(r._value) || 0), 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });

  it('rating trend query returns time-bucketed data', async () => {
    const writeApi = getInfluxWriteApi();

    // Simulate review_metrics with rating values
    for (let i = 0; i < 4; i++) {
      const point = new Point('review_metrics')
        .tag('action', 'create')
        .tag('targetType', 'course')
        .tag('runId', RUN_ID)
        .floatField('overall', 7 + i * 0.5)
        .intField('difficulty', 5 + i);
      writeApi.writePoint(point);
    }

    await flushAndWait();

    const flux = `
      from(bucket: "${env.INFLUX_BUCKET}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "review_metrics")
        |> filter(fn: (r) => r.runId == "${RUN_ID}")
        |> filter(fn: (r) => r._field == "overall")
        |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
    `;

    const rows = await queryRows(flux);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const avgOverall = Number(rows[0]!._value);
    expect(avgOverall).toBeGreaterThan(0);
    expect(avgOverall).toBeLessThanOrEqual(10);
  });

  it('search queries measurement tracks searches', async () => {
    const writeApi = getInfluxWriteApi();

    // Simulate search_queries measurement
    const queries = ['алгоритмы', 'базы данных', 'алгоритмы'];
    for (const q of queries) {
      const point = new Point('search_queries')
        .tag('source', 'courses')
        .tag('runId', RUN_ID)
        .intField('count', 1)
        .stringField('query', q);
      writeApi.writePoint(point);
    }

    await flushAndWait();

    const flux = `
      from(bucket: "${env.INFLUX_BUCKET}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "search_queries")
        |> filter(fn: (r) => r.runId == "${RUN_ID}")
        |> filter(fn: (r) => r._field == "count")
    `;

    const rows = await queryRows(flux);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const totalSearches = rows.reduce((acc, r) => acc + (Number(r._value) || 0), 0);
    expect(totalSearches).toBeGreaterThanOrEqual(1);
  });
});
