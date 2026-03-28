import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/shared/PageTransition'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Star, TrendingUp, Calendar, BookOpen,
  MessageSquare, HelpCircle, Users, PartyPopper, Trophy,
  Shield,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatCard } from '@/components/shared/StatCard'
import { analyticsService } from '@/services/analytics.service'
import { ROUTES } from '@/lib/constants'
import { deadlinesService } from '@/services/deadlines.service'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/cn'
import { CHART_COLORS, CHART_CONFIG, ChartGradients } from '@/lib/chart-theme'
import type { ActivityTimeline, CoursePopularity } from '@/services/analytics.service'

const container = { show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

function ChartSkeleton() {
  return <Card><CardHeader><Skeleton className="h-5 w-48" /></CardHeader><CardContent><Skeleton className="h-64 w-full rounded-lg" /></CardContent></Card>
}

function ActivityChart({ data }: { data: ActivityTimeline[] }) {
  if (!data.length) return (
    <Card><CardHeader><CardTitle className="text-base">Активность</CardTitle></CardHeader>
      <CardContent><div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Нет данных</div></CardContent></Card>
  )
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Активность за 30 дней</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <ChartGradients />
            <CartesianGrid {...CHART_CONFIG.grid} />
            <XAxis dataKey="date" tickFormatter={(v: string) => { try { return new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) } catch { return '' } }} {...CHART_CONFIG.axis} />
            <YAxis {...CHART_CONFIG.axis} />
            <Tooltip labelFormatter={(v: string) => { try { return new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) } catch { return '' } }} formatter={(value: number) => [`${value}`, 'Действий']} {...CHART_CONFIG.tooltip} />
            <Area type="monotone" dataKey="actions" stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#gradientPrimary)" dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function MaterialsChart({ data }: { data: CoursePopularity[] }) {
  const chartData = data.filter((c) => c.materialCount > 0).slice(0, 6).map((c) => ({
    name: c.courseName.length > 18 ? c.courseName.slice(0, 18) + '…' : c.courseName,
    count: c.materialCount,
  }))
  if (!chartData.length) return (
    <Card><CardHeader><CardTitle className="text-base">Материалы по курсам</CardTitle></CardHeader>
      <CardContent><div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Нет данных</div></CardContent></Card>
  )
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Материалы по курсам</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid {...CHART_CONFIG.grid} />
            <XAxis type="number" {...CHART_CONFIG.axis} />
            <YAxis dataKey="name" type="category" width={130} {...CHART_CONFIG.axis} />
            <Tooltip {...CHART_CONFIG.tooltip} />
            <Bar dataKey="count" name="Материалов" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function AnalyticsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const isMod = user?.role === 'moderator' || isAdmin

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics', 'personal'],
    queryFn: () => analyticsService.getUserActivityStats(),
  })

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['analytics', 'timeline'],
    queryFn: () => analyticsService.getActivityTimeline(30),
  })

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['analytics', 'popular-courses'],
    queryFn: () => analyticsService.getCoursePopularity(10),
  })

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['analytics', 'leaderboard'],
    queryFn: () => analyticsService.getLeaderboard(),
  })

  const { data: deadlines } = useQuery({
    queryKey: ['deadlines', 'upcoming-30'],
    queryFn: () => deadlinesService.getUpcoming(30),
  })

  const { data: platform } = useQuery({
    queryKey: ['analytics', 'platform'],
    queryFn: () => analyticsService.getPlatformStats(),
    enabled: isMod,
  })

  const statCards = [
    { icon: <FileText className="h-5 w-5" />, label: 'Материалы', value: stats?.materialsUploaded ?? 0, color: 'primary' as const },
    { icon: <Star className="h-5 w-5" />, label: 'Отзывы', value: stats?.reviewsWritten ?? 0, color: 'warning' as const },
    { icon: <HelpCircle className="h-5 w-5" />, label: 'Вопросы', value: stats?.questionsAsked ?? 0, color: 'info' as const },
    { icon: <MessageSquare className="h-5 w-5" />, label: 'Ответы', value: stats?.answersGiven ?? 0, color: 'info' as const },
    { icon: <Users className="h-5 w-5" />, label: 'Группы', value: stats?.groupsJoined ?? 0, color: 'success' as const },
    { icon: <PartyPopper className="h-5 w-5" />, label: 'События', value: stats?.eventsAttended ?? 0, color: 'success' as const },
    { icon: <TrendingUp className="h-5 w-5" />, label: 'Репутация', value: stats?.reputation ?? 0, color: 'primary' as const },
    { icon: <Calendar className="h-5 w-5" />, label: 'Дедлайны', value: deadlines?.length ?? 0, color: 'warning' as const },
  ]

  return (
    <PageTransition className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Аналитика</h1>

      {/* Stats */}
      <AnimatePresence mode="wait">
        {statsLoading ? (
          <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </motion.div>
        ) : (
          <motion.div key="stats" variants={container} initial="hidden" animate="show" className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {statCards.map((s) => (
              <motion.div key={s.label} variants={item}><StatCard icon={s.icon} label={s.label} value={s.value} color={s.color} /></motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnimatePresence mode="wait">
          {timelineLoading ? <ChartSkeleton key="t" /> : (
            <motion.div key="timeline" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><ActivityChart data={timeline ?? []} /></motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {coursesLoading ? <ChartSkeleton key="m" /> : (
            <motion.div key="mat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><MaterialsChart data={courses ?? []} /></motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leaderboard */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-5 w-5 text-yellow-500" /> Таблица лидеров</CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : !(leaderboard as any[])?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {(leaderboard as any[]).map((u: any, i: number) => {
                  const name = u.name ? `${u.name.first ?? ''} ${u.name.last ?? ''}`.trim() : (u.userName ?? '')
                  const rep = u.reputation ?? 0
                  const uid = String(u.id ?? u.userId)
                  return (
                    <Link key={uid + i} to={ROUTES.PROFILE(uid)} className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent/30">
                      <span className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                        i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
                        i === 1 ? 'bg-gray-200 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300' :
                        i === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' :
                        'bg-muted text-muted-foreground',
                      )}>{i + 1}</span>
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">{u.university?.name ?? ''}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-0">{rep} очков</Badge>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Popular Courses */}
      {(courses?.length ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Популярные курсы</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {courses!.slice(0, 5).map((c) => (
                <Link key={c.courseId} to={ROUTES.COURSE_DETAIL(c.courseId)} className="flex items-center justify-between rounded-xl border p-3 transition-colors hover:bg-accent/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><BookOpen className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="text-sm font-medium">{c.courseName}</p>
                      <p className="text-xs text-muted-foreground">{c.enrolledCount} студентов · {c.reviewCount} отзывов · {c.averageRating.toFixed(1)}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Подробнее</Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Platform Analytics (admin/moderator) */}
      {isMod && platform && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary" /> Статистика платформы
                <Badge className="ml-2 bg-primary/10 text-primary border-0 text-xs">{isAdmin ? 'Админ' : 'Модератор'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {[
                  { label: 'Пользователи', value: (platform as any)?.totalCounts?.users ?? 0 },
                  { label: 'Курсы', value: (platform as any)?.totalCounts?.courses ?? 0 },
                  { label: 'Материалы', value: (platform as any)?.totalCounts?.materials ?? 0 },
                  { label: 'Отзывы', value: (platform as any)?.totalCounts?.reviews ?? 0 },
                  { label: 'Вопросы', value: (platform as any)?.totalCounts?.questions ?? 0 },
                  { label: 'Группы', value: (platform as any)?.totalCounts?.groups ?? 0 },
                  { label: 'События', value: (platform as any)?.totalCounts?.events ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {(platform as any)?.topUniversities?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Топ университеты</p>
                  <div className="flex flex-wrap gap-2">
                    {((platform as any).topUniversities as any[]).map((u: any) => (
                      <Badge key={u.university} variant="secondary">{u.university}: {u.count}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </PageTransition>
  )
}
