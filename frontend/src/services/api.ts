import { API_URL } from '@/lib/constants'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: Record<string, unknown>
}

interface ApiError {
  success: false
  message: string
  statusCode: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function transformIds(obj: any): any {
  if (Array.isArray(obj)) return obj.map(transformIds)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_id') {
        result['id'] = String(value)
      } else if (key === '__v') {
        // skip
      } else {
        result[key] = transformIds(value)
      }
    }
    return result
  }
  return obj
}
/* eslint-enable @typescript-eslint/no-explicit-any */

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  // Reads directly from localStorage to avoid circular dependency
  // (auth.store → auth.service → api → auth.store)
  private getAccessToken(): string | null {
    try {
      const stored = localStorage.getItem('auth-storage')
      if (stored) {
        const parsed = JSON.parse(stored) as { state?: { accessToken?: string } }
        return parsed.state?.accessToken ?? null
      }
    } catch {
      // ignore parse errors
    }
    return null
  }

  private getRefreshToken(): string | null {
    try {
      const stored = localStorage.getItem('auth-storage')
      if (stored) {
        const parsed = JSON.parse(stored) as { state?: { refreshToken?: string } }
        return parsed.state?.refreshToken ?? null
      }
    } catch {
      // ignore parse errors
    }
    return null
  }

  private clearAuth(): void {
    localStorage.removeItem('auth-storage')
    window.location.href = '/auth/login'
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      return null
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as ApiResponse<{
        accessToken: string
        refreshToken: string
      }>

      if (data.success) {
        const stored = localStorage.getItem('auth-storage')
        if (stored) {
          const parsed = JSON.parse(stored) as { state: Record<string, unknown> }
          parsed.state.accessToken = data.data.accessToken
          parsed.state.refreshToken = data.data.refreshToken
          localStorage.setItem('auth-storage', JSON.stringify(parsed))
        }
        return data.data.accessToken
      }
    } catch {
      // refresh failed
    }

    return null
  }

  private async request<T>(
    url: string,
    options: RequestInit & { signal?: AbortSignal } = {},
  ): Promise<T> {
    const accessToken = this.getAccessToken()

    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) ?? {}),
    }

    if (!(options.body instanceof FormData) && options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    let response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers,
      signal: options.signal,
    })

    if (response.status === 401 && accessToken) {
      const newToken = await this.refreshAccessToken()

      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`
        response = await fetch(`${this.baseUrl}${url}`, {
          ...options,
          headers,
          signal: options.signal,
        })
      } else {
        this.clearAuth()
        throw new ApiClientError('Сессия истекла. Пожалуйста, войдите снова.', 401)
      }
    }

    if (!response.ok) {
      let message = 'Произошла ошибка при выполнении запроса'
      try {
        const errorBody = await response.json()
        // Backend format: { success: false, error: { code, message } }
        message = errorBody?.error?.message ?? errorBody?.message ?? message
      } catch {
        // could not parse error body
      }
      throw new ApiClientError(message, response.status)
    }

    const result = (await response.json()) as ApiResponse<T>

    if (!result.success && 'success' in result) {
      throw new ApiClientError(
        result.message ?? 'Неизвестная ошибка',
        response.status,
      )
    }

    // Fallback: some endpoints may return raw data without { success, data } wrapper
    const data = result.data !== undefined ? result.data : (result as unknown as T)
    const transformed = transformIds(data)

    // Preserve pagination meta so service mappers can access page/total/etc.
    if (result.meta && typeof result.meta === 'object') {
      return { ...result.meta, data: transformed } as T
    }

    return transformed as T
  }

  async get<T>(url: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(url, { method: 'GET', signal })
  }

  async post<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      signal,
    })
  }

  async patch<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
      signal,
    })
  }

  async del<T>(url: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(url, { method: 'DELETE', signal })
  }
}

export class ApiClientError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiClientError'
    this.statusCode = statusCode
  }
}

export const api = new ApiClient(API_URL)
