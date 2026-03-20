import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { authService, type RegisterData } from '@/services/auth.service'
import { ROUTES } from '@/lib/constants'

export function useAuth() {
  const navigate = useNavigate()
  const {
    user,
    isAuthenticated,
    accessToken,
    setAuth,
    logout: clearAuth,
    updateUser,
  } = useAuthStore()

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authService.login(email, password)
      setAuth(response.user, response.accessToken, response.refreshToken)
      navigate(ROUTES.HOME)
    },
    [setAuth, navigate],
  )

  const register = useCallback(
    async (data: RegisterData) => {
      const response = await authService.register(data)
      setAuth(response.user, response.accessToken, response.refreshToken)
      navigate(ROUTES.HOME)
    },
    [setAuth, navigate],
  )

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // ignore logout errors on the server side
    } finally {
      clearAuth()
      navigate(ROUTES.LOGIN)
    }
  }, [clearAuth, navigate])

  return {
    user,
    isAuthenticated,
    accessToken,
    login,
    register,
    logout,
    updateUser,
  }
}
