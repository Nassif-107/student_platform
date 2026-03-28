import { z } from 'zod'

export const createQuestionSchema = z.object({
  title: z.string().min(5).max(200).trim(),
  body: z.string().min(10).max(5000).trim(),
  courseId: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export const updateQuestionSchema = createQuestionSchema.partial()

export const createAnswerSchema = z.object({
  body: z.string().min(5).max(5000).trim(),
})

export const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
})

export const acceptAnswerSchema = z.object({
  answerId: z.string().min(1),
})

export const questionQuerySchema = z.object({
  courseId: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().max(200).optional(),
  status: z.enum(['open', 'resolved']).optional(),
  sort: z.enum(['newest', 'votes', 'unanswered']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>
export type CreateAnswerInput = z.infer<typeof createAnswerSchema>
export type VoteInput = z.infer<typeof voteSchema>
export type AcceptAnswerInput = z.infer<typeof acceptAnswerSchema>
export type QuestionQueryInput = z.infer<typeof questionQuerySchema>
