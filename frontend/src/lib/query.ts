/**
 * Build a URL query string from a params object.
 * Handles undefined/null values (skipped), arrays (appended), and primitives (set).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function buildQueryString(params?: Record<string, any>): string {
  if (!params) return ''

  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      for (const v of value) {
        searchParams.append(key, String(v))
      }
    } else {
      searchParams.set(key, String(value))
    }
  }

  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}
