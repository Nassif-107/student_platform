export interface ApiResponse<T> {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string>
  }
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export type ApiResult<T> = ApiResponse<T> | ApiError
