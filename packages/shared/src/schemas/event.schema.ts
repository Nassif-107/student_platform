import { z } from 'zod'
import { EVENT_TYPES } from '../constants/event-types.js'
import { EVENT_STATUSES } from '../constants/event-statuses.js'

const eventTypeValues = Object.values(EVENT_TYPES) as [string, ...string[]]
const eventStatusValues = Object.values(EVENT_STATUSES) as [string, ...string[]]

export const createEventSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  type: z.enum(eventTypeValues),
  description: z.string().min(10).max(5000).trim(),
  location: z.string().min(1).max(200).trim(),
  date: z.string().datetime({ message: 'Дата должна быть в формате ISO 8601' }),
  time: z.string().min(1).max(10),
  maxParticipants: z.coerce.number().int().min(1).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export const eventQuerySchema = z.object({
  type: z.enum(eventTypeValues).optional(),
  university: z.string().optional(),
  search: z.string().max(200).optional(),
  status: z.enum(eventStatusValues).optional(),
  sort: z.enum(['date', 'newest', 'popular']).default('date'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type EventQueryInput = z.infer<typeof eventQuerySchema>
