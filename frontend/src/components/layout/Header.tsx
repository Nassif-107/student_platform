import { Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
} from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import { useNotificationStore } from '@/store/notifications.store'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/cn'
import { ROUTES } from '@/lib/constants'

/** Detect Mac for displaying the correct modifier key hint */
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)

interface HeaderProps {
  onMobileMenuClick?: () => void
}

export function Header({ onMobileMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { isDark, setTheme } = useTheme()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  /** Open the command palette by dispatching a synthetic Ctrl/Cmd+K event */
  const openCommandPalette = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        ctrlKey: !isMac,
        metaKey: isMac,
        bubbles: true,
      }),
    )
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 glass px-4 md:px-6 shadow-sm">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuClick}
        title="Меню"
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search — opens Command Palette */}
      <button
        onClick={openCommandPalette}
        className="relative flex h-9 flex-1 max-w-md items-center gap-2 rounded-lg border border-input bg-background/70 px-3 text-sm text-muted-foreground transition-colors hover:bg-background hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-ring/50"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Поиск по платформе...</span>
        <kbd className="hidden shrink-0 select-none rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          {isMac ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title={isDark ? 'Светлая тема' : 'Тёмная тема'}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        {isAuthenticated && (
          <Link
            to={ROUTES.NOTIFICATIONS}
            title="Уведомления"
            className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        {/* User menu */}
        {isAuthenticated && user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent"
              title="Меню пользователя"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {user.firstName?.[0] ?? ''}{user.lastName?.[0] ?? ''}
              </div>
              <span className="hidden text-sm font-medium text-foreground md:block">
                {user.firstName ?? ''}
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border/50 glass p-1 shadow-lg">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">
                    {user.firstName ?? ''} {user.lastName ?? ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Link
                  to={ROUTES.PROFILE(user.id)}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <User className="h-4 w-4" />
                  Мой профиль
                </Link>
                <Link
                  to={ROUTES.SETTINGS}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <Settings className="h-4 w-4" />
                  Настройки
                </Link>
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={async () => {
                      setDropdownOpen(false)
                      try { await authService.logout() } catch { /* API call may fail if token expired — still log out locally */ }
                      logout()
                      navigate(ROUTES.LOGIN)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            to={ROUTES.LOGIN}
            className={cn(
              'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
            )}
          >
            Войти
          </Link>
        )}
      </div>
    </header>
  )
}
