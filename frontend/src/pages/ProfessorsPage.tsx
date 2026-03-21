import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GraduationCap, Search, Star } from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { professorsService, type Professor } from '@/services/professors.service'
import { useDebounce } from '@/hooks/useDebounce'
import { ROUTES } from '@/lib/constants'

function ProfessorSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-card p-4">
      <div className="h-12 w-12 rounded-full skeleton-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 rounded skeleton-shimmer" />
        <div className="h-3 w-28 rounded skeleton-shimmer" />
      </div>
      <div className="h-4 w-12 rounded skeleton-shimmer" />
    </div>
  )
}

export function ProfessorsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['professors', debouncedSearch],
    queryFn: () => professorsService.getProfessors({
      search: debouncedSearch || undefined,
      limit: 100,
    }),
  })

  const professors = data?.items ?? []

  return (
    <PageTransition className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Преподаватели</h1>
        <p className="text-muted-foreground">Рейтинг и отзывы</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск преподавателей..."
          aria-label="Поиск преподавателей"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ProfessorSkeleton key={i} />
          ))}
        </div>
      ) : !professors.length ? (
        <div className="flex flex-col items-center py-20">
          <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Преподаватели не найдены</p>
        </div>
      ) : (
        <div className="space-y-3">
          {professors.map((prof: Professor) => (
            <Link key={prof.id} to={ROUTES.PROFESSOR_DETAIL(prof.id)}>
              <div className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {prof.firstName?.[0]}{prof.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {prof.lastName} {prof.firstName} {prof.middleName ?? ''}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {prof.department} &middot; {prof.position}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-medium">{(prof.averageRating ?? 0).toFixed(1)}</span>
                  <span className="text-muted-foreground text-xs">({prof.reviewCount})</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageTransition>
  )
}
