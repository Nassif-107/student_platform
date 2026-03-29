import { useState, useCallback, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MessageSquare, Plus, Search, Eye, CheckCircle2, CircleDot, Filter,
} from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { forumService, type ForumQuestion } from '@/services/forum.service'
import { coursesService } from '@/services/courses.service'
import { useDebounce } from '@/hooks/useDebounce'
import { formatRelative } from '@/lib/format-date'
import { ROUTES, DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { cn } from '@/lib/cn'

type StatusFilter = 'all' | 'open' | 'solved'
type SortOption = 'new' | 'popular' | 'unanswered'

const container = { show: { transition: { staggerChildren: 0.02 } } }
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function ForumPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('new')
  const [courseFilter, setCourseFilter] = useState<string>('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const debouncedSearch = useDebounce(search, 300)
  const observerRef = useRef<HTMLDivElement>(null)

  const { data: coursesData } = useQuery({
    queryKey: ['courses', 'all'],
    queryFn: () => coursesService.getCourses({ limit: 100 }),
  })
  const coursesList = coursesData?.items ?? []

  const buildParams = useCallback((page: number) => ({
    page,
    limit: DEFAULT_PAGE_SIZE,
    search: debouncedSearch || undefined,
    courseId: courseFilter || undefined,
    tag: tagFilter || undefined,
    isSolved: statusFilter === 'all' ? undefined : statusFilter === 'solved',
    sortBy: sortOption === 'popular' ? 'voteCount' as const
      : sortOption === 'unanswered' ? 'answerCount' as const
      : 'createdAt' as const,
    sortOrder: sortOption === 'unanswered' ? 'asc' as const : 'desc' as const,
  }), [debouncedSearch, courseFilter, tagFilter, statusFilter, sortOption])

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
  } = useInfiniteQuery({
    queryKey: ['forum-questions', debouncedSearch, courseFilter, tagFilter, statusFilter, sortOption],
    queryFn: ({ pageParam = 1 }) => forumService.getQuestions(buildParams(pageParam)),
    getNextPageParam: (last) => last.page < last.totalPages ? last.page + 1 : undefined,
    initialPageParam: 1,
  })

  const questions = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.total ?? 0

  useEffect(() => {
    const el = observerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage() },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <PageTransition className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Форум</h1>
          {!isLoading && (
            <p className="text-sm text-muted-foreground">{total} вопросов</p>
          )}
        </div>
        <Button onClick={() => navigate(ROUTES.ASK_QUESTION)}>
          <Plus className="h-4 w-4" /> Задать вопрос
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск вопросов..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={courseFilter || '__all__'} onValueChange={(v) => setCourseFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[180px]"><Filter className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Курс" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Все курсы</SelectItem>
            {coursesList.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="open">Открытые</SelectItem>
            <SelectItem value="solved">Решённые</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Тег..." className="w-[140px]" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} />
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Сортировка" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Новые</SelectItem>
            <SelectItem value="popular">Популярные</SelectItem>
            <SelectItem value="unanswered">Без ответа</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} variant="forum" />
        ))}</div>
      ) : questions.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Вопросов пока нет</p>
          <p className="text-sm text-muted-foreground mt-1">Станьте первым, кто задаст вопрос!</p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {questions.map((q: ForumQuestion) => (
            <motion.div key={q.id} variants={item} whileHover={{ y: -2 }}>
              <Link to={ROUTES.QUESTION_DETAIL(q.id)} className="block rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-semibold truncate">{q.title}</span>
                      <Badge className={cn('shrink-0', q.isSolved ? 'bg-success/10 text-success border-success/30' : 'bg-info/10 text-info border-info/30')} variant="outline">
                        {q.isSolved ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Решён</> : <><CircleDot className="h-3 w-3 mr-1" /> Открыт</>}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(q.tags ?? []).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />{q.answerCount}</span>
                    <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{q.viewCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  <Link to={ROUTES.PROFILE(q.authorId)} className="flex items-center gap-2 group/author w-fit">
                    <Avatar className="h-6 w-6">
                      {q.authorAvatarUrl && <AvatarImage src={q.authorAvatarUrl} />}
                      <AvatarFallback className="text-xs">{q.authorName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground group-hover/author:text-primary transition-colors">{q.authorName}</span>
                  </Link>
                  <span className="text-xs text-muted-foreground">{formatRelative(q.createdAt)}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div ref={observerRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => (
          <SkeletonCard key={i} variant="forum" />
        ))}</div>
      )}
    </PageTransition>
  )
}
