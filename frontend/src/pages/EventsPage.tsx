import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageTransition } from '@/components/shared/PageTransition'
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  MapPin,
  Users,
  CalendarDays,
  LayoutGrid,
  List,
  Loader2,
  Zap,
  Trophy,
  Dumbbell,
  GraduationCap,
  PartyPopper,
  Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import { SearchBar } from '@/components/shared/SearchBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format-date'
import { useAuth } from '@/hooks/useAuth'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { eventsService } from '@/services/events.service'
import type { Event, EventsParams, CreateEventData } from '@/services/events.service'

const EVENT_TYPES: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  'хакатон': { label: 'Хакатон', icon: Zap, color: 'bg-primary/10 text-primary' },
  'конференция': { label: 'Конференция', icon: GraduationCap, color: 'bg-info/10 text-info' },
  'спорт': { label: 'Спорт', icon: Dumbbell, color: 'bg-success/10 text-success' },
  'концерт': { label: 'Концерт', icon: PartyPopper, color: 'bg-destructive/10 text-destructive' },
  'мастер-класс': { label: 'Мастер-класс', icon: Briefcase, color: 'bg-warning/10 text-warning' },
  'другое': { label: 'Другое', icon: Trophy, color: 'bg-muted text-muted-foreground' },
}

const GRADIENT_PLACEHOLDERS = [
  'from-blue-500 to-purple-600',
  'from-green-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
]

