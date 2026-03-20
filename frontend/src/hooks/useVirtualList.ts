import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

interface UseVirtualListOptions {
  itemCount: number
  itemHeight: number
  overscan?: number
}

interface VirtualItem {
  index: number
  offsetTop: number
}

interface UseVirtualListResult {
  containerRef: React.RefObject<HTMLDivElement>
  virtualItems: VirtualItem[]
  totalHeight: number
}

/**
 * Lightweight virtual scrolling for long lists.
 * Only renders items visible in the viewport + overscan buffer.
 */
export function useVirtualList(options: UseVirtualListOptions): UseVirtualListResult {
  const { itemCount, itemHeight, overscan = 5 } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (el) {
      setScrollTop(el.scrollTop)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    setContainerHeight(el.clientHeight)
    setScrollTop(el.scrollTop)

    el.addEventListener('scroll', handleScroll, { passive: true })

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [handleScroll])

  const totalHeight = itemCount * itemHeight

  const virtualItems = useMemo<VirtualItem[]>(() => {
    if (containerHeight === 0 || itemCount === 0) return []

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const endIndex = Math.min(itemCount - 1, startIndex + visibleCount + overscan * 2)

    const items: VirtualItem[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({ index: i, offsetTop: i * itemHeight })
    }
    return items
  }, [scrollTop, containerHeight, itemCount, itemHeight, overscan])

  return { containerRef, virtualItems, totalHeight }
}
