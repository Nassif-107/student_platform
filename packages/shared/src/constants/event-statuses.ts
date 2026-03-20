export const EVENT_STATUSES = {
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export type EventStatus = (typeof EVENT_STATUSES)[keyof typeof EVENT_STATUSES]
