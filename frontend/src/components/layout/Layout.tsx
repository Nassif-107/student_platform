import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { useUIStore } from '@/store/ui.store'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notifications.store'
import { useSocket } from '@/hooks/useSocket'
import { notificationsService } from '@/services/notifications.service'
import { BackToTop } from '@/components/shared/BackToTop'
import { ScrollProgress } from '@/components/shared/ScrollProgress'
import { cn } from '@/lib/cn'

export function Layout() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { isAuthenticated } = useAuthStore()
  const { setUnreadCount } = useNotificationStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Establish socket connection for authenticated users
  useSocket()

  // Fetch initial unread notification count
  useEffect(() => {
    if (!isAuthenticated) return
    notificationsService.getUnreadCount().then((result) => {
      const count = (result as { count?: number })?.count ?? 0
      setUnreadCount(count)
    }).catch(() => {
      // ignore — user may not have notifications yet
    })
  }, [isAuthenticated, setUnreadCount])

  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Sidebar
        currentPath={location.pathname}
        collapsed={!sidebarOpen}
        mobileOpen={mobileOpen}
        onNavigate={(path) => navigate(path)}
        onToggleCollapse={toggleSidebar}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300',
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-16',
        )}
      >
        <Header onMobileMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <BackToTop />
    </div>
  )
}
