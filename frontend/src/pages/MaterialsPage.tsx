import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileText, Search, Upload, Download, Heart } from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger'
import { materialsService, type MaterialsParams, type Material } from '@/services/materials.service'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import { useDebounce } from '@/hooks/useDebounce'
import { formatRelative } from '@/lib/format-date'
import { formatNumber } from '@/lib/format-number'
import { ROUTES } from '@/lib/constants'

export function MaterialsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [page, setPage] = useState(1)
  const [accumulated, setAccumulated] = useState<Material[]>([])
  const debouncedSearch = useDebounce(search)
  const prevSearch = useRef(debouncedSearch)

  useEffect(() => {
    if (prevSearch.current !== debouncedSearch) {
      setPage(1)
      setAccumulated([])
      prevSearch.current = debouncedSearch
    }
  }, [debouncedSearch])

  useEffect(() => {
    setPage(1)
    setAccumulated([])
  }, [])

  const params: MaterialsParams = {
    search: debouncedSearch || undefined,
    page,
    limit: 20,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['materials', params],
    queryFn: () => materialsService.getMaterials(params),
  })

  useEffect(() => {
    if (data?.items) {
      setAccumulated((prev) => {
        if (page === 1) return data.items
        const existingIds = new Set(prev.map((m) => m.id))
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

      {/* Search */}
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
      ) : !accumulated.length ? (
        <div className="flex flex-col items-center py-20">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Материалы не найдены</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accumulated.map((material, index) => (
            <motion.div
              key={material.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
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
            </motion.div>
          ))}

          <InfiniteScrollTrigger
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoading={isFetching}
          />
        </div>
      )}
    </PageTransition>
  )
}
