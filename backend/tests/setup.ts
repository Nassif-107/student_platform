/**
 * Global test setup — runs before all test files.
 * Connects to all 4 databases, cleans up after all tests.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { connectMongo, disconnectMongo } from '../src/config/mongo.js';
import { verifyNeo4j, closeNeo4j } from '../src/config/neo4j.js';
import { getRedis, closeRedis } from '../src/config/redis.js';
import { closeInflux } from '../src/config/influx.js';

// Import all models so they're registered
import '../src/modules/users/users.model.js';
import '../src/modules/courses/courses.model.js';
import '../src/modules/professors/professors.model.js';
import '../src/modules/materials/materials.model.js';
import '../src/modules/materials/comments.model.js';
import '../src/modules/reviews/reviews.model.js';
import '../src/modules/forum/forum.model.js';
import '../src/modules/groups/groups.model.js';
import '../src/modules/deadlines/deadlines.model.js';
import '../src/modules/marketplace/marketplace.model.js';
import '../src/modules/events/events.model.js';
import '../src/modules/notifications/notifications.model.js';

beforeAll(async () => {
  await connectMongo();
  await verifyNeo4j();
  await getRedis();
});

afterAll(async () => {
  await disconnectMongo();
  await closeNeo4j();
  await closeRedis();
  await closeInflux();
});
