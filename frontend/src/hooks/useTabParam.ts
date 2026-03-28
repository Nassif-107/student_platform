import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

/**
 * Syncs tab state with the URL search param `?tab=value`.
 * Preserves the selected tab across navigations (browser back, link clicks).
 */
export function useTabParam(defaultTab: string, paramName = 'tab') {
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = searchParams.get(paramName) || defaultTab

  const setTab = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === defaultTab) {
            next.delete(paramName)
          } else {
            next.set(paramName, value)
          }
          return next
        },
        { replace: true },
      )
    },
    [defaultTab, paramName, setSearchParams],
  )

  return [tab, setTab] as const
}
