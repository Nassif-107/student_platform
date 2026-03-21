/**
 * Shared test helpers — reusable across all test files.
 */
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { runCypherWrite } from '../src/config/neo4j.js';
import { getRedis } from '../src/config/redis.js';

let app: FastifyInstance | null = null;

/** Get or build the Fastify app (singleton for test suite) */
export async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  return app;
}

/** Close the app after tests */
export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
}

/** Clean all MongoDB collections */
export async function cleanMongo(): Promise<void> {
  const collections = await mongoose.connection.db!.listCollections().toArray();
  for (const col of collections) {
    await mongoose.connection.db!.collection(col.name).deleteMany({});
  }
}

/** Clean all Neo4j nodes and relationships */
export async function cleanNeo4j(): Promise<void> {
  await runCypherWrite('MATCH (n) DETACH DELETE n');
}

/** Clean all Redis keys */
export async function cleanRedis(): Promise<void> {
  const redis = await getRedis();
  await redis.flushdb();
}

/** Clean all databases */
export async function cleanAll(): Promise<void> {
  await Promise.all([cleanMongo(), cleanNeo4j(), cleanRedis()]);
}

/** Register a test user and return tokens + user data */
export async function registerTestUser(
  app: FastifyInstance,
  overrides: Record<string, unknown> = {}
): Promise<{ user: Record<string, unknown>; accessToken: string; refreshToken: string }> {
  const body = {
    email: `test-${Date.now()}@university.ru`,
    password: 'testpassword123',
    firstName: 'Тест',
    lastName: 'Тестов',
    universityId: 'КубГТУ',
    faculty: 'Институт компьютерных систем',
    specialization: 'Прикладная информатика',
    year: 2,
    ...overrides,
  };

  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: body,
  });

  const data = JSON.parse(res.body);
  return {
    user: data.data.user,
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
  };
}

/** Make an authenticated request */
export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
