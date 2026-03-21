import { z } from 'zod';
import { MATERIAL_TYPES } from '../constants/material-types.js';

const materialTypeValues = Object.values(MATERIAL_TYPES) as [string, ...string[]];

export const materialQuerySchema = z.object({
  courseId: z.string().optional(),
  type: z.enum(materialTypeValues).optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'popular', 'downloads', 'likes']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type MaterialQueryInput = z.infer<typeof materialQuerySchema>;

export const createMaterialSchema = z.object({
  title: z.string().min(3, 'Минимум 3 символа').max(200),
  courseId: z.string().min(1),
  courseTitle: z.string().min(1),
  courseCode: z.string().optional(),
  type: z.enum(materialTypeValues),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  semester: z.string().optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

export const materialIdParamSchema = z.object({
  id: z.string().min(1),
});

export type MaterialIdParam = z.infer<typeof materialIdParamSchema>;

export const addCommentSchema = z.object({
  text: z.string().min(1, 'Введите комментарий').max(1000),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;
