import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Search, Upload, Download, Heart } from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { materialsService, type Material } from '@/services/materials.service'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import { useDebounce } from '@/hooks/useDebounce'
import { formatRelative } from '@/lib/format-date'
import { formatNumber } from '@/lib/format-number'
import { ROUTES } from '@/lib/constants'

export function MaterialsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const debouncedSearch = useDebounce(search)

  const { data, isLoading } = useQuery({
    queryKey: ['materials', debouncedSearch],
    queryFn: () => materialsService.getMaterials({
      search: debouncedSearch || undefined,
      limit: 100,
    }),
  })

  const materials = data?.items ?? []

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Материалы</h1>
          <p className="text-muted-foreground">
            Учебные материалы от студентов
          </p>
        </div>
        <Link
          to={ROUTES.MATERIAL_UPLOAD}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Загрузить
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск материалов..."
          aria-label="Поиск материалов"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} variant="material" />
          ))}
        </div>
      ) : !materials.length ? (
        <div className="flex flex-col items-center py-20">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Материалы не найдены</p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material: Material) => (
            <Link
              key={material.id}
              to={ROUTES.MATERIAL_DETAIL(material.id)}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="rounded-lg bg-accent p-2.5">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {material.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {material.authorName} &middot; {formatRelative(material.createdAt)}
                </p>
              </div>
              <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
                <span className="flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" />
                  {formatNumber(material.downloadCount)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {formatNumber(material.likeCount)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageTransition>
  )
}
