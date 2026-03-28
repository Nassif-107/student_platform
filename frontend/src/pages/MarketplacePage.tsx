import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useInfiniteQuery } from '@tanstack/react-query'
import { PageTransition } from '@/components/shared/PageTransition'
import { Plus, BookOpen, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchBar } from '@/components/shared/SearchBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { DateBadge } from '@/components/shared/DateBadge'
import { useDebounce } from '@/hooks/useDebounce'
import { ROUTES, DEFAULT_PAGE_SIZE } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { marketplaceService } from '@/services/marketplace.service'
import type { Listing, ListingsParams } from '@/services/marketplace.service'

const TYPE_LABELS: Record<string, string> = {
  sell: 'Продажа',
  buy: 'Покупка',
  exchange: 'Обмен',
  free: 'Бесплатно',
}

const CONDITION_LABELS: Record<string, string> = {
  'отличное': 'Отличное',
  'хорошее': 'Хорошее',
  'нормальное': 'Нормальное',
  'потрёпанное': 'Потрёпанное',
}

const TYPE_COLORS: Record<string, string> = {
  sell: 'bg-info/10 text-info',
  buy: 'bg-warning/10 text-warning',
  exchange: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  free: 'bg-success/10 text-success',
}

const container = { show: { transition: { staggerChildren: 0.06 } } }
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function ListingCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

function ListingCard({ listing }: { listing: Listing }) {
  const typeKey = listing.type || (listing.price === 0 ? 'free' : 'sell')

  return (
    <motion.div variants={item}>
      <Link to={ROUTES.LISTING_DETAIL(listing.id)} className="group block rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5">
        <div className="relative h-44 bg-muted flex items-center justify-center overflow-hidden">
          {(listing.images?.length ?? 0) > 0 ? (
            <img
              src={listing.images?.[0]}
              alt={listing.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
          )}
          {!listing.isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Badge variant="destructive">Продано</Badge>
            </div>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">
            {listing.title}
          </h3>
          <p className="text-lg font-bold text-primary">
            {listing.price === 0 ? 'Бесплатно' : `${listing.price} ₽`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge className={cn('text-xs', TYPE_COLORS[typeKey])}>
              {TYPE_LABELS[typeKey]}
            </Badge>
            {listing.condition && (
              <Badge variant="outline" className="text-xs">
                {CONDITION_LABELS[listing.condition] ?? listing.condition}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            <Link to={ROUTES.PROFILE(listing.authorId)} onClick={(e) => e.stopPropagation()} className="hover:text-primary transition-colors">{listing.authorName}</Link>
            {listing.university ? ` · ${listing.university}` : ''}
          </p>
          <DateBadge date={listing.createdAt} />
        </div>
      </Link>
    </motion.div>
  )
}

export function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [condition, setCondition] = useState<string>('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const debouncedMinPrice = useDebounce(minPrice, 500)
  const debouncedMaxPrice = useDebounce(maxPrice, 500)
  const observerRef = useRef<HTMLDivElement>(null)

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const buildParams = (page: number): ListingsParams => ({
    page,
    limit: DEFAULT_PAGE_SIZE,
    search: search || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    condition: condition !== 'all' ? (condition as ListingsParams['condition']) : undefined,
    minPrice: debouncedMinPrice ? Number(debouncedMinPrice) : undefined,
    maxPrice: debouncedMaxPrice ? Number(debouncedMaxPrice) : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['listings', search, typeFilter, condition, debouncedMinPrice, debouncedMaxPrice],
    queryFn: ({ pageParam }) => marketplaceService.getListings(buildParams(pageParam)),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  })

  useEffect(() => {
    const el = observerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const listings = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-foreground">Маркетплейс учебников</h1>
        <Button asChild>
          <Link to={ROUTES.NEW_LISTING}>
            <Plus className="h-4 w-4" />
            Создать объявление
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <SearchBar onSearch={handleSearch} placeholder="Поиск объявлений..." className="sm:w-64" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="sell">Продажа</SelectItem>
            <SelectItem value="buy">Покупка</SelectItem>
            <SelectItem value="exchange">Обмен</SelectItem>
            <SelectItem value="free">Бесплатно</SelectItem>
          </SelectContent>
        </Select>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Состояние" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Любое</SelectItem>
            <SelectItem value="отличное">Отличное</SelectItem>
            <SelectItem value="хорошее">Хорошее</SelectItem>
            <SelectItem value="нормальное">Нормальное</SelectItem>
            <SelectItem value="потрёпанное">Потрёпанное</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Цена от"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-28"
          />
          <Input
            type="number"
            placeholder="Цена до"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-28"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </motion.div>
        ) : listings.length === 0 ? (
          <EmptyState
            key="empty"
            icon={<ImageIcon className="h-7 w-7 text-muted-foreground" />}
            title="Объявления не найдены"
            description="Попробуйте изменить параметры поиска или создайте первое объявление"
            action={
              <Button asChild variant="outline">
                <Link to={ROUTES.NEW_LISTING}>Создать объявление</Link>
              </Button>
            }
          />
        ) : (
          <motion.div
            key="grid"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={observerRef} className="h-8" />
      {isFetchingNextPage && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <ListingCardSkeleton key={`next-${i}`} />
          ))}
        </div>
      )}
    </PageTransition>
  )
}
