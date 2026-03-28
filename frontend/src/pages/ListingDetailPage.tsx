import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  User,
  Send,
  Loader2,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/hooks/useAuth'
import { marketplaceService } from '@/services/marketplace.service'
import { formatDateTime } from '@/lib/format-date'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'

const TYPE_LABELS: Record<string, string> = {
  sell: 'Продажа',
  buy: 'Покупка',
  exchange: 'Обмен',
  free: 'Бесплатно',
}

const CONDITION_LABELS: Record<string, string> = {
  'отличное': 'Отличное',
  'хорошее': 'Хорошее',
  'нормальное': 'Нормальное',
  'потрёпанное': 'Потрёпанное',
}

const TYPE_COLORS: Record<string, string> = {
  sell: 'bg-info/10 text-info',
  buy: 'bg-warning/10 text-warning',
  exchange: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  free: 'bg-success/10 text-success',
}

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [contactOpen, setContactOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [activeImage, setActiveImage] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => marketplaceService.getListingById(id!),
    enabled: !!id,
  })

  const contactMutation = useMutation({
    mutationFn: () => marketplaceService.contactSeller(id!, message),
    onSuccess: () => {
      toast({ title: 'Сообщение отправлено', variant: 'success' })
      setContactOpen(false)
      setMessage('')
    },
    onError: (err) => {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось отправить сообщение', variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => marketplaceService.deleteListing(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      toast({ title: 'Объявление удалено', variant: 'success' })
      navigate(ROUTES.MARKETPLACE)
    },
    onError: (err) => {
      toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось удалить объявление', variant: 'error' })
    },
  })

  if (isLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </PageTransition>
    )
  }

  if (!listing) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center py-20">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg text-muted-foreground">Объявление не найдено</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(ROUTES.MARKETPLACE)}>
            Назад к маркетплейсу
          </Button>
        </div>
      </PageTransition>
    )
  }

  const typeKey = listing.type || (listing.price === 0 ? 'free' : 'sell')
  const isOwner = user?.id === listing.authorId

  return (
    <PageTransition>
      <Breadcrumbs current={listing.title} className="mb-4" />
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.MARKETPLACE)}>
          <ArrowLeft className="h-4 w-4" /> Назад к маркетплейсу
        </Button>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {(listing.images?.length ?? 0) > 0 ? (
          <div className="space-y-2">
            <div className="relative h-72 bg-muted flex items-center justify-center overflow-hidden">
              <img
                src={listing.images?.[activeImage]}
                alt={listing.title}
                decoding="async"
                className="h-full w-full object-contain"
              />
              {!listing.isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Badge variant="destructive" className="text-lg px-4 py-1">Продано</Badge>
                </div>
              )}
            </div>
            {(listing.images?.length ?? 0) > 1 && (
              <div className="flex gap-2 px-6">
                {listing.images?.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    title={`Фото ${i + 1}`}
                    className={cn(
                      'h-16 w-16 rounded-lg overflow-hidden border-2 transition-all',
                      i === activeImage ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100',
                    )}
                  >
                    <img src={img} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 bg-muted flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
            <p className="text-2xl font-bold text-primary shrink-0">
              {listing.price === 0 ? 'Бесплатно' : `${listing.price} ₽`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className={cn('text-xs', TYPE_COLORS[typeKey])}>
              {TYPE_LABELS[typeKey]}
            </Badge>
            {listing.condition && (
              <Badge variant="outline" className="text-xs">
                {CONDITION_LABELS[listing.condition] ?? listing.condition}
              </Badge>
            )}
            {!listing.isActive && (
              <Badge variant="destructive" className="text-xs">Неактивно</Badge>
            )}
          </div>

          <p className="text-muted-foreground">{listing.description}</p>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{listing.authorName}</p>
              {listing.university && (
                <p className="text-xs text-muted-foreground">{listing.university}</p>
              )}
            </div>
          </div>

          {listing.location && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {listing.location}
            </p>
          )}

          {listing.courseName && (
            <p className="text-sm text-muted-foreground">
              Курс: {listing.courseName}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Опубликовано: {formatDateTime(listing.createdAt)}
          </p>

          <div className="flex gap-3 pt-2">
            {!isOwner && listing.isActive && (
              <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Send className="h-4 w-4" /> Написать продавцу
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Сообщение продавцу</DialogTitle>
                    <DialogDescription>Напишите сообщение владельцу объявления</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Напишите сообщение по поводу «{listing.title}»
                    </p>
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Здравствуйте, интересует ваше объявление..."
                    />
                    <Button
                      className="w-full gap-2"
                      onClick={() => contactMutation.mutate()}
                      disabled={!message.trim() || contactMutation.isPending}
                    >
                      {contactMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Отправить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {isOwner && (
              confirmDelete ? (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Подтвердить удаление
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                    Отмена
                  </Button>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" /> Удалить объявление
                </Button>
              )
            )}
          </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
