import { cn } from '@/lib/cn'

interface SkeletonCardProps {
  variant?: 'stat' | 'material' | 'course' | 'forum' | 'notification' | 'review' | 'event'
  className?: string
}

export function SkeletonCard({ variant = 'course', className }: SkeletonCardProps) {
  // Each variant precisely matches the real card's layout

  // STAT: icon box + big number + small label
  if (variant === 'stat') {
    return (
      <div className={cn('rounded-xl border border-border/40 bg-card p-4', className)}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 rounded-xl skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-14 rounded-md skeleton-shimmer" />
            <div className="h-3 w-24 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>
    )
  }

  // COURSE: code badge + title + professor row + rating + tags
  if (variant === 'course') {
    return (
      <div className={cn('rounded-xl border border-border/40 bg-card p-5 space-y-3', className)}>
        <div className="h-4 w-16 rounded skeleton-shimmer" />
        <div className="h-5 w-3/4 rounded skeleton-shimmer" />
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 rounded skeleton-shimmer" />
          <div className="h-3 w-12 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-14 rounded-full skeleton-shimmer" />
          <div className="h-5 w-18 rounded-full skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // MATERIAL: title + type badge + author + stats row (views, downloads, likes)
  if (variant === 'material') {
    return (
      <div className={cn('rounded-xl border border-border/40 bg-card p-5 space-y-3', className)}>
        <div className="flex items-center justify-between">
          <div className="h-5 w-2/3 rounded skeleton-shimmer" />
          <div className="h-5 w-20 rounded-full skeleton-shimmer" />
        </div>
        <div className="h-3 w-1/2 rounded skeleton-shimmer" />
        <div className="flex items-center gap-4 pt-1">
          <div className="h-3 w-12 rounded skeleton-shimmer" />
          <div className="h-3 w-12 rounded skeleton-shimmer" />
          <div className="h-3 w-12 rounded skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // FORUM: title + tags + answer count + views
  if (variant === 'forum') {
    return (
      <div className={cn('rounded-xl border border-border/40 bg-card p-5 space-y-3', className)}>
        <div className="h-5 w-4/5 rounded skeleton-shimmer" />
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-12 rounded-full skeleton-shimmer" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-3 w-16 rounded skeleton-shimmer" />
          <div className="h-3 w-16 rounded skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // EVENT: image placeholder + title + date + location
  if (variant === 'event') {
    return (
      <div className={cn('rounded-xl border border-border/40 bg-card overflow-hidden', className)}>
        <div className="h-32 w-full skeleton-shimmer" />
        <div className="p-4 space-y-2">
          <div className="h-5 w-3/4 rounded skeleton-shimmer" />
          <div className="h-3 w-1/2 rounded skeleton-shimmer" />
          <div className="h-3 w-1/3 rounded skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // NOTIFICATION: icon + title + time
  if (variant === 'notification') {
    return (
      <div className={cn('flex items-start gap-3 rounded-xl border border-border/40 bg-card p-4', className)}>
        <div className="h-10 w-10 shrink-0 rounded-full skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded skeleton-shimmer" />
          <div className="h-3 w-1/2 rounded skeleton-shimmer" />
        </div>
        <div className="h-3 w-12 rounded skeleton-shimmer" />
      </div>
    )
  }

  // REVIEW: avatar + name + rating + text preview
  if (variant === 'review') {
    return (
      <div className={cn('rounded-xl border border-border/40 bg-card p-4 space-y-3', className)}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full skeleton-shimmer" />
          <div className="h-4 w-24 rounded skeleton-shimmer" />
          <div className="ml-auto flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-4 rounded skeleton-shimmer" />
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded skeleton-shimmer" />
          <div className="h-3 w-4/5 rounded skeleton-shimmer" />
          <div className="h-3 w-2/3 rounded skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // Default fallback
  return <div className={cn('h-24 rounded-xl skeleton-shimmer', className)} />
}
