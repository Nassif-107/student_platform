/**
 * Global test setup — runs before each test file in the single fork.
 * Uses guards to only connect/register once.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import mongoose from 'mongoose';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { connectMongo, disconnectMongo } from '../src/config/mongo.js';
import { verifyNeo4j, closeNeo4j } from '../src/config/neo4j.js';
import { getRedis, closeRedis } from '../src/config/redis.js';
import { closeInflux } from '../src/config/influx.js';

let initialized = false;

beforeAll(async () => {
  if (initialized) return;
  initialized = true;

  if (mongoose.connection.readyState === 0) {
    await connectMongo();
  }

  // Register models safely — skip already-registered
  const models: [string, string][] = [
    ['User', '../src/modules/users/users.model.js'],
    ['Course', '../src/modules/courses/courses.model.js'],
    ['Professor', '../src/modules/professors/professors.model.js'],
    ['Material', '../src/modules/materials/materials.model.js'],
    ['Comment', '../src/modules/materials/comments.model.js'],
    ['Review', '../src/modules/reviews/reviews.model.js'],
    ['Question', '../src/modules/forum/forum.model.js'],
    ['Group', '../src/modules/groups/groups.model.js'],
    ['Deadline', '../src/modules/deadlines/deadlines.model.js'],
    ['Listing', '../src/modules/marketplace/marketplace.model.js'],
    ['Event', '../src/modules/events/events.model.js'],
    ['Notification', '../src/modules/notifications/notifications.model.js'],
  ];

  const registered = new Set(mongoose.modelNames());
  for (const [name, path] of models) {
    if (!registered.has(name)) {
      await import(path);
    }
  }

  await verifyNeo4j();
  await getRedis();
});

afterAll(async () => {
  await disconnectMongo();
  await closeNeo4j();
  await closeRedis();
  await closeInflux();
});
