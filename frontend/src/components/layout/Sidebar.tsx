import React from 'react'
import { motion } from 'framer-motion'
import {
  Home,
  GraduationCap,
  FileText,
  MessageSquare,
  Users,
  Calendar,
  ShoppingBag,
  PartyPopper,
  UserPlus,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  BookUser,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { ROUTES } from '@/lib/constants'

interface NavItem {
  label: string
  icon: LucideIcon
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Главная', icon: Home, path: ROUTES.HOME },
  { label: 'Курсы', icon: GraduationCap, path: ROUTES.COURSES },
  { label: 'Преподаватели', icon: BookUser, path: ROUTES.PROFESSORS },
  { label: 'Материалы', icon: FileText, path: ROUTES.MATERIALS },
  { label: 'Форум', icon: MessageSquare, path: ROUTES.FORUM },
  { label: 'Группы', icon: Users, path: ROUTES.GROUPS },
  { label: 'Дедлайны', icon: Calendar, path: ROUTES.DEADLINES },
  { label: 'Маркетплейс', icon: ShoppingBag, path: ROUTES.MARKETPLACE },
  { label: 'События', icon: PartyPopper, path: ROUTES.EVENTS },
  { label: 'Друзья', icon: UserPlus, path: ROUTES.FRIENDS },
  { label: 'Аналитика', icon: BarChart3, path: ROUTES.ANALYTICS },
]

interface SidebarProps {
  currentPath?: string
  collapsed?: boolean
  mobileOpen?: boolean
  onNavigate?: (path: string) => void
  onToggleCollapse?: () => void
  onMobileClose?: () => void
  className?: string
}

function SidebarNavItem({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  onNavigate?: (path: string) => void
}) {
  const Icon = item.icon

  const content = (
    <motion.button
      whileHover={{ x: collapsed ? 0 : 4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      onClick={() => onNavigate?.(item.path)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/10 shadow-sm glow-primary'
          : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground hover:shadow-sm border border-transparent',
        collapsed && 'justify-center px-2'
      )}
    >
      <motion.span
        className="inline-flex shrink-0"
        whileHover={{ scale: 1.1, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
      >
        <Icon className={cn('h-5 w-5', active && 'drop-shadow-sm')} />
      </motion.span>
      {!collapsed && <span>{item.label}</span>}
    </motion.button>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return content
}

function SidebarContent({
  currentPath,
  collapsed,
  onNavigate,
  onToggleCollapse,
}: Pick<SidebarProps, 'currentPath' | 'collapsed' | 'onNavigate' | 'onToggleCollapse'>) {
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item, index) => (
            <React.Fragment key={item.path}>
              {/* Subtle dividers between nav groups */}
              {(index === 1 || index === 4 || index === 7 || index === 9) && (
                <div className={cn('my-1.5 h-px bg-border/50', collapsed && 'mx-1')} />
              )}
              <SidebarNavItem
                item={item}
                active={
                  item.path === '/'
                    ? currentPath === '/'
                    : currentPath?.startsWith(item.path) ?? false
                }
                collapsed={collapsed ?? false}
                onNavigate={onNavigate}
              />
            </React.Fragment>
          ))}
        </nav>
      </ScrollArea>

      {/* Collapse toggle (desktop only) */}
      {onToggleCollapse && (
        <div className="border-t p-3">
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            onClick={onToggleCollapse}
            className={cn('w-full', collapsed && 'w-10')}
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 mr-2" />
                <span>Свернуть</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

function Sidebar({
  currentPath = '/',
  collapsed = false,
  mobileOpen = false,
  onNavigate,
  onToggleCollapse,
  onMobileClose,
  className,
}: SidebarProps) {
  return (
    <TooltipProvider>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden h-screen lg:flex flex-col border-r border-border/40 glass transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        <SidebarContent
          currentPath={currentPath}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Навигация</SheetTitle>
          <SheetDescription className="sr-only">Меню навигации по разделам платформы</SheetDescription>
          <div className="pt-12">
            <SidebarContent
              currentPath={currentPath}
              collapsed={false}
              onNavigate={(path) => {
                onNavigate?.(path)
                onMobileClose?.()
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}

export { Sidebar, NAV_ITEMS }
export type { SidebarProps, NavItem }
