import { api } from './api'
import { buildQueryString } from '@/lib/query'
import { mapPaginatedResponse, type PaginatedResponse } from '@/lib/pagination'

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  link?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface NotificationsParams {
  page?: number
  limit?: number
  isRead?: boolean
  type?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeType(type: string | undefined): string {
  if (!type) return 'SYSTEM'
  return type.toUpperCase()
}

function mapNotification(raw: any): Notification {
  if (!raw) return raw
  return {
    id: raw.id,
    userId: raw.userId ?? '',
    type: normalizeType(raw.type),
    title: raw.title ?? '',
    message: raw.message ?? '',
    isRead: raw.read ?? raw.isRead ?? false,
    link: raw.link,
    metadata: raw.metadata,
    createdAt: raw.createdAt,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const notificationsService = {
  getNotifications: async (params?: NotificationsParams): Promise<PaginatedResponse<Notification>> => {
    const raw = await api.get<unknown>(`/notifications${buildQueryString(params)}`)
    return mapPaginatedResponse(raw, mapNotification)
  },

  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/count'),

  markAsRead: (id: string) =>
    api.patch<{ message: string }>(`/notifications/${id}/read`, {}),

  markAllAsRead: () =>
    api.patch<{ message: string }>('/notifications/read', {}),

  deleteNotification: (id: string) =>
    api.del<{ message: string }>(`/notifications/${id}`),
}
