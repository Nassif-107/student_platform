import type { NotificationType } from '../constants/notification-types.js'

export type { NotificationType }

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: string
}
