import { z } from 'zod'
import { DEADLINE_TYPES } from '../constants/deadline-types.js'

const deadlineTypeValues = Object.values(DEADLINE_TYPES) as [string, ...string[]]

export const createDeadlineSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(3).max(200).trim(),
  type: z.enum(deadlineTypeValues),
  description: z.string().max(1000).trim().optional(),
  dueDate: z.string().datetime({ message: 'Дата должна быть в формате ISO 8601' }),
})

export type CreateDeadlineInput = z.infer<typeof createDeadlineSchema>
