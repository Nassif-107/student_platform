import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageTransition } from '@/components/shared/PageTransition'
import {
  Bell,
  FileText,
  Calendar,
  CheckCircle,
  MessageSquare,
  UserPlus,
  Users,
  ThumbsUp,
  PartyPopper,
  CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { DateBadge } from '@/components/shared/DateBadge'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { useNotificationStore } from '@/store/notifications.store'
import { notificationsService } from '@/services/notifications.service'
import type { Notification } from '@/services/notifications.service'

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  FRIEND_REQUEST: UserPlus,
  FRIEND_ACTIVITY: Users,
  NEW_ANSWER: MessageSquare,
  ANSWER_ACCEPTED: CheckCircle,
  MATERIAL_NEW: FileText,
  REVIEW_HELPFUL: ThumbsUp,
  GROUP_INVITE: Users,
  DEADLINE_REMINDER: Calendar,
  EVENT_REMINDER: PartyPopper,
  SYSTEM: Bell,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  FRIEND_REQUEST: 'text-info bg-info/10',
  FRIEND_ACTIVITY: 'text-success bg-success/10',
  NEW_ANSWER: 'text-primary bg-primary/10',
  ANSWER_ACCEPTED: 'text-success bg-success/10',
  MATERIAL_NEW: 'text-warning bg-warning/10',
  REVIEW_HELPFUL: 'text-primary bg-primary/10',
  GROUP_INVITE: 'text-warning bg-warning/10',
  DEADLINE_REMINDER: 'text-destructive bg-destructive/10',
  EVENT_REMINDER: 'text-info bg-info/10',
  SYSTEM: 'text-muted-foreground bg-muted',
}

const container = { show: { transition: { staggerChildren: 0.02 } } }
const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
}

function NotificationSkeleton() {
  return <SkeletonCard variant="notification" />
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification
  onClick: () => void
}) {
  const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell
  const colorClass = NOTIFICATION_COLORS[notification.type] ?? NOTIFICATION_COLORS.system

  return (
    <motion.div variants={item}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50',
          !notification.isRead && 'border-l-4 border-l-primary bg-primary/5',
        )}
      >
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm', !notification.isRead ? 'font-semibold text-foreground' : 'text-foreground')}>
            {notification.title}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <DateBadge date={notification.createdAt} className="mt-1.5" />
        </div>
      </button>
    </motion.div>
  )
}

export function NotificationsPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { reset: resetUnreadCount, setUnreadCount } = useNotificationStore()
  const observerRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) =>
      notificationsService.getNotifications({ page: pageParam, limit: DEFAULT_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      resetUnreadCount()
    },
    onError: () => toast({ title: 'Ошибка', description: 'Не удалось отметить уведомления', variant: 'error' }),
  })

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setUnreadCount(Math.max(0, useNotificationStore.getState().unreadCount - 1))
    },
    onError: () => toast({ title: 'Ошибка', description: 'Не удалось отметить уведомление', variant: 'error' }),
  })

  const handleClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markOneMutation.mutate(notification.id)
      }
      if (notification.link) {
        navigate(notification.link)
      }
    },
    [navigate, markOneMutation],
  )

  useEffect(() => {
    const el = observerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const notifications = data?.pages.flatMap((p) => p.items) ?? []
  const hasUnread = notifications.some((n) => !n.isRead)

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-foreground">Уведомления</h1>
        {hasUnread && (
          <Button
            variant="outline"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Отметить все как прочитанные
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {Array.from({ length: 8 }, (_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </motion.div>
        ) : notifications.length === 0 ? (
          <EmptyState
            key="empty"
            icon={<Bell className="h-7 w-7 text-muted-foreground" />}
            title="У вас пока нет уведомлений"
            description="Здесь будут появляться уведомления о важных событиях"
          />
        ) : (
          <motion.div
            key="list"
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleClick(notification)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={observerRef} className="h-8" />
      {isFetchingNextPage && (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <NotificationSkeleton key={`next-${i}`} />
          ))}
        </div>
      )}
    </PageTransition>
  )
}
