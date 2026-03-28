import { useEffect, useRef, useCallback } from 'react'
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

// Singleton socket — persists across component remounts
let globalSocket: Socket | null = null
let globalHeartbeat: ReturnType<typeof setInterval> | null = null
let connectedToken: string | null = null

export function useSocket() {
  const socketRef = useRef<Socket | null>(globalSocket)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.accessToken)
  const increment = useNotificationStore((s) => s.increment)
  const queryClient = useQueryClient()

  // Stable callback refs so the effect doesn't re-run on every render
  const incrementRef = useRef(increment)
  incrementRef.current = increment
  const queryClientRef = useRef(queryClient)
  queryClientRef.current = queryClient

  const handleNotification = useCallback(() => {
    incrementRef.current()
    queryClientRef.current.invalidateQueries({ queryKey: ['notifications'] })
  }, [])

  useEffect(() => {
    // Not authenticated — disconnect if connected
    if (!isAuthenticated || !accessToken) {
      if (globalSocket) {
        globalSocket.disconnect()
        globalSocket = null
        socketRef.current = null
        connectedToken = null
        if (globalHeartbeat) {
          clearInterval(globalHeartbeat)
          globalHeartbeat = null
        }
      }
      return
    }

    // Already connected with the same token — skip
    if (globalSocket?.connected && connectedToken === accessToken) {
      socketRef.current = globalSocket
      return
    }

    // Token changed — disconnect old socket
    if (globalSocket) {
      globalSocket.disconnect()
      if (globalHeartbeat) {
        clearInterval(globalHeartbeat)
        globalHeartbeat = null
      }
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socket.on('connect', () => {
      if (import.meta.env.DEV) console.log('[Socket] Подключено')
    })

    socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV && reason !== 'io client disconnect') {
        console.log('[Socket] Отключено:', reason)
      }
    })

    socket.on('connect_error', async (error) => {
      if (error.message.includes('expired') || error.message.includes('Token')) {
        const newToken = await tryRefreshToken()
        if (newToken) {
          socket.auth = { token: newToken }
          connectedToken = newToken
          socket.connect()
        } else {
          socket.disconnect()
        }
      }
    })

    socket.on('notification', handleNotification)

    // Heartbeat for presence
    globalHeartbeat = setInterval(() => {
      if (socket.connected) socket.emit('heartbeat')
    }, 60_000)

    globalSocket = socket
    socketRef.current = socket
    connectedToken = accessToken

    // Only disconnect on full unmount (logout), not on route changes
    return () => {
      // Don't disconnect here — the socket is global
      // It only disconnects when auth changes (handled above)
    }
  }, [isAuthenticated, accessToken, handleNotification])

  return socketRef.current
}
