import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BookOpen, Search, Star, Users, Plus } from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { coursesService, type Course } from '@/services/courses.service'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuthStore } from '@/store/auth.store'
import { pluralize } from '@/lib/format-number'
import { ROUTES } from '@/lib/constants'
import { api } from '@/services/api'

const courseFormSchema = z.object({
  title: z.string().min(3, 'Минимум 3 символа'),
  code: z.string().min(1, 'Введите код курса'),
  description: z.string().min(10, 'Минимум 10 символов'),
  faculty: z.string().min(1, 'Введите факультет'),
  year: z.coerce.number().int().min(1).max(6),
  semester: z.coerce.number().int().min(1).max(2),
  type: z.enum(['обязательный', 'по выбору', 'факультатив']),
  credits: z.coerce.number().int().min(1),
  professorName: z.string().min(1, 'Введите имя преподавателя'),
})

type CourseFormValues = z.infer<typeof courseFormSchema>

export function CoursesPage() {
  const { user } = useAuthStore()
  const canCreate = user?.role === 'moderator' || user?.role === 'admin'
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const debouncedSearch = useDebounce(search)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['courses', debouncedSearch],
    queryFn: () => coursesService.getCourses({
      search: debouncedSearch || undefined,
      limit: 100,
    }),
  })

  const courses = data?.items ?? []

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Курсы</h1>
          <p className="text-muted-foreground">
            Каталог доступных учебных курсов
          </p>
        </div>
        {canCreate && (
          <CreateCourseDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['courses'] })
              toast({ title: 'Курс создан', variant: 'success' })
              setDialogOpen(false)
            }}
          />
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск курсов..."
          aria-label="Поиск курсов"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} variant="course" />
          ))}
        </div>
      ) : !courses.length ? (
        <div className="flex flex-col items-center py-20">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Курсы не найдены</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: Course) => (
            <Link
              key={course.id}
              to={ROUTES.COURSE_DETAIL(course.id)}
              className="group block rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-primary">
                    {course.code}
                  </span>
                  <h3 className="mt-1 font-semibold text-foreground group-hover:text-primary transition-colors">
                    {course.name}
                  </h3>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {course.description}
              </p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-yellow-500" />
                  {(course.rating ?? 0).toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {pluralize(course.enrolledCount, 'студент', 'студента', 'студентов')}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(course.tags ?? []).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageTransition>
  )
}

function CreateCourseDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: { year: 1, semester: 1, credits: 4, type: 'обязательный' },
  })

  const createMutation = useMutation({
    mutationFn: async (values: CourseFormValues) => {
      return api.post('/courses', {
        title: values.title,
        code: values.code,
        description: values.description,
        university: { name: 'КубГТУ' },
        faculty: values.faculty,
        year: values.year,
        semester: values.semester,
        type: values.type,
        credits: values.credits,
        professor: { name: values.professorName },
      })
    },
    onSuccess: () => {
      reset()
      onCreated()
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Создать курс
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать курс</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input {...register('title')} placeholder="Математический анализ" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Код</Label>
              <Input {...register('code')} placeholder="МА-101" />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Факультет</Label>
              <Input {...register('faculty')} placeholder="ИКС" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <textarea
              {...register('description')}
              placeholder="Описание курса..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Курс</Label>
              <Input type="number" {...register('year')} min={1} max={6} />
            </div>
            <div className="space-y-2">
              <Label>Семестр</Label>
              <Input type="number" {...register('semester')} min={1} max={2} />
            </div>
            <div className="space-y-2">
              <Label>Кредиты</Label>
              <Input type="number" {...register('credits')} min={1} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тип</Label>
              <select {...register('type')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="обязательный">Обязательный</option>
                <option value="по выбору">По выбору</option>
                <option value="факультатив">Факультатив</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Преподаватель</Label>
              <Input {...register('professorName')} placeholder="ФИО" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || createMutation.isPending}>
            {createMutation.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
