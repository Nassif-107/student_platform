import { env } from '../config/env.js';

/**
 * Lightweight logger for config files and utilities that run outside Fastify request context.
 * Provides the same interface as Pino's basic methods.
 * Once inside request handlers, use request.log (Fastify's Pino) instead.
 */
const isDebug = env.NODE_ENV !== 'production';

function formatArg(a: unknown): string {
  if (typeof a === 'string') return a;
  if (a instanceof Error) return `${a.message}${a.stack ? '\n' + a.stack : ''}`;
  try {
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

function formatMsg(args: unknown[]): string {
  return args.map(formatArg).join(' ');
}

export const logger = {
  info(...args: unknown[]) {
    console.log(`[INFO] ${formatMsg(args)}`);
  },
  warn(...args: unknown[]) {
    console.warn(`[WARN] ${formatMsg(args)}`);
  },
  error(...args: unknown[]) {
    console.error(`[ERROR] ${formatMsg(args)}`);
  },
  debug(...args: unknown[]) {
    if (isDebug) {
      console.debug(`[DEBUG] ${formatMsg(args)}`);
    }
  },
};
