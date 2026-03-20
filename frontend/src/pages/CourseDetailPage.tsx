import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Star, Users, Clock, GraduationCap, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { coursesService } from '@/services/courses.service'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/store/auth.store'
import { pluralize } from '@/lib/format-number'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES } from '@/lib/constants'

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

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

  const enrolled = students?.some((s) => s.id === user?.id) ?? false

  const enrollMutation = useMutation({
    mutationFn: () => coursesService.enrollInCourse(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      queryClient.invalidateQueries({ queryKey: ['course-students', id] })
      toast({ title: 'Вы записались на курс', variant: 'success' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось записаться на курс', variant: 'error' })
    },
  })

  if (isLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
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

  return (
    <PageTransition>
      <Breadcrumbs current={course.name} className="mb-4" />
      <div className="mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.COURSES)}>
          <ArrowLeft className="h-4 w-4" /> Назад к курсам
        </Button>
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <span className="text-sm font-medium text-primary">{course.code}</span>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          {course.name}
        </h1>
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

        <div className="mt-6 flex flex-wrap gap-2">
          {(course.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>

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
      </div>
    </PageTransition>
  )
}
