import type { EventType } from '../constants/event-types.js'
import type { UserCompact } from './user.types.js'

export interface Event {
  id: string
  title: string
  type: EventType
  description: string
  organizer: UserCompact
  university: string
  location: string
  date: string
  time: string
  maxParticipants?: number
  attendeeCount: number
  tags: string[]
  coverPhoto?: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  createdAt: string
}
