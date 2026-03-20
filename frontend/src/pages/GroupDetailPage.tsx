import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Users, Crown, LogOut, Lock, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import { GroupChat } from '@/components/features/groups/GroupChat'
import { useAuthStore } from '@/store/auth.store'
import { groupsService, type GroupMember } from '@/services/groups.service'
import { formatRelative } from '@/lib/format-date'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'

const TYPE_LABELS: Record<string, string> = {
  study: 'Учёба', project: 'Проект', exam_prep: 'Подготовка к экзамену',
}

const container = { show: { transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => groupsService.getGroupById(id!),
    enabled: !!id,
  })

  const leaveMutation = useMutation({
    mutationFn: () => groupsService.leaveGroup(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast({ title: 'Вы покинули группу', variant: 'success' })
      navigate(ROUTES.GROUPS)
    },
    onError: () => toast({ title: 'Ошибка', description: 'Не удалось покинуть группу', variant: 'error' }),
  })

  const closeGroupMutation = useMutation({
    mutationFn: () => groupsService.deleteGroup(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast({ title: 'Группа закрыта', variant: 'success' })
      navigate(ROUTES.GROUPS)
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось закрыть группу', variant: 'error' })
    },
  })

  const [confirmClose, setConfirmClose] = useState(false)

  const isMember = (group?.members ?? []).some((m) => m.userId === user?.id)
  const isLeader = group?.leaderId === user?.id

  if (isLoading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </PageTransition>
    )
  }

  if (!group) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center py-16">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Группа не найдена</p>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <Breadcrumbs current={group.name} className="mb-4" />
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.GROUPS)}>
          <ArrowLeft className="h-4 w-4" /> Назад к группам
        </Button>

        <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {group.courseName && <Badge variant="secondary">{group.courseName}</Badge>}
              {group.type && <Badge variant="outline">{TYPE_LABELS[group.type] ?? group.type}</Badge>}
              <Badge className={cn(group.isOpen ? 'bg-success/10 text-success border-success/30' : 'bg-warning/10 text-warning border-warning/30')} variant="outline">
                {group.isOpen ? 'Открыта' : 'Закрыта'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {isMember && !isLeader && (
              <Button variant="outline" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending}>
                {leaveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Покинуть
              </Button>
            )}
            {isLeader && (
              confirmClose ? (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => closeGroupMutation.mutate()}
                    disabled={closeGroupMutation.isPending}
                  >
                    {closeGroupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Подтвердить
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirmClose(false)}>
                    Отмена
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmClose(true)}
                >
                  <Lock className="h-4 w-4" /> Закрыть группу
                </Button>
              )
            )}
          </div>
        </div>

        {group.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{group.description}</p>
        )}

        </div>

        <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" /> Участники ({group.currentMembers}/{group.maxMembers})
        </h2>
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
          {group.members.map((m: GroupMember) => (
            <motion.div key={m.userId} variants={item}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <Avatar className="h-10 w-10">
                {m.avatarUrl && <AvatarImage src={m.avatarUrl} />}
                <AvatarFallback>{m.firstName?.charAt(0)}{m.lastName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.firstName} {m.lastName}</p>
                <p className="text-xs text-muted-foreground">{formatRelative(m.joinedAt)}</p>
              </div>
              <Badge variant={m.role === 'leader' ? 'default' : 'secondary'} className="shrink-0">
                {m.role === 'leader' ? <><Crown className="h-3 w-3 mr-1" /> Лидер</> : 'Участник'}
              </Badge>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <Separator />

        {isMember && user && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Чат группы</h2>
            <GroupChat groupId={id!} currentUserId={user.id} />
          </div>
        )}
      </div>
    </PageTransition>
  )
}
