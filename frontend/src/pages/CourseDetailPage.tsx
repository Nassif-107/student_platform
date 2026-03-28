import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Star, Users, Clock, GraduationCap, Loader2,
  CheckCircle2, ArrowLeft, MessageSquare, FileText, CalendarDays,
  Download, Heart, HelpCircle,
} from 'lucide-react'
import { coursesService } from '@/services/courses.service'
import { reviewsService } from '@/services/reviews.service'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/store/auth.store'
import { pluralize } from '@/lib/format-number'
import { formatRelative } from '@/lib/format-date'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ReviewCard } from '@/components/shared/ReviewCard'
import { CreateReviewDialog } from '@/components/shared/CreateReviewDialog'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => coursesService.getCourseById(id!),
    enabled: !!id,
  })

  const { data: students } = useQuery({
    queryKey: ['course-students', id],
    queryFn: () => coursesService.getCourseStudents(id!),
    enabled: !!id,
  })

  const { data: reviews } = useQuery({
    queryKey: ['course-reviews', id],
    queryFn: () => reviewsService.getReviews({ courseId: id }),
    enabled: !!id,
  })

  const { data: materials } = useQuery({
    queryKey: ['course-materials', id],
    queryFn: () => coursesService.getCourseMaterials(id!),
    enabled: !!id && tab === 'materials',
  })

  const { data: questions } = useQuery({
    queryKey: ['course-questions', id],
    queryFn: () => coursesService.getCourseQuestions(id!),
    enabled: !!id && tab === 'forum',
  })

  const { data: deadlines } = useQuery({
    queryKey: ['course-deadlines', id],
    queryFn: () => coursesService.getCourseDeadlines(id!),
    enabled: !!id && tab === 'deadlines',
  })

  const enrolled = students?.some((s) => s.id === user?.id) ?? false

  const enrollMutation = useMutation({
    mutationFn: () => coursesService.enrollInCourse(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      queryClient.invalidateQueries({ queryKey: ['course-students', id] })
      toast({ title: 'Вы записались на курс', variant: 'success' })
    },
    onError: (err) => {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось записаться на курс', variant: 'error' })
    },
  })

  if (isLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageTransition>
    )
  }

  if (!course) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center py-20">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">Курс не найден</p>
        </div>
      </PageTransition>
    )
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const materialItems = (materials as any)?.items ?? []
  const questionItems = (questions as any)?.items ?? []
  const deadlineItems = Array.isArray(deadlines) ? deadlines : []
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <PageTransition>
      <Breadcrumbs current={course.name} className="mb-4" />
      <div className="mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.COURSES)}>
          <ArrowLeft className="h-4 w-4" /> Назад к курсам
        </Button>

        {/* Course Info Header */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <span className="text-sm font-medium text-primary">{course.code}</span>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{course.name}</h1>
          <p className="mt-4 text-muted-foreground">{course.description}</p>

          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500" />
              {(course.rating ?? 0).toFixed(1)} ({pluralize(course.reviewCount, 'отзыв', 'отзыва', 'отзывов')})
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {pluralize(course.enrolledCount, 'студент', 'студента', 'студентов')}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {course.credits} кредитов
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              {course.professorName}
            </div>
          </div>

          {(course.tags ?? []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {course.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <Button
            className="mt-6 gap-2"
            onClick={() => enrollMutation.mutate()}
            disabled={enrollMutation.isPending || enrolled}
            variant={enrolled ? 'outline' : 'default'}
          >
            {enrollMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {enrolled ? <><CheckCircle2 className="h-4 w-4" /> Вы записаны</> : 'Записаться на курс'}
          </Button>
        </div>

        {/* Tabbed Content */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview" className="gap-1.5">
              <MessageSquare className="h-4 w-4" /> Отзывы
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-1.5">
              <FileText className="h-4 w-4" /> Материалы
            </TabsTrigger>
            <TabsTrigger value="forum" className="gap-1.5">
              <HelpCircle className="h-4 w-4" /> Вопросы
            </TabsTrigger>
            <TabsTrigger value="deadlines" className="gap-1.5">
              <CalendarDays className="h-4 w-4" /> Дедлайны
            </TabsTrigger>
          </TabsList>

          {/* Reviews Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Отзывы студентов</h2>
              <CreateReviewDialog
                targetType="course"
                targetId={id!}
                targetName={course.name}
                invalidateKeys={[['course-reviews', id], ['course', id]]}
              />
            </div>
            {!reviews?.items?.length ? (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">Отзывов пока нет. Будьте первым!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.items.map((review) => (
                  <ReviewCard key={review.id} review={review} queryKey={['course-reviews', id]} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Материалы курса</h2>
              <Link to={ROUTES.MATERIAL_UPLOAD}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FileText className="h-4 w-4" /> Загрузить
                </Button>
              </Link>
            </div>
            {!materialItems.length ? (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">Материалов пока нет</p>
              </div>
            ) : (
              <div className="space-y-3">
                {materialItems.map((m: any) => (
                  <Link
                    key={m.id ?? m._id}
                    to={ROUTES.MATERIAL_DETAIL(m.id ?? m._id)}
                    className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="rounded-lg bg-accent p-2.5">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m.author?.name ?? m.authorName ?? ''} &middot; {m.type ?? ''}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Download className="h-3.5 w-3.5" />
                        {m.stats?.downloads ?? m.downloadCount ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        {m.stats?.likes ?? m.likeCount ?? 0}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Forum Tab */}
          <TabsContent value="forum" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Вопросы по курсу</h2>
              <Link to={ROUTES.ASK_QUESTION}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <HelpCircle className="h-4 w-4" /> Задать вопрос
                </Button>
              </Link>
            </div>
            {!questionItems.length ? (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">Вопросов пока нет</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questionItems.map((q: any) => (
                  <Link
                    key={q.id ?? q._id}
                    to={ROUTES.QUESTION_DETAIL(q.id ?? q._id)}
                    className="block rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{q.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {q.author?.name ?? ''} &middot; {q.answerCount ?? 0} ответов &middot; {q.views ?? 0} просмотров
                        </p>
                      </div>
                      {(q.hasAcceptedAnswer || q.status === 'resolved') && (
                        <Badge className="bg-success/10 text-success text-xs">Решён</Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Deadlines Tab */}
          <TabsContent value="deadlines" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Дедлайны курса</h2>
              <Link to={ROUTES.DEADLINES}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarDays className="h-4 w-4" /> Все дедлайны
                </Button>
              </Link>
            </div>
            {!deadlineItems.length ? (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">Нет предстоящих дедлайнов</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deadlineItems.map((d: any) => {
                  const due = new Date(d.dueDate)
                  const diffDays = (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  const urgent = diffDays < 0 ? 'text-destructive' : diffDays < 3 ? 'text-warning' : 'text-muted-foreground'
                  return (
                    <div
                      key={d.id ?? d._id}
                      className="flex items-center justify-between rounded-xl border bg-card p-4"
                    >
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">{d.type ?? ''}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn('text-sm font-medium', urgent)}>
                          {formatRelative(d.dueDate)}
                        </p>
                        {d.confirmations > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {d.confirmations} подтверждений
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  )
}
