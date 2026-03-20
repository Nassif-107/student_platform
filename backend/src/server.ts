import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

import { env } from './config/env.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    app.log.info(
      `Server listening on http://${env.HOST}:${env.PORT} [${env.NODE_ENV}]`
    );
  } catch (err) {
    app.log.fatal(err, 'Failed to start server');
    process.exit(1);
  }

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections, close existing ones,
    // and trigger onClose hooks (which close all DB connections)
    try {
      await app.close();
      app.log.info('Server closed gracefully');
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle unhandled rejections
  process.on('unhandledRejection', (reason) => {
    app.log.error(reason, 'Unhandled rejection');
  });

  process.on('uncaughtException', (err) => {
    app.log.fatal(err, 'Uncaught exception');
    process.exit(1);
  });
}

main();
