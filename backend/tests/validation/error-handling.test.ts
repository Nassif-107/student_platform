/**
 * Tests for the global error handler.
 * Verifies that different error types produce the correct HTTP status codes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getApp, cleanAll } from '../helpers.js';
import { ServiceError } from '../../src/utils/service-error.js';
import { ZodError, type ZodIssue } from 'zod';
import mongoose from 'mongoose';

beforeEach(cleanAll);

describe('Global error handler', () => {
  it('ServiceError with NOT_FOUND code returns 404', async () => {
    const app = await getApp();

    // Register a temporary route that throws a ServiceError
    app.get('/test-error/not-found', async () => {
      throw new ServiceError('Ресурс не найден', 'NOT_FOUND');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/test-error/not-found',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('ServiceError with FORBIDDEN code returns 403', async () => {
    const app = await getApp();

    app.get('/test-error/forbidden', async () => {
      throw new ServiceError('Недостаточно прав', 'FORBIDDEN');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/test-error/forbidden',
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('ZodError returns 422', async () => {
    const app = await getApp();

    app.get('/test-error/zod', async () => {
      const issues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ];
      throw new ZodError(issues);
    });

    const res = await app.inject({
      method: 'GET',
      url: '/test-error/zod',
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Mongoose CastError returns 400', async () => {
    const app = await getApp();

    app.get('/test-error/cast', async () => {
      throw new mongoose.Error.CastError('ObjectId', 'not-a-valid-id', '_id');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/test-error/cast',
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_ID');
  });

  it('Duplicate key error (code 11000) returns 409', async () => {
    const app = await getApp();

    app.get('/test-error/duplicate', async () => {
      const err = new Error('E11000 duplicate key error') as Error & {
        code: number;
        statusCode?: number;
      };
      err.code = 11000;
      throw err;
    });

    const res = await app.inject({
      method: 'GET',
      url: '/test-error/duplicate',
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('DUPLICATE_KEY');
  });

  it('ServiceError with DUPLICATE code returns 409', async () => {
    const app = await getApp();

    app.get('/test-error/svc-duplicate', async () => {
      throw new ServiceError('Ресурс уже существует', 'DUPLICATE');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/test-error/svc-duplicate',
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('DUPLICATE');
  });

  it('ServiceError with BAD_REQUEST code returns 400', async () => {
    const app = await getApp();

    app.get('/test-error/bad-request', async () => {
      throw new ServiceError('Некорректный запрос', 'BAD_REQUEST');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/test-error/bad-request',
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('BAD_REQUEST');
  });
});
