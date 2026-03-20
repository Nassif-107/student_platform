import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notifications.store'
import { SOCKET_URL, API_URL } from '@/lib/constants'

async function tryRefreshToken(): Promise<string | null> {
  try {
    const stored = localStorage.getItem('auth-storage')
    if (!stored) return null
    const parsed = JSON.parse(stored) as { state?: { refreshToken?: string } }
    const refreshToken = parsed.state?.refreshToken
    if (!refreshToken) return null

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!response.ok) return null

    const data = await response.json()
    if (data.success && data.data) {
      const state = JSON.parse(stored) as { state: Record<string, unknown> }
      state.state.accessToken = data.data.accessToken
      state.state.refreshToken = data.data.refreshToken
      localStorage.setItem('auth-storage', JSON.stringify(state))
      return data.data.accessToken as string
    }
  } catch {
    // refresh failed
  }
  return null
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { isAuthenticated, accessToken } = useAuthStore()
  const { increment } = useNotificationStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      if (import.meta.env.DEV) console.log('[Socket] Подключено к серверу')
    })

    socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) console.log('[Socket] Отключено:', reason)
    })

    socket.on('connect_error', async (error) => {
      if (error.message.includes('expired') || error.message.includes('Token')) {
        if (import.meta.env.DEV) console.log('[Socket] Токен истёк, обновляем...')
        const newToken = await tryRefreshToken()
        if (newToken) {
          socket.auth = { token: newToken }
          socket.connect()
        } else {
          if (import.meta.env.DEV) console.error('[Socket] Не удалось обновить токен')
          socket.disconnect()
        }
      } else {
        if (import.meta.env.DEV) console.error('[Socket] Ошибка подключения:', error.message)
      }
    })

    socket.on('notification', () => {
      increment()
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    })

    // Heartbeat: keep presence alive (backend uses 2min TTL)
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat')
      }
    }, 60_000) // every 60s

    socketRef.current = socket

    return () => {
      clearInterval(heartbeatInterval)
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, accessToken, increment, queryClient])

  return socketRef.current
}
