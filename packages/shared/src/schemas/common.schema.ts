import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const idParamSchema = z.object({
  id: z.string().min(1),
})

export const searchSchema = z.object({
  search: z.string().max(200).optional(),
})

export type PaginationInput = z.infer<typeof paginationSchema>
export type IdParamInput = z.infer<typeof idParamSchema>
export type SearchInput = z.infer<typeof searchSchema>
