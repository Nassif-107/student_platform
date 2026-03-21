import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, Search, Star, Users } from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger'
import { coursesService, type CoursesParams, type Course } from '@/services/courses.service'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import { useDebounce } from '@/hooks/useDebounce'
import { pluralize } from '@/lib/format-number'
import { ROUTES } from '@/lib/constants'

export function CoursesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [accumulated, setAccumulated] = useState<Course[]>([])
  const debouncedSearch = useDebounce(search)
  const prevSearch = useRef(debouncedSearch)

  // Reset pagination when search changes
  useEffect(() => {
    if (prevSearch.current !== debouncedSearch) {
      setPage(1)
      setAccumulated([])
      prevSearch.current = debouncedSearch
    }
  }, [debouncedSearch])

  // Reset accumulated data on mount (navigating to page)
  useEffect(() => {
    setPage(1)
    setAccumulated([])
  }, [])

  const params: CoursesParams = {
    search: debouncedSearch || undefined,
    page,
    limit: 20,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['courses', params],
    queryFn: () => coursesService.getCourses(params),
  })

  useEffect(() => {
    if (data?.items) {
      setAccumulated((prev) => {
        if (page === 1) return data.items
        const existingIds = new Set(prev.map((c) => c.id))
        const newItems = data.items.filter((item) => !existingIds.has(item.id))
        return [...prev, ...newItems]
      })
    }
  }, [data, page])

  const hasMore = data ? page < (data.totalPages ?? Math.ceil((data.total ?? 0) / 20)) : false

  const handleLoadMore = useCallback(() => setPage((p) => p + 1), [])

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Курсы</h1>
          <p className="text-muted-foreground">
            Каталог доступных учебных курсов
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск курсов..."
          aria-label="Поиск курсов"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} variant="course" />
          ))}
        </div>
      ) : !accumulated.length ? (
        <div className="flex flex-col items-center py-20">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Курсы не найдены</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accumulated.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index % 20) * 0.015 }}
              >
                <Link
                  to={ROUTES.COURSE_DETAIL(course.id)}
                  className="group block rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium text-primary">
                        {course.code}
                      </span>
                      <h3 className="mt-1 font-semibold text-foreground group-hover:text-primary transition-colors">
                        {course.name}
                      </h3>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {course.description}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      {(course.rating ?? 0).toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {pluralize(course.enrolledCount, 'студент', 'студента', 'студентов')}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(course.tags ?? []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <InfiniteScrollTrigger
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoading={isFetching}
          />
        </>
      )}
    </PageTransition>
  )
}
