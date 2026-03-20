import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectMongo(): Promise<typeof mongoose> {
  mongoose.connection.on('connected', () => {
    logger.info('[MongoDB] Connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(err, '[MongoDB] Connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.info('[MongoDB] Disconnected');
  });

  const connection = await mongoose.connect(env.MONGO_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    w: 'majority',
  });

  return connection;
}

export async function disconnectMongo(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('[MongoDB] Disconnected gracefully');
  } catch (err) {
    logger.error(err, '[MongoDB] Error during disconnect');
  }
}
