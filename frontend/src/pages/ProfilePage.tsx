import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText, MessageSquare, Star, HelpCircle, Pencil,
  MapPin, Send, ExternalLink, GraduationCap, BookOpen,
  Github, Phone,
} from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewCard } from '@/components/shared/ReviewCard'
import { useAuth } from '@/hooks/useAuth'
import { useTabParam } from '@/hooks/useTabParam'
import { socialService, type UserProfile } from '@/services/social.service'
import { materialsService } from '@/services/materials.service'
import { reviewsService } from '@/services/reviews.service'
import { analyticsService, type ActivityTimeline } from '@/services/analytics.service'
import { ROUTES } from '@/lib/constants'
import { formatRelative } from '@/lib/format-date'
import { cn } from '@/lib/cn'

const container = { show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

function getInitials(profile: UserProfile): string {
  return `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
}

function yearLabel(course?: number): string {
  if (!course) return ''
  if (course <= 4) return `${course} курс`
  if (course === 5) return 'Магистратура'
  return 'Аспирантура'
}

const GRADIENT_CLASSES = [
  'from-blue-600 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-500',
  'from-violet-600 to-purple-600',
]

export function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useTabParam('materials')

  const targetId = id ?? user?.id
  const isOwnProfile = !id || id === user?.id

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', targetId],
    queryFn: () => socialService.getProfile(targetId!),
    enabled: !!targetId,
  })

  const { data: materials } = useQuery({
    queryKey: ['materials', 'user', targetId],
    queryFn: () => materialsService.getMaterials({ authorId: targetId, limit: 10 }),
    enabled: activeTab === 'materials' && !!targetId,
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews', 'user', targetId],
    queryFn: () => reviewsService.getReviews({ limit: 10, authorId: targetId }),
    enabled: activeTab === 'reviews' && !!targetId,
  })

  const { data: activityTimeline, isLoading: activityLoading } = useQuery({
    queryKey: ['activity-timeline', targetId],
    queryFn: () => analyticsService.getActivityTimeline(30),
    enabled: activeTab === 'activity' && isOwnProfile,
  })

  if (isLoading) {
    return (
      <PageTransition className="space-y-6">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="flex items-end gap-6 -mt-12 px-6">
          <Skeleton className="h-28 w-28 rounded-full border-4 border-background" />
          <div className="space-y-2 pb-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </PageTransition>
    )
  }

  if (!profile) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-muted-foreground">Профиль не найден</p>
      </div>
    )
  }

  const gradientIdx = (profile.firstName?.charCodeAt(0) ?? 0) % GRADIENT_CLASSES.length
  const hasSocials = profile.socialLinks?.telegram || profile.socialLinks?.vk || profile.socialLinks?.github || profile.socialLinks?.phone

  return (
    <PageTransition className="space-y-6">
      {/* Profile Card with Cover */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Gradient Cover */}
        <div className={cn('h-32 sm:h-40 bg-gradient-to-br', GRADIENT_CLASSES[gradientIdx])} />

        {/* Avatar + Name row */}
        <div className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16">
            <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.firstName} />}
              <AvatarFallback className="text-3xl font-bold bg-background">{getInitials(profile)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 sm:pb-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.firstName} {profile.lastName}
                    {profile.patronymic ? ` ${profile.patronymic}` : ''}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {profile.role === 'admin' ? 'Администратор' : profile.role === 'moderator' ? 'Модератор' : 'Студент'}
                  </p>
                </div>
                {isOwnProfile && (
                  <Link to={ROUTES.EDIT_PROFILE}>
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                      <Pencil className="h-4 w-4" /> Редактировать
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Left: Details */}
            <div className="space-y-3">
              {profile.university && (
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{profile.university}</p>
                    <p className="text-xs text-muted-foreground">{[profile.faculty, profile.specialization].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
              )}
              {profile.course && (
                <div className="flex items-center gap-2.5 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                    <BookOpen className="h-4 w-4 text-info" />
                  </div>
                  <p className="font-medium">{yearLabel(profile.course)}</p>
                </div>
              )}
              {profile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed pt-1">{profile.bio}</p>
              )}
            </div>

            {/* Right: Social + Skills */}
            <div className="space-y-3">
              {hasSocials && (
                <div className="flex flex-wrap gap-2">
                  {profile.socialLinks?.telegram && (
                    <a href={`https://t.me/${profile.socialLinks.telegram}`} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="gap-1.5 py-1.5 hover:bg-accent transition-colors">
                        <Send className="h-3.5 w-3.5" /> Telegram
                      </Badge>
                    </a>
                  )}
                  {profile.socialLinks?.vk && (
                    <a href={`https://vk.com/${profile.socialLinks.vk}`} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="gap-1.5 py-1.5 hover:bg-accent transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" /> VK
                      </Badge>
                    </a>
                  )}
                  {profile.socialLinks?.github && (
                    <a href={`https://github.com/${profile.socialLinks.github}`} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="gap-1.5 py-1.5 hover:bg-accent transition-colors">
                        <Github className="h-3.5 w-3.5" /> GitHub
                      </Badge>
                    </a>
                  )}
                  {profile.socialLinks?.phone && (
                    <Badge variant="outline" className="gap-1.5 py-1.5">
                      <Phone className="h-3.5 w-3.5" /> {profile.socialLinks.phone}
                    </Badge>
                  )}
                </div>
              )}
              {(profile.skills?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Навыки</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills?.map((s) => (
                      <Badge key={s} className="bg-primary/10 text-primary border-0 text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          { label: 'Материалы', value: profile.materialCount ?? 0, icon: FileText, color: 'text-primary bg-primary/10' },
          { label: 'Отзывы', value: profile.reviewCount ?? 0, icon: MessageSquare, color: 'text-warning bg-warning/10' },
          { label: 'Репутация', value: profile.reputation ?? 0, icon: Star, color: 'text-success bg-success/10' },
          { label: 'Вопросы', value: profile.questionCount ?? 0, icon: HelpCircle, color: 'text-purple-600 bg-purple-500/10' },
        ].map((s) => (
          <motion.div key={s.label} variants={item}>
            <Card className="flex items-center gap-3 p-4">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0', s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="materials" className="gap-1.5">
            <FileText className="h-4 w-4" /> Материалы
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5">
            <MessageSquare className="h-4 w-4" /> Отзывы
          </TabsTrigger>
          {isOwnProfile && (
            <TabsTrigger value="activity" className="gap-1.5">
              <Star className="h-4 w-4" /> Активность
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="materials">
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2">
            {!materials?.items?.length ? (
              <div className="col-span-full rounded-xl border border-dashed p-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">Материалы не найдены</p>
              </div>
            ) : (
              materials.items.map((m) => (
                <motion.div key={m.id} variants={item}>
                  <Link to={ROUTES.MATERIAL_DETAIL(m.id)}>
                    <Card className="p-4 transition-colors hover:border-primary/30">
                      <p className="font-medium">{m.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{m.downloadCount}</span>
                        <span className="flex items-center gap-1"><Star className="h-3 w-3" />{m.likeCount}</span>
                        <span>{formatRelative(m.createdAt)}</span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="reviews">
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            {!reviews?.items?.length ? (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">Отзывы не найдены</p>
              </div>
            ) : (
              reviews.items.map((r) => (
                <motion.div key={r.id} variants={item}>
                  <ReviewCard
                    review={r}
                    subtitle={r.targetName}
                    queryKey={['reviews', 'user', targetId]}
                    variant="compact"
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="activity">
          {!isOwnProfile ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">
                Активность доступна только для своего профиля
              </p>
            </div>
          ) : activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 flex-1" />
                </div>
              ))}
            </div>
          ) : !activityTimeline?.length ? (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <Star className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">
                Нет данных об активности
              </p>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
              {activityTimeline.map((day: ActivityTimeline) => {
                const maxActions = Math.max(...activityTimeline.map((d: ActivityTimeline) => d.actions), 1)
                const pct = Math.round((day.actions / maxActions) * 100)
                return (
                  <motion.div key={day.date} variants={item} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="flex-1 h-6 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-medium text-foreground">
                      {day.actions}
                    </span>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </PageTransition>
  )
}
