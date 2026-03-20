import { useEffect, useState } from 'react'

/**
 * Debounces a value by the given delay.
 *
 * Search cancellation note: all search pages use TanStack Query with the
 * debounced value as part of the query key. When the debounced value changes
 * TanStack Query automatically cancels the in-flight request for the previous
 * key, so no explicit AbortController is needed at the hook level.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
