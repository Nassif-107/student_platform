import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'

export interface Deadline {
  id: string
  title: string
  description?: string
  courseId?: string
  courseName?: string
  courseCode?: string
  type?: string
  authorId: string
  authorName: string
  dueDate: string
  confirmations: number
  createdAt: string
  updatedAt: string
}

export interface DeadlinesParams {
  page?: number
  limit?: number
  courseId?: string
  from?: string
  to?: string
  sortBy?: 'dueDate' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface CreateDeadlineData {
  title: string
  description?: string
  courseId: string
  courseTitle: string
  courseCode: string
  type: string
  dueDate: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapDeadline(raw: any): Deadline {
  if (!raw) return raw
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description,
    courseId: raw.course?.id ?? raw.courseId,
    courseName: raw.course?.title ?? raw.courseName,
    courseCode: raw.course?.code ?? raw.courseCode,
    type: raw.type,
    authorId: raw.createdBy?.id ?? raw.authorId ?? '',
    authorName: raw.createdBy?.name ?? raw.authorName ?? '',
    dueDate: raw.dueDate,
    confirmations: raw.confirmations ?? 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const deadlinesService = {
  getDeadlines: async (params?: DeadlinesParams): Promise<PaginatedResponse<Deadline>> => {
    const raw = await api.get<unknown>(`/deadlines${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapDeadline)
  },

  getDeadlineById: async (id: string) => {
    const raw = await api.get<any>(`/deadlines/${id}`)
    return mapDeadline(raw)
  },

  createDeadline: async (data: CreateDeadlineData) => {
    const raw = await api.post<any>('/deadlines', data)
    return mapDeadline(raw)
  },

  updateDeadline: async (id: string, data: Partial<CreateDeadlineData>) => {
    const raw = await api.patch<any>(`/deadlines/${id}`, data)
    return mapDeadline(raw)
  },

  deleteDeadline: (id: string) =>
    api.del<{ message: string }>(`/deadlines/${id}`),

  getUpcoming: async (days?: number) => {
    const raw = await api.get<any>(`/deadlines/upcoming${days ? `?days=${days}` : ''}`)
    const arr = Array.isArray(raw) ? raw : (raw.data ?? raw.items ?? [])
    return arr.map(mapDeadline) as Deadline[]
  },

  confirmDeadline: (id: string) =>
    api.post<{ confirmed: boolean; confirmations: number }>(`/deadlines/${id}/confirm`),
}
