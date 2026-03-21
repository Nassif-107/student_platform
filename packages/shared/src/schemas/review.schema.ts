import { z } from 'zod';
import { REVIEW_TARGETS } from '../constants/review-targets.js';

const reviewTargetValues = Object.values(REVIEW_TARGETS) as [string, ...string[]];

export const reviewQuerySchema = z.object({
  targetType: z.enum(reviewTargetValues).optional(),
  targetId: z.string().min(1).optional(),
  authorId: z.string().min(1).optional(),
  sort: z.enum(['newest', 'helpful']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;

export const createReviewSchema = z.object({
  targetType: z.enum(reviewTargetValues),
  targetId: z.string().min(1),
  targetName: z.string().min(1),
  ratings: z.object({
    /** 1-10 scale */
    overall: z.number().min(1).max(10),
    /** 1-10 scale */
    difficulty: z.number().min(1).max(10),
    /** 1-10 scale */
    usefulness: z.number().min(1).max(10).optional(),
    /** 1-10 scale */
    interest: z.number().min(1).max(10).optional(),
  }),
  text: z.string().min(10, 'Минимум 10 символов').max(2000),
  semester: z.string().min(1),
  anonymous: z.boolean().default(false),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const reviewIdParamSchema = z.object({
  id: z.string().min(1),
});

export type ReviewIdParam = z.infer<typeof reviewIdParamSchema>;
