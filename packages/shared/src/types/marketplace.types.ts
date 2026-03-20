import type { ConditionType, ListingType } from '../constants/listing-types.js'
import type { UserCompact } from './user.types.js'

export interface ListingSeller extends UserCompact {
  university: string
}

export interface Listing {
  id: string
  title: string
  type: ListingType
  price?: number
  condition?: ConditionType
  photos: string[]
  description?: string
  course?: string
  seller: ListingSeller
  location?: string
  status: 'active' | 'reserved' | 'sold' | 'closed'
  createdAt: string
  updatedAt: string
}
