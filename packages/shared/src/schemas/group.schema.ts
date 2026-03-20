import { z } from 'zod'
import { GROUP_TYPES } from '../constants/group-types.js'

const groupTypeValues = Object.values(GROUP_TYPES) as [string, ...string[]]

export const createGroupSchema = z.object({
  name: z.string().min(3).max(100).trim(),
  courseId: z.string().min(1),
  type: z.enum(groupTypeValues),
  description: z.string().max(500).trim(),
  maxMembers: z.coerce.number().int().min(2).max(10),
})

export const teamMatchSchema = z.object({
  courseId: z.string().min(1),
  skills: z.array(z.string().max(50)).max(10).optional(),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type TeamMatchInput = z.infer<typeof teamMatchSchema>
