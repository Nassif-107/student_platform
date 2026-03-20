import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'

export interface Event {
  id: string
  title: string
  description: string
  type: string
  organizerId: string
  organizerName: string
  location?: string
  date: string
  time?: string
  maxParticipants?: number
  currentParticipants: number
  attendees: string[]
  isRegistered?: boolean
  imageUrl?: string
  status: string
  tags: string[]
  createdAt: string
}

export interface EventsParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  from?: string
  to?: string
  sortBy?: 'date' | 'attendeeCount' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface CreateEventData {
  title: string
  description: string
  type: string
  location?: string
  date: string
  time?: string
  maxParticipants?: number
  coverPhoto?: string
  tags: string[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapEvent(raw: any): Event {
  if (!raw) return raw
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    type: raw.type ?? 'другое',
    organizerId: raw.organizer?.id ?? raw.organizerId ?? '',
    organizerName: raw.organizer?.name ?? raw.organizerName ?? '',
    location: raw.location,
    date: raw.date ?? '',
    time: raw.time,
    maxParticipants: raw.maxParticipants,
    currentParticipants: raw.attendeeCount ?? raw.currentParticipants ?? 0,
    attendees: raw.attendees ?? [],
    isRegistered: raw.isRegistered ?? raw.isAttending,
    imageUrl: raw.coverPhoto ?? raw.imageUrl,
    status: raw.status ?? 'upcoming',
    tags: raw.tags ?? [],
    createdAt: raw.createdAt,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const eventsService = {
  getEvents: async (params?: EventsParams): Promise<PaginatedResponse<Event>> => {
    const raw = await api.get<unknown>(`/events${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapEvent)
  },

  getEventById: async (id: string) => {
    const raw = await api.get<any>(`/events/${id}`)
    return mapEvent(raw)
  },

  createEvent: async (data: CreateEventData) => {
    const raw = await api.post<any>('/events', data)
    return mapEvent(raw)
  },

  updateEvent: async (id: string, data: Partial<CreateEventData>) => {
    const raw = await api.patch<any>(`/events/${id}`, data)
    return mapEvent(raw)
  },

  deleteEvent: (id: string) =>
    api.del<{ message: string }>(`/events/${id}`),

  registerForEvent: (id: string) =>
    api.post<{ message: string }>(`/events/${id}/attend`),

  getParticipants: (id: string) =>
    api.get<
      Array<{
        id: string
        firstName: string
        lastName: string
        avatarUrl?: string
      }>
    >(`/events/${id}/participants`),
}
