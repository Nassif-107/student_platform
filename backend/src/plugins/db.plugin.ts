import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { Driver } from 'neo4j-driver';
import type { WriteApi, QueryApi } from '@influxdata/influxdb-client';
import type { Redis } from 'ioredis';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { getNeo4jDriver, verifyNeo4j, closeNeo4j } from '../config/neo4j.js';
import { getInfluxWriteApi, getInfluxQueryApi, closeInflux } from '../config/influx.js';
import { getRedis, closeRedis } from '../config/redis.js';

declare module 'fastify' {
  interface FastifyInstance {
    neo4jDriver: Driver;
    redis: Redis;
    influxWrite: WriteApi;
    influxQuery: QueryApi;
  }
}

async function dbPlugin(fastify: FastifyInstance): Promise<void> {
  // Connect MongoDB
  await connectMongo();
  fastify.log.info('MongoDB connected');

  // Connect Neo4j
  const neo4jDriver = getNeo4jDriver();
  await verifyNeo4j();
  fastify.decorate('neo4jDriver', neo4jDriver);
  fastify.log.info('Neo4j connected');

  // Initialize InfluxDB APIs
  const influxWrite = getInfluxWriteApi();
  const influxQuery = getInfluxQueryApi();
  fastify.decorate('influxWrite', influxWrite);
  fastify.decorate('influxQuery', influxQuery);
  fastify.log.info('InfluxDB initialized');

  // Connect Redis
  const redis = await getRedis();
  fastify.decorate('redis', redis);
  fastify.log.info('Redis connected');

  // Graceful shutdown hook
  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing all database connections...');
    await Promise.allSettled([
      disconnectMongo(),
      closeNeo4j(),
      closeInflux(),
      closeRedis(),
    ]);
    fastify.log.info('All database connections closed');
  });
}

export const dbPluginRegistered = fp(dbPlugin, {
  name: 'db-plugin',
});
