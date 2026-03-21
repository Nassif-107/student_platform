import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/shared/PageTransition'
import { ScrollReveal } from '@/components/shared/ScrollReveal'
import { useQuery } from '@tanstack/react-query'
import {
  Clock, ArrowRight, Download, Heart, BookOpen, FileText,
  Star, CalendarDays, MessageSquare, Activity,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import { StatCard } from '@/components/shared/StatCard'
import { useAuth } from '@/hooks/useAuth'
import { deadlinesService } from '@/services/deadlines.service'
import { materialsService } from '@/services/materials.service'
import { coursesService } from '@/services/courses.service'
import { analyticsService } from '@/services/analytics.service'
import { notificationsService } from '@/services/notifications.service'
import { formatRelative, formatDate } from '@/lib/format-date'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'

const container = { show: { transition: { staggerChildren: 0.02 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function getDeadlineUrgencyColor(dueDate: string) {
  const diffMs = new Date(dueDate).getTime() - Date.now()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffMs < 0) return { label: 'Просрочено', color: 'bg-destructive/10 text-destructive' }
  if (diffDays < 1) return { label: 'Сегодня', color: 'bg-destructive/10 text-destructive' }
  if (diffDays < 3) return { label: 'Скоро', color: 'bg-warning/10 text-warning' }
  if (diffDays < 7) return { label: 'На неделе', color: 'bg-warning/10 text-warning/80' }
  return { label: 'Не срочно', color: 'bg-info/10 text-info' }
}

export function HomePage() {
  const { user } = useAuth()

  const { data: deadlines, isLoading: loadingDeadlines } = useQuery({
    queryKey: ['deadlines', 'upcoming'],
    queryFn: () => deadlinesService.getUpcoming(7),
  })

  const { data: materials, isLoading: loadingMaterials } = useQuery({
    queryKey: ['materials', 'popular'],
    queryFn: () => materialsService.getMaterials({ sortBy: 'likeCount', sortOrder: 'desc', limit: 5 }),
  })

  const { data: recommendations, isLoading: loadingRecs } = useQuery({
    queryKey: ['courses', 'recommended'],
    queryFn: () => coursesService.getCourses({ sortBy: 'enrolledCount', sortOrder: 'desc', limit: 5 }),
  })

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['analytics', 'user-activity'],
    queryFn: () => analyticsService.getUserActivityStats(),
  })

  const { data: notifications, isLoading: loadingNotifications } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationsService.getNotifications({ limit: 5 }),
  })

  const today = formatDate(new Date())

  return (
    <PageTransition className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Привет, <span className="text-gradient">{user?.firstName ?? 'Студент'}</span>!
        </h1>
        <p className="mt-1 text-muted-foreground">{today}</p>
      </div>

      {/* Stats row — animated counters with semantic colors */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} variant="stat" />
          ))
        ) : (
          <>
            <StatCard
              icon={<FileText className="h-5 w-5" />}
              label="Мои материалы"
              value={stats?.materialsUploaded ?? 0}
              color="primary"
            />
            <StatCard
              icon={<MessageSquare className="h-5 w-5" />}
              label="Мои отзывы"
              value={stats?.reviewsWritten ?? 0}
              color="warning"
            />
            <StatCard
              icon={<Star className="h-5 w-5" />}
              label="Репутация"
              value={stats?.reputation ?? 0}
              color="success"
            />
            <StatCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="Дедлайны на неделе"
              value={deadlines?.length ?? 0}
              color="info"
            />
          </>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Deadlines */}
        <ScrollReveal delay={0}>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Ближайшие дедлайны
            </CardTitle>
            <Link to={ROUTES.DEADLINES}>
              <Button variant="ghost" size="sm">
                Все дедлайны <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingDeadlines ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))
            ) : !deadlines?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Нет предстоящих дедлайнов
              </p>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {deadlines.slice(0, 3).map((d) => {
                  const urgency = getDeadlineUrgencyColor(d.dueDate)
                  return (
                    <motion.div
                      key={d.id}
                      variants={item}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{d.title}</p>
                        {d.courseName && (
                          <p className="text-xs text-muted-foreground">{d.courseName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs', urgency.color)}>
                          {urgency.label}
                        </Badge>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatRelative(d.dueDate)}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </CardContent>
        </Card>
        </ScrollReveal>

        {/* Activity Feed */}
        <ScrollReveal delay={0.1}>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Лента активности
            </CardTitle>
            <Link to={ROUTES.NOTIFICATIONS}>
              <Button variant="ghost" size="sm">
                Все <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingNotifications ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`notif-skel-${i}`} className="h-14 rounded-lg" />
              ))
            ) : !notifications?.items?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Нет последних уведомлений
              </p>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {notifications.items.slice(0, 5).map((n) => (
                  <motion.div key={n.id} variants={item} className="flex items-center gap-3 rounded-lg border p-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <MessageSquare className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
        </ScrollReveal>

        {/* Popular Materials */}
        <ScrollReveal delay={0.2}>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Популярные материалы
            </CardTitle>
            <Link to={ROUTES.MATERIALS}>
              <Button variant="ghost" size="sm">
                Все <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingMaterials ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))
            ) : !materials?.items?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Нет материалов
              </p>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                {materials.items.slice(0, 5).map((m) => (
                  <motion.div key={m.id} variants={item}>
                    <Link
                      to={ROUTES.MATERIAL_DETAIL(m.id)}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.title}</p>
                        {m.courseName && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {m.courseName}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Download className="h-3.5 w-3.5" />
                          {m.downloadCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" />
                          {m.likeCount}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
        </ScrollReveal>

        {/* Course Recommendations */}
        <ScrollReveal delay={0.3}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Рекомендации курсов
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Студенты вашего направления также записались на:
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingRecs ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))
            ) : !recommendations?.items?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Нет рекомендаций
              </p>
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {recommendations.items.slice(0, 5).map((c) => (
                  <motion.div
                    key={c.id}
                    variants={item}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.professorName} &middot; {c.enrolledCount} студентов
                      </p>
                    </div>
                    <Link to={ROUTES.COURSE_DETAIL(c.id)}>
                      <Button size="sm" variant="outline">Подробнее</Button>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
        </ScrollReveal>
      </div>
    </PageTransition>
  )
}
