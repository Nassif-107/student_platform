import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GraduationCap, Search, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { professorsService, type Professor } from '@/services/professors.service'
import { useDebounce } from '@/hooks/useDebounce'
import { PageTransition } from '@/components/shared/PageTransition'
import { ROUTES } from '@/lib/constants'

const container = { show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

function ProfessorSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border p-4">
      <Skeleton className="h-14 w-14 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-6 w-14" />
    </div>
  )
}

export function ProfessorsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [accumulated, setAccumulated] = useState<Professor[]>([])
  const debouncedSearch = useDebounce(search, 300)
  const prevSearch = useRef(debouncedSearch)

  useEffect(() => {
    if (prevSearch.current !== debouncedSearch) {
      setPage(1)
      setAccumulated([])
      prevSearch.current = debouncedSearch
    }
  }, [debouncedSearch])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['professors', debouncedSearch, page],
    queryFn: () =>
      professorsService.getProfessors({
        search: debouncedSearch || undefined,
        sortBy: 'averageRating',
        sortOrder: 'desc',
        page,
        limit: 20,
      }),
  })

  useEffect(() => {
    if (data?.items) {
      setAccumulated((prev) => {
        if (page === 1) return data.items
        const existingIds = new Set(prev.map((p) => p.id))
        const newItems = data.items.filter((item) => !existingIds.has(item.id))
        return [...prev, ...newItems]
      })
    }
  }, [data, page])

  const hasMore = data ? page < (data.totalPages ?? Math.ceil((data.total ?? 0) / 20)) : false

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Преподаватели</h1>
        <p className="text-muted-foreground">
          Рейтинг и отзывы о преподавателях
        </p>

        <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени или кафедре..."
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ProfessorSkeleton key={i} />
          ))}
        </div>
      ) : !accumulated.length ? (
        <div className="flex flex-col items-center py-20">
          <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">
            {search ? 'Преподаватели не найдены' : 'Преподаватели пока не добавлены'}
          </p>
        </div>
      ) : (
        <>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {accumulated.map((prof: Professor) => (
              <motion.div key={prof.id} variants={item}>
                <Link to={ROUTES.PROFESSOR_DETAIL(prof.id)}>
                  <div className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5">
                    <Avatar className="h-14 w-14">
                      {prof.avatarUrl && <AvatarImage src={prof.avatarUrl} alt={prof.lastName} />}
                      <AvatarFallback className="text-lg">
                        {prof.lastName?.[0]}{prof.firstName?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        {prof.lastName} {prof.firstName} {prof.middleName ?? ''}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {prof.position} · {prof.department}
                      </p>
                      {prof.courseCount > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {prof.courseCount} курсов
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-lg font-bold text-foreground">
                          {(prof.averageRating ?? 0).toFixed(1)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {prof.reviewCount} отзывов
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={isFetching}>
                {isFetching ? 'Загрузка...' : 'Загрузить ещё'}
              </Button>
            </div>
          )}
        </>
      )}
      </div>
    </PageTransition>
  )
}
