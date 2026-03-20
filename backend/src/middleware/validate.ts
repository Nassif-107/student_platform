import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema } from 'zod';
import { formatZodErrors, type ValidationErrorDetail } from '../utils/format-errors.js';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
  querystring?: ZodSchema;
}

export function validate(schemas: ValidationSchemas) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const errors: ValidationErrorDetail[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(request.body);
      if (result.success) {
        request.body = result.data;
      } else {
        errors.push(
          ...formatZodErrors(result.error).map((e) => ({
            ...e,
            field: `body.${e.field}`,
          }))
        );
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(request.params);
      if (result.success) {
        (request.params as unknown) = result.data;
      } else {
        errors.push(
          ...formatZodErrors(result.error).map((e) => ({
            ...e,
            field: `params.${e.field}`,
          }))
        );
      }
    }

    const querySchema = schemas.query ?? schemas.querystring;
    if (querySchema) {
      const result = querySchema.safeParse(request.query);
      if (result.success) {
        (request.query as unknown) = result.data;
      } else {
        errors.push(
          ...formatZodErrors(result.error).map((e) => ({
            ...e,
            field: `query.${e.field}`,
          }))
        );
      }
    }

    if (errors.length > 0) {
      reply.code(422).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ошибка валидации запроса',
          details: errors,
        },
      });
    }
  };
}
