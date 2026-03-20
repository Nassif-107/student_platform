import { z } from 'zod'
import { LISTING_TYPES, CONDITION_TYPES } from '../constants/listing-types.js'

const listingTypeValues = Object.values(LISTING_TYPES) as [string, ...string[]]
const conditionTypeValues = Object.values(CONDITION_TYPES) as [string, ...string[]]

export const createListingSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  type: z.enum(listingTypeValues),
  price: z.coerce.number().positive('Цена должна быть положительной').optional(),
  condition: z.enum(conditionTypeValues).optional(),
  description: z.string().max(2000).trim().optional(),
  courseId: z.string().optional(),
  location: z.string().max(200).trim().optional(),
})

export const listingQuerySchema = z.object({
  type: z.enum(listingTypeValues).optional(),
  condition: z.enum(conditionTypeValues).optional(),
  courseId: z.string().optional(),
  search: z.string().max(200).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateListingInput = z.infer<typeof createListingSchema>
export type ListingQueryInput = z.infer<typeof listingQuerySchema>
