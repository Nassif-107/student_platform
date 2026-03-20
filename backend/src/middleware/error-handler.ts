import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { formatZodErrors } from '../utils/format-errors.js';
import { ServiceError } from '../utils/service-error.js';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function globalErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  request.log.error(
    { err: error, reqId: request.id },
    'Request error'
  );

  // Zod validation errors
  if (error instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации запроса',
        details: formatZodErrors(error),
      },
    };
    reply.code(422).send(response);
    return;
  }

  // Mongoose validation errors
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.entries(error.errors).map(([field, err]) => ({
      field,
      message: err.message,
      code: err.kind ?? 'validation',
    }));
    reply.code(422).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации данных',
        details,
      },
    });
    return;
  }

  // Mongoose cast errors (e.g. invalid ObjectId)
  if (error instanceof mongoose.Error.CastError) {
    reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Некорректное значение ${error.path}: ${error.value}`,
      },
    });
    return;
  }

  // ServiceError — typed business-logic errors from services
  if (error instanceof ServiceError || ('code' in error && error.name === 'ServiceError')) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404, FORBIDDEN: 403, DUPLICATE: 409,
      BAD_REQUEST: 400, UNAUTHORIZED: 401,
    };
    const status = statusMap[(error as any).code] ?? 400;
    reply.code(status).send({ success: false, error: { code: (error as any).code, message: error.message } });
    return;
  }

  // Fastify HTTP errors (created via fastify.httpErrors)
  if (error.statusCode && error.statusCode < 500) {
    reply.code(error.statusCode).send({
      success: false,
      error: {
        code: error.code ?? 'CLIENT_ERROR',
        message: error.message,
      },
    });
    return;
  }

  // MongoDB duplicate key error
  if ('code' in error && (error as unknown as Record<string, unknown>).code === 11000) {
    reply.code(409).send({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'Ресурс с таким уникальным значением уже существует',
      },
    });
    return;
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    reply.code(429).send({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Слишком много запросов. Попробуйте позже.',
      },
    });
    return;
  }

  // Generic server error - hide details in production
  const statusCode = error.statusCode ?? 500;
  reply.code(statusCode).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Произошла непредвиденная ошибка'
          : error.message,
    },
  });
}
