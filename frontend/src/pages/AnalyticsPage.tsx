import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/shared/PageTransition'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Star,
  TrendingUp,
  Calendar,
  BookOpen,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/shared/StatCard'
import { analyticsService } from '@/services/analytics.service'
import { ROUTES } from '@/lib/constants'
import { deadlinesService } from '@/services/deadlines.service'
import { CHART_COLORS, CHART_CONFIG, ChartGradients } from '@/lib/chart-theme'
import type { ActivityTimeline, CoursePopularity } from '@/services/analytics.service'

const container = { show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="space-y-1">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

function ActivityChart({ data }: { data: ActivityTimeline[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Активность на платформе</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <ChartGradients />
            <CartesianGrid {...CHART_CONFIG.grid} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              {...CHART_CONFIG.axis}
            />
            <YAxis {...CHART_CONFIG.axis} />
            <Tooltip
              labelFormatter={(v: string) => new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              formatter={(value: number) => [`${value} действий`, 'Активность']}
              {...CHART_CONFIG.tooltip}
            />
            <Area
              type="monotone"
              dataKey="actions"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              fill="url(#gradientPrimary)"
              dot={false}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function DeadlineLoadChart({ deadlineCount }: { deadlineCount: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Нагрузка по дедлайнам</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-10 w-10 text-primary mb-3" />
          <p className="text-3xl font-bold text-foreground">{deadlineCount}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {deadlineCount === 0
              ? 'Нет предстоящих дедлайнов'
              : 'Дедлайнов на ближайший месяц'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ReputationChart({ reputation }: { reputation: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Репутация</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <TrendingUp className="h-10 w-10 text-success mb-3" />
          <p className="text-3xl font-bold text-foreground">{reputation}</p>
          <p className="text-sm text-muted-foreground mt-1">Текущая репутация</p>
        </div>
      </CardContent>
    </Card>
  )
}

function MaterialsPopularityChart({ data }: { data: CoursePopularity[] }) {
  const chartData = data.slice(0, 5).map((c) => ({
    name: c.courseName.length > 25 ? c.courseName.slice(0, 25) + '...' : c.courseName,
    materials: c.materialCount,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Материалы по курсам</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid {...CHART_CONFIG.grid} />
            <XAxis type="number" {...CHART_CONFIG.axis} />
            <YAxis dataKey="name" type="category" width={140} {...CHART_CONFIG.axis} />
            <Tooltip {...CHART_CONFIG.tooltip} />
            <Bar dataKey="materials" name="Материалов" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function RecommendedCourses({ courses }: { courses: CoursePopularity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Рекомендуемые курсы</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {courses.slice(0, 5).map((course) => (
          <div key={course.courseId} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{course.courseName}</p>
                <p className="text-xs text-muted-foreground">
                  {course.enrolledCount} студентов
                </p>
              </div>
            </div>
            <Link to={ROUTES.COURSE_DETAIL(course.courseId)}>
              <Button size="sm" variant="outline">Подробнее</Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function AnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics', 'user-activity'],
    queryFn: () => analyticsService.getUserActivityStats(),
  })

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['analytics', 'timeline'],
    queryFn: () => analyticsService.getActivityTimeline(30),
  })

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['analytics', 'popular-courses'],
    queryFn: () => analyticsService.getCoursePopularity(5),
  })

  const { data: deadlines } = useQuery({
    queryKey: ['deadlines', 'upcoming-30'],
    queryFn: () => deadlinesService.getUpcoming(30),
  })

  return (
    <PageTransition className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">
        Моя аналитика
      </h1>

      <AnimatePresence mode="wait">
        {statsLoading ? (
          <motion.div key="stat-skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
          </motion.div>
        ) : (
          <motion.div
            key="stats"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <motion.div variants={item}>
              <StatCard
                icon={<FileText className="h-5 w-5" />}
                label="Материалы загружено"
                value={stats?.materialsUploaded ?? 0}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                icon={<Star className="h-5 w-5" />}
                label="Отзывы написано"
                value={stats?.reviewsWritten ?? 0}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Репутация"
                value={stats?.reputation ?? 0}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                icon={<Calendar className="h-5 w-5" />}
                label="Дедлайны на этой неделе"
                value={deadlines?.length ?? 0}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnimatePresence mode="wait">
          {timelineLoading ? (
            <ChartSkeleton key="timeline-skel" />
          ) : (
            <motion.div key="timeline" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <ActivityChart data={timeline ?? []} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <DeadlineLoadChart deadlineCount={deadlines?.length ?? 0} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ReputationChart reputation={stats?.reputation ?? 0} />
        </motion.div>

        <AnimatePresence mode="wait">
          {coursesLoading ? (
            <ChartSkeleton key="courses-skel" />
          ) : (
            <motion.div key="materials" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <MaterialsPopularityChart data={courses ?? []} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {coursesLoading ? (
          <ChartSkeleton key="rec-skel" />
        ) : (
          <motion.div key="recommended" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <RecommendedCourses courses={courses ?? []} />
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
