export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Map a raw API response (which may be an array, or an object with items/data + pagination meta)
 * into a standardized PaginatedResponse<T>.
 *
 * Handles all backend response variants:
 * - Plain array → wraps as single page
 * - { data: [...], page, total, limit } → api.ts meta wrapping
 * - { items: [...], total } → direct paginated response
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapPaginatedResponse<T>(
  raw: any,
  mapper: (item: any) => T,
): PaginatedResponse<T> {
  // If api.ts wrapped meta: { page, total, limit, data: [...] }
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.items)
        ? raw.items
        : []

  const total = raw?.total ?? raw?.pagination?.total ?? arr.length
  const page = raw?.page ?? raw?.pagination?.page ?? 1
  const limit = raw?.limit ?? raw?.pagination?.limit ?? arr.length || 20
  const totalPages =
    raw?.totalPages ?? Math.ceil(total / (limit || 1))

  return {
    items: arr.map(mapper),
    total,
    page,
    limit,
    totalPages,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
