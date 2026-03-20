import { type ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useTheme()
  return <>{children}</>
}
