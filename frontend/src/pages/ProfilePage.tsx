import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText, MessageSquare, Star, HelpCircle, Pencil,
  MapPin, Send, ExternalLink,
} from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
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

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
          <Avatar className="h-24 w-24">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.firstName} />}
            <AvatarFallback className="text-xl">{getInitials(profile)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold">
              {profile.firstName} {profile.lastName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
              {profile.university && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.university}
                </span>
              )}
              {profile.faculty && <span>&middot; {profile.faculty}</span>}
              {profile.course && <span>&middot; {yearLabel(profile.course)}</span>}
            </div>

            {profile.bio && (
              <p className="mt-3 text-sm text-foreground">{profile.bio}</p>
            )}

            {/* Social links */}
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.socialLinks?.telegram && (
                <a
                  href={`https://t.me/${profile.socialLinks.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Badge variant="outline" className="gap-1">
                    <Send className="h-3 w-3" /> Telegram
                  </Badge>
                </a>
              )}
              {profile.socialLinks?.vk && (
                <a
                  href={`https://vk.com/${profile.socialLinks.vk}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Badge variant="outline" className="gap-1">
                    <ExternalLink className="h-3 w-3" /> VK
                  </Badge>
                </a>
              )}
            </div>

            {/* Skills */}
            {(profile.skills?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.skills?.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            )}
          </div>

          {isOwnProfile && (
            <Link to={ROUTES.EDIT_PROFILE}>
              <Button variant="outline" size="sm" className="gap-1">
                <Pencil className="h-4 w-4" /> Редактировать
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        {[
          { label: 'Материалы', value: profile.materialCount ?? 0, icon: FileText, color: 'text-primary' },
          { label: 'Отзывы', value: profile.reviewCount ?? 0, icon: MessageSquare, color: 'text-warning' },
          { label: 'Репутация', value: profile.reputation ?? 0, icon: Star, color: 'text-success' },
          { label: 'Вопросы', value: profile.questionCount ?? 0, icon: HelpCircle, color: 'text-purple-600' },
        ].map((s) => (
          <motion.div key={s.label} variants={item}>
            <Card className="p-4 text-center">
              <s.icon className={`mx-auto h-5 w-5 ${s.color}`} />
              <p className="mt-1 text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="materials">Материалы</TabsTrigger>
          <TabsTrigger value="reviews">Отзывы</TabsTrigger>
          <TabsTrigger value="activity">Активность</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2">
            {!materials?.items?.length ? (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                Материалы не найдены
              </p>
            ) : (
              materials.items.map((m) => (
                <motion.div key={m.id} variants={item}>
                  <Link to={ROUTES.MATERIAL_DETAIL(m.id)}>
                    <Card interactive className="p-4">
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
              <p className="py-10 text-center text-sm text-muted-foreground">
                Отзывы не найдены
              </p>
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
            <div className="py-10 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
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
            <div className="py-10 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
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
