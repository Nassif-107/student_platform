import { useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface InfiniteScrollTriggerProps {
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
}

/**
 * Invisible sentinel that triggers "load more" via IntersectionObserver.
 * Renders a loading spinner while fetching, nothing when no more data.
 */
export function InfiniteScrollTrigger({ onLoadMore, hasMore, isLoading }: InfiniteScrollTriggerProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  if (!hasMore && !isLoading) return null

  return (
    <div ref={sentinelRef} className="flex justify-center py-6">
      {isLoading && (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      )}
    </div>
  )
}
