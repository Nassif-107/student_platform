import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { dbPluginRegistered as dbPlugin } from './plugins/db.plugin.js';
import { authPluginRegistered as authPlugin } from './plugins/auth.plugin.js';
import { globalErrorHandler } from './middleware/error-handler.js';
import { setupSocket } from './config/socket.js';
import { startCounterSync, stopCounterSync } from './jobs/sync-counters.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { coursesRoutes } from './modules/courses/courses.routes.js';
import { professorsRoutes } from './modules/professors/professors.routes.js';
import { materialsRoutes } from './modules/materials/materials.routes.js';
import { reviewsRoutes } from './modules/reviews/reviews.routes.js';
import { forumRoutes } from './modules/forum/forum.routes.js';
import { groupsRoutes } from './modules/groups/groups.routes.js';
import { socialRoutes } from './modules/social/social.routes.js';
import { deadlinesRoutes } from './modules/deadlines/deadlines.routes.js';
import { marketplaceRoutes } from './modules/marketplace/marketplace.routes.js';
import { eventsRoutes } from './modules/events/events.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    trustProxy: true,
  });

  // --- Global error handler ---
  app.setErrorHandler(globalErrorHandler);

  // --- Core plugins ---
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    },
  });

  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_FILE_SIZE,
      files: 5,
    },
  });

  // --- Rate limiting (Redis-backed, per-route granularity) ---
  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
    keyGenerator: (request) => request.ip,
  });

  // Stricter limits applied per-route via route config:
  // Auth endpoints: 10 req/min (brute-force protection)
  // File uploads: 10 req/min (resource protection)
  // Search: 30 req/min (prevent abuse)
  // All others: inherit global 200/min

  // --- Database connections ---
  await app.register(dbPlugin);

  // --- Auth plugin ---
  await app.register(authPlugin);

  // --- Health check ---
  app.get('/health', async () => {
    const checks: Record<string, string> = {};

    // MongoDB
    try {
      const mongoState = (await import('mongoose')).default.connection.readyState;
      checks.mongodb = mongoState === 1 ? 'ok' : 'disconnected';
    } catch {
      checks.mongodb = 'error';
    }

    // Redis
    try {
      const redis = app.redis;
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    // Neo4j
    try {
      await app.neo4jDriver.getServerInfo();
      checks.neo4j = 'ok';
    } catch {
      checks.neo4j = 'error';
    }

    // InfluxDB — write API existence check (no ping method)
    checks.influxdb = app.influxWrite ? 'ok' : 'not_initialized';

    const allOk = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      databases: checks,
    };
  });

  // --- Module routes ---
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(coursesRoutes, { prefix: '/api/courses' });
  await app.register(professorsRoutes, { prefix: '/api/professors' });
  await app.register(materialsRoutes, { prefix: '/api/materials' });
  await app.register(reviewsRoutes, { prefix: '/api/reviews' });
  await app.register(forumRoutes, { prefix: '/api/forum' });
  await app.register(groupsRoutes, { prefix: '/api/groups' });
  await app.register(socialRoutes, { prefix: '/api/social' });
  await app.register(deadlinesRoutes, { prefix: '/api/deadlines' });
  await app.register(marketplaceRoutes, { prefix: '/api/marketplace' });
  await app.register(eventsRoutes, { prefix: '/api/events' });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(searchRoutes, { prefix: '/api/search' });

  // --- Socket.io ---
  // Socket.io is set up after the app is ready and the underlying HTTP server exists.
  app.addHook('onReady', async () => {
    try {
      const httpServer = app.server;
      setupSocket(httpServer);
      app.log.info('Socket.io attached to HTTP server');
    } catch (err) {
      app.log.error(err, 'Failed to initialize Socket.io — real-time features disabled');
    }

    // Start background jobs
    startCounterSync();
  });

  // Stop background jobs on shutdown
  app.addHook('onClose', async () => {
    stopCounterSync();
  });

  return app;
}
