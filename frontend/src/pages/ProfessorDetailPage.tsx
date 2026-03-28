import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Star,
  Mail,
  MessageSquare,
  ArrowLeft,
  BookOpen,
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ReviewCard } from '@/components/shared/ReviewCard'
import { CreateReviewDialog } from '@/components/shared/CreateReviewDialog'
import { professorsService, type ProfessorReview } from '@/services/professors.service'
import { formatNumber } from '@/lib/format-number'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES } from '@/lib/constants'

const container = { show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

export function ProfessorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: professor, isLoading } = useQuery({
    queryKey: ['professor', id],
    queryFn: () => professorsService.getProfessorById(id!),
    enabled: !!id,
  })

  const { data: reviews } = useQuery({
    queryKey: ['professor-reviews', id],
    queryFn: () => professorsService.getProfessorReviews(id!),
    enabled: !!id,
  })

  const { data: courses } = useQuery({
    queryKey: ['professor-courses', id],
    queryFn: () => professorsService.getProfessorCourses(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </PageTransition>
    )
  }

  if (!professor) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center py-20">
          <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg text-muted-foreground">
            Преподаватель не найден
          </p>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <Breadcrumbs current={`${professor.lastName} ${professor.firstName} ${professor.middleName ?? ''}`.trim()} className="mb-4" />
      <div className="mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.PROFESSORS)}>
          <ArrowLeft className="h-4 w-4" /> Назад к преподавателям
        </Button>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border bg-card p-6 md:p-8"
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Avatar className="h-20 w-20">
            {professor.avatarUrl && (
              <AvatarImage src={professor.avatarUrl} alt={professor.lastName} />
            )}
            <AvatarFallback className="text-2xl">
              {professor.lastName?.[0]}{professor.firstName?.[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-foreground">
              {professor.lastName} {professor.firstName} {professor.middleName ?? ''}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {professor.position} · {professor.department}
            </p>
            <p className="text-sm text-muted-foreground">
              {professor.university} · {professor.faculty}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <div className="flex items-center gap-1.5">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                <span className="text-xl font-bold">
                  {(professor.averageRating ?? 0).toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / 5.0
                </span>
              </div>
              <Separator orientation="vertical" className="h-5" />
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                {formatNumber(professor.reviewCount)} отзывов
              </span>
            </div>

            {professor.courseCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                {professor.courseCount} курсов
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Contact Info */}
      {professor.email && (
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-5 w-5 text-primary" />
                  Контакты
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${professor.email}`} className="text-primary hover:underline">
                    {professor.email}
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Courses Taught */}
      {courses && courses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-5 w-5 text-primary" />
                Преподаёт курсы ({courses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {courses.map((c) => (
                <Link
                  key={c.id}
                  to={ROUTES.COURSE_DETAIL(c.id)}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="font-medium text-sm">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.code}</p>
                  </div>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Reviews */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Отзывы студентов
          </h2>
          <CreateReviewDialog
            targetType="professor"
            targetId={id!}
            targetName={`${professor.lastName} ${professor.firstName} ${professor.middleName ?? ''}`.trim()}
            invalidateKeys={[['professor-reviews', id], ['professor', id]]}
          />
        </div>
        {!reviews?.items?.length ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">Отзывов пока нет</p>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {reviews.items.map((review: ProfessorReview) => (
              <motion.div key={review.id} variants={item}>
                <ReviewCard
                  review={review}
                  subtitle={review.courseName}
                  queryKey={['professor-reviews', id]}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
      </div>
    </PageTransition>
  )
}
