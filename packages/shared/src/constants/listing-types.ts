export const LISTING_TYPES = {
  SELL: 'sell',
  BUY: 'buy',
  EXCHANGE: 'exchange',
  FREE: 'free',
} as const

export type ListingType = (typeof LISTING_TYPES)[keyof typeof LISTING_TYPES]

export const CONDITION_TYPES = {
  EXCELLENT: 'отличное',
  GOOD: 'хорошее',
  NORMAL: 'нормальное',
  WORN: 'потрёпанное',
} as const

export type ConditionType = (typeof CONDITION_TYPES)[keyof typeof CONDITION_TYPES]