const container = { show: { transition: { staggerChildren: 0.02 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const eventSchema = z.object({
  title: z.string().min(3, 'Минимум 3 символа'),
  type: z.enum(['хакатон', 'конференция', 'спорт', 'концерт', 'мастер-класс', 'другое']),
  description: z.string().min(10, 'Минимум 10 символов'),
  date: z.string().min(1, 'Укажите дату'),
  time: z.string().min(1, 'Укажите время'),
  location: z.string().min(2, 'Укажите место'),
  maxParticipants: z.coerce.number().min(1).optional(),
  tags: z.string().optional(),
})

type EventFormValues = z.infer<typeof eventSchema>

function EventCardSkeleton() {
  return <SkeletonCard variant="event" />
}

const DEFAULT_EVENT_META = { label: 'Событие', icon: Trophy, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }

function EventCard({ event, onToggle, userId, isToggling }: { event: Event; onToggle: (id: string) => void; userId?: string; isToggling?: boolean }) {
  const meta = EVENT_TYPES[event.type] ?? DEFAULT_EVENT_META
  const isRegistered = event.isRegistered ?? (userId ? (event.attendees ?? []).includes(userId) : false)
  const isPast = new Date(event.date) < new Date()
  const gradientIdx = event.id.charCodeAt(0) % GRADIENT_PLACEHOLDERS.length
  const Icon = meta.icon

  return (
    <motion.div variants={item} className={cn(isPast && 'opacity-60')}>
      <div className="group rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5">
        <div className={cn('relative h-36 flex items-center justify-center', !event.imageUrl && `bg-gradient-to-br ${GRADIENT_PLACEHOLDERS[gradientIdx]}`)}>
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <Icon className="h-12 w-12 text-white/70" />
          )}
          <Badge className={cn('absolute top-3 left-3 text-xs', meta.color)}>
            {meta.label}
          </Badge>
        </div>
        <div className="p-4 space-y-2.5">
          <h3 className="font-semibold text-foreground line-clamp-2">{event.title}</h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{formatDateTime(event.date)}{event.time ? ` ${event.time}` : ''}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{event.currentParticipants}{event.maxParticipants ? ` / ${event.maxParticipants}` : ''}</span>
            </div>
            <Button
              size="sm"
              variant={isRegistered ? 'secondary' : 'default'}
              onClick={() => onToggle(event.id)}
              disabled={isPast || isToggling}
            >
              {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : isRegistered ? 'Не пойду' : 'Пойду'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function EventsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [accumulated, setAccumulated] = useState<Event[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const handleSearch = useCallback((v: string) => {
    setSearch(v)
    setPage(1)
    setAccumulated([])
  }, [])

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1)
    setAccumulated([])
  }, [typeFilter])

  // Reset on mount
  useEffect(() => {
    setPage(1)
    setAccumulated([])
  }, [])

  const params: EventsParams = {
    page,
    limit: DEFAULT_PAGE_SIZE,
    search: search || undefined,
    type: typeFilter !== 'all' ? (typeFilter as EventsParams['type']) : undefined,
    sortBy: 'date',
    sortOrder: 'asc',
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['events', search, typeFilter, page],
    queryFn: () => eventsService.getEvents(params),
  })

  useEffect(() => {
    if (data?.items) {
      setAccumulated((prev) => {
        if (page === 1) return data.items
        const existingIds = new Set(prev.map((e) => e.id))
        const newItems = data.items.filter((item) => !existingIds.has(item.id))
        return [...prev, ...newItems]
      })
    }
  }, [data, page])

  const toggleMutation = useMutation({
    mutationFn: (id: string) => eventsService.registerForEvent(id),
    onMutate: (id) => { setTogglingEventId(id) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setTogglingEventId(null)
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось изменить регистрацию', variant: 'error' })
      setTogglingEventId(null)
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: 'другое' },
  })

  const createMutation = useMutation({
    mutationFn: (values: EventFormValues) => {
      const dateStr = new Date(`${values.date}T${values.time}`).toISOString()
      const payload: CreateEventData = {
        title: values.title,
        type: values.type,
        description: values.description,
        date: dateStr,
        time: values.time,
        location: values.location,
        maxParticipants: values.maxParticipants,
        tags: values.tags ? values.tags.split(',').map((t) => t.trim()) : [],
      }
      return eventsService.createEvent(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast({ title: 'Событие создано', variant: 'success' })
      setDialogOpen(false)
      reset()
    },
    onError: () => toast({ title: 'Ошибка создания события', variant: 'error' }),
  })

  const events = accumulated
  const hasMore = data ? page < (data.totalPages ?? Math.ceil((data.total ?? 0) / DEFAULT_PAGE_SIZE)) : false
  const handleLoadMore = useCallback(() => setPage((p) => p + 1), [])

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-foreground">События кампуса</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Создать событие</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Новое событие</DialogTitle>
              <DialogDescription>Заполните информацию о событии</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              <div className="space-y-1">
                <Label>Название</Label>
                <Input placeholder="Хакатон по ИИ" {...register('title')} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Тип</Label>
                <Select value={watch('type')} onValueChange={(v) => setValue('type', v as EventFormValues['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPES).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Описание</Label>
                <Textarea rows={3} {...register('description')} />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Дата</Label>
                  <Input type="date" {...register('date')} />
                  {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Время</Label>
                  <Input type="time" {...register('time')} />
                  {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Место</Label>
                <Input placeholder="Аудитория 301" {...register('location')} />
                {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Макс. участников</Label>
                <Input type="number" min={1} {...register('maxParticipants')} />
              </div>
              <div className="space-y-1">
                <Label>Теги (через запятую)</Label>
                <Input placeholder="ИИ, хакатон" {...register('tags')} />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {createMutation.isPending ? 'Создание...' : 'Создать'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <SearchBar onSearch={handleSearch} placeholder="Поиск событий..." className="sm:w-64" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Тип события" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {Object.entries(EVENT_TYPES).map(([key, meta]) => (
                <SelectItem key={key} value={key}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          <Button size="sm" variant={view === 'grid' ? 'default' : 'ghost'} onClick={() => setView('grid')} title="Сетка">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} onClick={() => setView('list')} title="Список">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={cn(view === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3')}
          >
            {Array.from({ length: 6 }, (_, i) => <EventCardSkeleton key={i} />)}
          </motion.div>
        ) : events.length === 0 ? (
          <EmptyState
            key="empty"
            icon={<CalendarDays className="h-7 w-7 text-muted-foreground" />}
            title="События не найдены"
            description="Попробуйте изменить фильтры или создайте новое событие"
          />
        ) : (
          <motion.div
            key="events"
            variants={container}
            initial="hidden"
            animate="show"
            className={cn(view === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3')}
          >
            {events.map((event) => (
              <EventCard key={event.id} event={event} userId={user?.id} isToggling={togglingEventId === event.id} onToggle={(id) => toggleMutation.mutate(id)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <InfiniteScrollTrigger
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        isLoading={isFetching}
      />
    </PageTransition>
  )
}
