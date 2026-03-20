import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

export function formatDate(date: Date | string | number): string {
  const d = new Date(date)
  return format(d, 'd MMMM yyyy', { locale: ru })
}

export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date)
  return format(d, 'd MMMM yyyy, HH:mm', { locale: ru })
}

export function formatRelative(date: Date | string | number): string {
  const d = new Date(date)
  return formatDistanceToNow(d, { addSuffix: true, locale: ru })
}

export function formatShort(date: Date | string | number): string {
  const d = new Date(date)
  return format(d, 'd MMM', { locale: ru })
}
