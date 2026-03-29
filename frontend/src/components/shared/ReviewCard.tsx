import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ThumbsUp, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { RatingStars } from '@/components/shared/RatingStars'
import { reviewsService } from '@/services/reviews.service'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format-date'
import { ROUTES } from '@/lib/constants'

interface ReviewCardProps {
  review: {
    id: string
    authorId?: string
    authorName?: string
    rating: number
    text: string
    likeCount?: number
    isLiked?: boolean
    createdAt?: string
  }
  /** Extra line below the author name (e.g. course name) */
  subtitle?: string
  /** Query keys to invalidate / optimistically update after like */
  queryKey: unknown[]
  /** Variant changes visual layout */
  variant?: 'default' | 'compact'
  className?: string
}

export function ReviewCard({
  review,
  subtitle,
  queryKey,
  variant = 'default',
  className,
}: ReviewCardProps) {
  const queryClient = useQueryClient()

  const helpfulMutation = useMutation({
    mutationFn: () => reviewsService.likeReview(review.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        // Handle paginated response shape { items: [...] }
        if (old.items && Array.isArray(old.items)) {
          return {
            ...old,
            items: old.items.map((r: { id: string; isLiked?: boolean; likeCount?: number }) =>
              r.id === review.id
                ? {
                    ...r,
                    isLiked: !r.isLiked,
                    likeCount: (r.likeCount ?? 0) + (r.isLiked ? -1 : 1),
                  }
                : r,
            ),
          }
        }
        // Handle plain array shape
        if (Array.isArray(old)) {
          return old.map((r: { id: string; isLiked?: boolean; likeCount?: number }) =>
            r.id === review.id
              ? {
                  ...r,
                  isLiked: !r.isLiked,
                  likeCount: (r.likeCount ?? 0) + (r.isLiked ? -1 : 1),
                }
              : r,
          )
        }
        return old
      })
      return { previous }
    },
    onSuccess: (result) => {
      // Merge server response into cache instead of refetching (which would lose isLiked)
      const res = result as unknown as { liked?: boolean; likeCount?: number }
      if (typeof res.liked === 'boolean') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old
          const update = (r: any) => r.id === review.id ? { ...r, isLiked: res.liked, likeCount: res.likeCount ?? r.likeCount } : r
          if (old.items && Array.isArray(old.items)) return { ...old, items: old.items.map(update) }
          if (Array.isArray(old)) return old.map(update)
          return old
        })
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
  })

  if (variant === 'compact') {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center justify-between">
          {review.authorId ? (
            <Link to={ROUTES.PROFILE(review.authorId)} className="font-medium hover:text-primary transition-colors">{subtitle ?? review.authorName ?? 'Аноним'}</Link>
          ) : (
            <p className="font-medium">{subtitle ?? review.authorName ?? 'Аноним'}</p>
          )}
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="h-4 w-4 fill-current" />
            <span className="text-sm font-medium">{review.rating}</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{review.text}</p>
        <div className="mt-2 flex items-center justify-between">
          {review.createdAt && (
            <p className="text-xs text-muted-foreground">{formatRelative(review.createdAt)}</p>
          )}
          <button
            onClick={() => helpfulMutation.mutate()}
            disabled={helpfulMutation.isPending}
            className={cn(
              'flex items-center gap-1 text-sm rounded-md px-2 py-1 transition-colors',
              review.isLiked
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>{review.likeCount ?? 0}</span>
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {review.authorId ? (
            <Link to={ROUTES.PROFILE(review.authorId)} className="flex items-center gap-2 group">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{review.authorName?.[0] ?? 'А'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">{review.authorName ?? 'Аноним'}</p>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              </div>
            </Link>
          ) : (
            <>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{review.authorName?.[0] ?? 'А'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{review.authorName ?? 'Аноним'}</p>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              </div>
            </>
          )}
        </div>
        <RatingStars value={review.rating} max={10} size="sm" />
      </div>
      <p className="mt-3 text-sm text-foreground leading-relaxed">{review.text}</p>
      <div className="mt-3 flex items-center justify-between">
        {review.createdAt && (
          <p className="text-xs text-muted-foreground">{formatRelative(review.createdAt)}</p>
        )}
        <button
          onClick={() => helpfulMutation.mutate()}
          disabled={helpfulMutation.isPending}
          className={cn(
            'flex items-center gap-1 text-sm rounded-md px-2 py-1 transition-colors',
            review.isLiked
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          <span>{review.likeCount ?? 0}</span>
        </button>
      </div>
    </Card>
  )
}
