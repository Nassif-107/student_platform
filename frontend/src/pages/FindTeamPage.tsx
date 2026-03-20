import { useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Search, Users, UserPlus, X, Tag, Star, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { groupsService } from '@/services/groups.service'
import { socialService } from '@/services/social.service'
import { coursesService } from '@/services/courses.service'
import { PageTransition } from '@/components/shared/PageTransition'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ROUTES } from '@/lib/constants'

interface Teammate {
  id: string
  userId: string
  firstName: string
  lastName: string
  avatarUrl?: string
  faculty?: string
  year?: number
  reputation?: number
  mutualFriends?: number
  sharedCourses?: number
  matchedSkills?: string[]
  score?: number
}

const container = { show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export function FindTeamPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [courseId, setCourseId] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [results, setResults] = useState<Teammate[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => coursesService.getCourses({ limit: 100 }),
  })

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault()
      const newSkill = skillInput.trim()
      if (!skills.includes(newSkill) && skills.length < 10) {
        setSkills([...skills, newSkill])
      }
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => setSkills(skills.filter((s) => s !== skill))

  const handleSearch = async () => {
    if (!courseId) {
      toast({ title: 'Выберите курс', variant: 'error' })
      return
    }
    setIsSearching(true)
    try {
      const data = await groupsService.findTeammates({
        courseId,
        skills: skills.length > 0 ? skills : undefined,
      })
      setResults((data.items ?? []) as Teammate[])
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить поиск', variant: 'error' })
    } finally {
      setIsSearching(false)
    }
  }

  const [addingFriendId, setAddingFriendId] = useState<string | null>(null)

  const friendMutation = useMutation({
    mutationFn: (userId: string) => socialService.sendFriendRequest(userId),
    onMutate: (userId) => { setAddingFriendId(userId) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      toast({ title: 'Запрос отправлен', variant: 'success' })
      setAddingFriendId(null)
    },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось отправить запрос', variant: 'error' }); setAddingFriendId(null) },
  })

  return (
    <PageTransition>
      <Breadcrumbs current="Поиск команды" className="mb-4" />
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(ROUTES.GROUPS)}>
          <ArrowLeft className="h-4 w-4" /> Назад к группам
        </Button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-6">Найти команду</h1>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Курс <span className="text-destructive">*</span></Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите курс" />
                </SelectTrigger>
                <SelectContent>
                  {courses?.items?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Нужные навыки <span className="text-muted-foreground">(необязательно)</span></Label>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-input p-2 min-h-[42px]">
                {skills.map((s) => (
                  <Badge key={s} variant="secondary" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />{s}
                    <button type="button" onClick={() => removeSkill(s)} title="Удалить навык" className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Навык + Enter..."
                  className="flex-1 border-0 p-0 shadow-none focus-visible:ring-0 min-w-[120px]"
                />
              </div>
            </div>

            <Button onClick={handleSearch} disabled={isSearching || !courseId} className="w-full">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Найти
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {isSearching && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 flex gap-4">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {results !== null && !isSearching && (
        results.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Не нашли подходящих кандидатов</p>
            <p className="text-sm text-muted-foreground mt-1">Попробуйте изменить параметры поиска</p>
          </motion.div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
            <h2 className="text-lg font-semibold">Рекомендации ({results.length})</h2>
            {results.map((t) => (
              <motion.div key={t.userId} variants={item} whileHover={{ y: -2 }}
                className="rounded-xl border bg-card p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-md hover:border-primary/20"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{t.firstName?.charAt(0)}{t.lastName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{t.firstName} {t.lastName}</p>
                    {t.reputation !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-0.5" />{t.reputation}
                      </Badge>
                    )}
                  </div>
                  {(t.faculty || t.year) && (
                    <p className="text-sm text-muted-foreground">
                      {t.faculty}{t.faculty && t.year ? ', ' : ''}{t.year ? `${t.year} курс` : ''}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {t.mutualFriends !== undefined && t.mutualFriends > 0 && (
                      <span>Общих друзей: {t.mutualFriends}</span>
                    )}
                    {t.sharedCourses !== undefined && t.sharedCourses > 0 && (
                      <span>Общих курсов: {t.sharedCourses}</span>
                    )}
                    {t.matchedSkills && t.matchedSkills.length > 0 && (
                      <span>Навыки: {t.matchedSkills.join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => friendMutation.mutate(t.userId ?? t.id)}
                    disabled={addingFriendId === (t.userId ?? t.id)}
                  >
                    <UserPlus className="h-3 w-3" /> Добавить в друзья
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )
      )}
      </div>
    </PageTransition>
  )
}
