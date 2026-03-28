import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Calendar,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { deadlinesService, type CreateDeadlineData } from '@/services/deadlines.service'
import { coursesService } from '@/services/courses.service'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { formatDateTime, formatRelative } from '@/lib/format-date'
import { cn } from '@/lib/cn'

const DEADLINE_TYPES = [
  { value: 'лабораторная', label: 'Лабораторная' },
  { value: 'курсовая', label: 'Курсовая' },
  { value: 'экзамен', label: 'Экзамен' },
  { value: 'зачёт', label: 'Зачёт' },
  { value: 'домашнее задание', label: 'Домашнее задание' },
  { value: 'другое', label: 'Другое' },
]

function getDeadlineUrgency(dueDate: string) {
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffMs < 0) return { label: 'Просрочено', color: 'text-destructive bg-destructive/10', icon: AlertTriangle }
  if (diffDays < 1) return { label: 'Сегодня', color: 'text-destructive bg-destructive/10', icon: AlertTriangle }
  if (diffDays < 3) return { label: 'Скоро', color: 'text-warning bg-warning/10', icon: Clock }
  if (diffDays < 7) return { label: 'На неделе', color: 'text-warning/80 bg-warning/10', icon: Clock }
  return { label: 'Не срочно', color: 'text-info bg-info/10', icon: CheckCircle2 }
}

export function DeadlinesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('')
  const [courseId, setCourseId] = useState('')
  const [dueDate, setDueDate] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['deadlines'],
    queryFn: () =>
      deadlinesService.getDeadlines({ sortBy: 'dueDate', sortOrder: 'asc' }),
  })

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => coursesService.getCourses({ limit: 100 }),
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateDeadlineData) => deadlinesService.createDeadline(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines'] })
      toast({ title: 'Дедлайн добавлен', variant: 'success' })
      setOpen(false)
      setTitle('')
      setDescription('')
      setType('')
      setCourseId('')
      setDueDate('')
    },
    onError: (err) => {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось создать дедлайн', variant: 'error' })
    },
  })

  const handleSubmit = () => {
    if (!title.trim() || !courseId || !type || !dueDate) {
      toast({ title: 'Заполните все обязательные поля', variant: 'error' })
      return
    }
    const course = courses?.items?.find((c) => c.id === courseId)
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      courseId,
      courseTitle: course?.name ?? '',
      courseCode: course?.code ?? '',
      type,
      dueDate: new Date(dueDate).toISOString(),
    })
  }

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Дедлайны</h1>
          <p className="text-muted-foreground">
            Управляйте сроками сдачи заданий
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить дедлайн
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый дедлайн</DialogTitle>
              <DialogDescription>Укажите информацию о дедлайне</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-4">
              <div className="space-y-2">
                <Label>Название <span className="text-destructive">*</span></Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Лабораторная №3..." />
              </div>
              <div className="space-y-2">
                <Label>Курс <span className="text-destructive">*</span></Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="Выберите курс" /></SelectTrigger>
                  <SelectContent>
                    {courses?.items?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тип <span className="text-destructive">*</span></Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue placeholder="Тип задания" /></SelectTrigger>
                  <SelectContent>
                    {DEADLINE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Срок сдачи <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Дополнительная информация..." />
              </div>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Создать дедлайн
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : !data?.items?.length ? (
        <div className="flex flex-col items-center py-20">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Нет активных дедлайнов
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.items ?? []).map((deadline, index) => {
            const urgency = getDeadlineUrgency(deadline.dueDate)
            const UrgencyIcon = urgency.icon
            const isPast = new Date(deadline.dueDate) < new Date()

            return (
              <motion.div
                key={deadline.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5',
                  isPast && 'opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <UrgencyIcon
                      className={cn(
                        'mt-0.5 h-5 w-5 shrink-0',
                        isPast ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    />
                    <div>
                      <h3 className="font-medium text-foreground">
                        {deadline.title}
                      </h3>
                      {deadline.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {deadline.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {deadline.courseName && (
                          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            {deadline.courseName}
                          </span>
                        )}
                        {deadline.type && (
                          <Badge variant="outline" className="text-xs">
                            {deadline.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        urgency.color,
                      )}
                    >
                      {urgency.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(deadline.dueDate)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(deadline.dueDate)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </PageTransition>
  )
}
