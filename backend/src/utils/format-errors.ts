import type { ZodError } from 'zod';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * Format Zod validation errors into a flat array of field-level details.
 * Shared between the validate middleware and global error handler.
 */
export function formatZodErrors(error: ZodError): ValidationErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}
