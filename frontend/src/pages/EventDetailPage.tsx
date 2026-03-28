import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  MapPin,
  Users,
  ArrowLeft,
  Loader2,
  Clock,
  Heart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/store/auth.store'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { eventsService } from '@/services/events.service'
import { formatDateTime } from '@/lib/format-date'
import { ROUTES } from '@/lib/constants'

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsService.getEventById(id!),
    enabled: !!id,
  })

  const { data: participants } = useQuery({
    queryKey: ['event-participants', id],
    queryFn: () => eventsService.getParticipants(id!),
    enabled: !!id,
  })

  const { data: attendingFriends } = useQuery({
    queryKey: ['event-friends', id],
    queryFn: () => eventsService.getAttendingFriends(id!),
    enabled: !!id && !!user,
  })

  const toggleMutation = useMutation({
    mutationFn: () => eventsService.registerForEvent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      queryClient.invalidateQueries({ queryKey: ['event-participants', id] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (err) => {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось изменить регистрацию', variant: 'error' })
    },
  })

  if (isLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageTransition>
    )
  }

  if (!event) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center py-20">
          <CalendarDays className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">Событие не найдено</p>
        </div>
      </PageTransition>
    )
  }

  const isRegistered = event.isRegistered ?? (user ? event.attendees.includes(user.id) : false)
  const isPast = new Date(event.date) < new Date()
  const participantList = Array.isArray(participants) ? participants : (participants as { items?: unknown[] })?.items ?? []

  return (
    <PageTransition>
      <Breadcrumbs current={event.title} className="mb-4" />
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.EVENTS)}>
          <ArrowLeft className="h-4 w-4" /> Назад к событиям
        </Button>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header / Cover */}
          {event.imageUrl && (
            <img src={event.imageUrl} alt={event.title} className="h-48 w-full object-cover" />
          )}

          <div className="p-6 md:p-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{event.type}</Badge>
              {isPast && <Badge variant="outline" className="text-muted-foreground">Завершено</Badge>}
            </div>

            <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDateTime(event.date)}
              </span>
              {event.time && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {event.time}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {event.currentParticipants}{event.maxParticipants ? ` / ${event.maxParticipants}` : ''} участников
              </span>
            </div>

            {event.organizerName && (
              <p className="text-sm text-muted-foreground">
                Организатор: <span className="font-medium text-foreground">{event.organizerName}</span>
              </p>
            )}

            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>

            {event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {event.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}

            {!isPast && (
              <Button
                className="gap-2"
                variant={isRegistered ? 'secondary' : 'default'}
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
              >
                {toggleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRegistered ? 'Отменить регистрацию' : 'Зарегистрироваться'}
              </Button>
            )}
          </div>
        </div>

        {/* Attending Friends (Neo4j) */}
        {Array.isArray(attendingFriends) && attendingFriends.length > 0 && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Heart className="h-5 w-5 text-primary" />
              Ваши друзья идут ({attendingFriends.length})
            </h2>
            <div className="flex flex-wrap gap-3">
              {attendingFriends.map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {f.firstName?.[0]}{f.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{f.firstName} {f.lastName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants */}
        {Array.isArray(participantList) && participantList.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Участники ({participantList.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(participantList as Array<{ id: string; firstName: string; lastName: string; avatarUrl?: string }>).map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {p.firstName?.[0]}{p.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{p.firstName} {p.lastName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
