import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
  Users, Plus, Search, Loader2, UserPlus,
} from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/store/auth.store'
import { groupsService, type Group, type GroupType } from '@/services/groups.service'
import { coursesService } from '@/services/courses.service'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { useTabParam } from '@/hooks/useTabParam'

const createGroupSchema = z.object({
  name: z.string().min(3, 'Минимум 3 символа').max(100, 'Максимум 100 символов'),
  courseId: z.string().min(1, 'Выберите курс'),
  type: z.enum(['study', 'project', 'exam_prep'], { required_error: 'Выберите тип' }),
  description: z.string().max(500).optional(),
  maxMembers: z.coerce.number().min(2, 'Минимум 2').max(10, 'Максимум 10').optional(),
})

type CreateGroupForm = z.infer<typeof createGroupSchema>

const TYPE_LABELS: Record<string, string> = {
  study: 'Учёба', project: 'Проект', exam_prep: 'Подготовка к экзамену',
}

const GROUP_TYPES: { value: GroupType; label: string }[] = [
  { value: 'study', label: 'Учёба' },
  { value: 'project', label: 'Проект' },
  { value: 'exam_prep', label: 'Подготовка к экзамену' },
]

const container = { show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

export function GroupsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [tab, setTab] = useTabParam('my')
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null)

  const { data: coursesData } = useQuery({
    queryKey: ['courses', 'all'],
    queryFn: () => coursesService.getCourses({ limit: 100 }),
  })
  const coursesList = coursesData?.items ?? []

  const { data: allGroups, isLoading: allLoading } = useQuery({
    queryKey: ['groups', 'all', search, courseFilter],
    queryFn: () => groupsService.getGroups({
      search: search || undefined,
      courseId: courseFilter || undefined,
      isOpen: true,
    }),
  })

  const { data: myGroups, isLoading: myLoading } = useQuery({
    queryKey: ['groups', 'my'],
    queryFn: () => groupsService.getGroups({}),
  })

  const myGroupsList = (myGroups?.items ?? []).filter((g) =>
    (g.members ?? []).some((m) => m.userId === user?.id),
  )

  const joinMutation = useMutation({
    mutationFn: (id: string) => groupsService.joinGroup(id),
    onMutate: (id) => { setJoiningGroupId(id) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast({ title: 'Вы вступили в группу', variant: 'success' })
      setJoiningGroupId(null)
    },
    onError: (err) => { toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось вступить в группу', variant: 'error' }); setJoiningGroupId(null) },
  })

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { maxMembers: 5, type: 'study' },
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateGroupForm) => {
      const course = coursesList.find((c) => c.id === data.courseId)
      return groupsService.createGroup({
        name: data.name,
        courseId: data.courseId,
        courseTitle: course?.name ?? '',
        type: data.type,
        description: data.description,
        maxMembers: data.maxMembers,
      })
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setDialogOpen(false)
      reset()
      toast({ title: 'Группа создана', variant: 'success' })
      navigate(ROUTES.GROUP_DETAIL(created.id))
    },
    onError: (err) => toast({ title: 'Ошибка', description: err instanceof Error ? err.message : 'Не удалось создать группу', variant: 'error' }),
  })

  const isMember = (group: Group) => (group.members ?? []).some((m) => m.userId === user?.id)

  const renderGroupCard = (group: Group) => (
    <motion.div key={group.id} variants={item} whileHover={{ y: -2 }}
      className="rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer"
      onClick={() => navigate(ROUTES.GROUP_DETAIL(group.id))}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{group.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {group.courseName && <Badge variant="secondary">{group.courseName}</Badge>}
            {group.type && <Badge variant="outline">{TYPE_LABELS[group.type] ?? group.type}</Badge>}
            <Badge className={cn(group.isOpen ? 'bg-success/10 text-success border-success/30' : 'bg-warning/10 text-warning border-warning/30')} variant="outline">
              {group.isOpen ? 'Открыта' : 'Набрана'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {(group.members ?? []).slice(0, 3).map((m) => (
              <Avatar key={m.userId} className="h-7 w-7 border-2 border-background">
                {m.avatarUrl && <AvatarImage src={m.avatarUrl} />}
                <AvatarFallback className="text-xs">{m.firstName?.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          {group.currentMembers > 3 && (
            <span className="ml-2 text-xs text-muted-foreground">+{group.currentMembers - 3}</span>
          )}
          <span className="ml-3 text-sm text-muted-foreground">
            {group.currentMembers}/{group.maxMembers}
          </span>
        </div>
        {group.isOpen && !isMember(group) && (
          <Button size="sm" variant="outline" disabled={joiningGroupId === group.id} onClick={(e) => { e.stopPropagation(); joinMutation.mutate(group.id) }}>
            {joiningGroupId === group.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />} Вступить
          </Button>
        )}
      </div>
    </motion.div>
  )

  const renderSkeleton = () => (
    <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div>
        <Skeleton className="h-4 w-1/3" />
      </div>
    ))}</div>
  )

  const renderEmpty = (message: string) => (
    <div className="flex flex-col items-center py-16">
      <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )

  return (
    <PageTransition className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Учебные группы</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(ROUTES.FIND_TEAM)}>
            <Search className="h-4 w-4" /> Найти команду
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Создать группу</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создать группу</DialogTitle>
                <DialogDescription>Заполните информацию о новой группе</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input {...register('name')} placeholder="Название группы" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Курс</Label>
                  <Select onValueChange={(v) => setValue('courseId', v)}>
                    <SelectTrigger><SelectValue placeholder="Выберите курс" /></SelectTrigger>
                    <SelectContent>
                      {coursesList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.courseId && <p className="text-xs text-destructive">{errors.courseId.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Тип</Label>
                    <Select defaultValue="study" onValueChange={(v) => setValue('type', v as CreateGroupForm['type'])}>
                      <SelectTrigger><SelectValue placeholder="Тип группы" /></SelectTrigger>
                      <SelectContent>
                        {GROUP_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Макс. участников</Label>
                    <Input type="number" {...register('maxMembers')} />
                    {errors.maxMembers && <p className="text-xs text-destructive">{errors.maxMembers.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Описание <span className="text-muted-foreground">(необязательно)</span></Label>
                  <Textarea {...register('description')} placeholder="Описание группы" />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Создать
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="my">Мои группы</TabsTrigger>
          <TabsTrigger value="all">Все группы</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          {myLoading ? renderSkeleton() : myGroupsList.length === 0
            ? renderEmpty('Вы пока не состоите ни в одной группе')
            : <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">{myGroupsList.map(renderGroupCard)}</motion.div>}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Поиск групп..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={courseFilter || '__all__'} onValueChange={(v) => setCourseFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Курс" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все курсы</SelectItem>
                {coursesList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {allLoading ? renderSkeleton() : (allGroups?.items ?? []).length === 0
            ? renderEmpty('Групп не найдено')
            : <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">{(allGroups?.items ?? []).map(renderGroupCard)}</motion.div>}
        </TabsContent>
      </Tabs>
    </PageTransition>
  )
}
