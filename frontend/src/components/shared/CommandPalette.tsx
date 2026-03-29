import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Home, GraduationCap, FileText, MessageSquare,
  Users, Calendar, ShoppingBag, PartyPopper, BarChart3,
  UserPlus, Bell, Settings, Upload, HelpCircle, PlusCircle,
  Megaphone, UserCog, BookOpen, User, Loader2, Shield,
  type LucideIcon,
} from 'lucide-react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/cn'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notifications.store'
import { api } from '@/services/api'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CommandItem {
  id: string
  label: string
  subtitle?: string
  icon: LucideIcon
  path: string
  badge?: string
  roleBadge?: string
}

interface CommandGroup {
  title: string
  items: CommandItem[]
}

interface SearchResultItem {
  id: string
  type: 'course' | 'material' | 'professor' | 'user' | 'question' | 'event'
  title: string
  subtitle?: string
  score: number
}

/* ------------------------------------------------------------------ */
/*  Icon + path mapping per type                                       */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<string, { icon: LucideIcon; pathPrefix: string; groupLabel: string }> = {
  course:    { icon: BookOpen,       pathPrefix: '/courses',    groupLabel: 'Курсы' },
  material:  { icon: FileText,       pathPrefix: '/materials',  groupLabel: 'Материалы' },
  professor: { icon: GraduationCap,  pathPrefix: '/professors', groupLabel: 'Преподаватели' },
  user:      { icon: User,           pathPrefix: '/profile',    groupLabel: 'Люди' },
  question:  { icon: MessageSquare,  pathPrefix: '/forum',      groupLabel: 'Форум' },
  event:     { icon: PartyPopper,    pathPrefix: '/events',     groupLabel: 'События' },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 150)
  const isSearching = debouncedQuery.length >= 2

  const { user } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const role = user?.role ?? 'student'
  const isMod = role === 'moderator' || role === 'admin'
  const isAdmin = role === 'admin'

  /* ------ Keyboard shortcut ------ */
  const openPalette = useCallback(() => setOpen(true), [])
  useKeyboardShortcuts(
    useMemo(() => [
      { key: 'k', ctrlOrMeta: true, handler: openPalette },
      { key: '/', handler: openPalette, ignoreWhenEditing: true },
    ], [openPalette]),
  )

  /* ------ Single unified search call ------ */
  const { data: searchData, isFetching } = useQuery({
    queryKey: ['unified-search', debouncedQuery],
    queryFn: async () => {
      const raw = await api.get<{ results: SearchResultItem[]; total: number }>(`/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`)
      return raw
    },
    enabled: open && isSearching,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })

  /* ------ Build content groups from server results ------ */
  const contentGroups = useMemo((): CommandGroup[] => {
    if (!searchData?.results?.length) return []

    // Group results by type, preserving server sort order within each group
    const grouped = new Map<string, SearchResultItem[]>()
    for (const item of searchData.results) {
      const list = grouped.get(item.type) ?? []
      list.push(item)
      grouped.set(item.type, list)
    }

    // Order groups by the highest-scored item in each
    const entries = [...grouped.entries()].sort((a, b) => {
      const maxA = Math.max(...a[1].map((i) => i.score))
      const maxB = Math.max(...b[1].map((i) => i.score))
      return maxB - maxA
    })

    return entries.map(([type, items]) => {
      const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.course!
      return {
        title: config.groupLabel,
        items: items.map((item) => ({
          id: `${type}-${item.id}`,
          label: item.title,
          subtitle: item.subtitle,
          icon: config.icon,
          path: `${config.pathPrefix}/${item.id}`,
        })),
      }
    })
  }, [searchData])

  /* ------ Build all groups ------ */
  const groups = useMemo(() => {
    const result: CommandGroup[] = []
    const lowerQ = query.toLowerCase()

    // Content results from server (shown above static items when searching)
    if (isSearching) {
      result.push(...contentGroups)
    }

    // Personal shortcuts — filtered by query, hidden when nothing matches
    if (user) {
      const personalItems: CommandItem[] = [
        { id: 'my-profile', label: 'Мой профиль', icon: User, path: `/profile/${user.id}` },
        { id: 'my-materials', label: 'Мои материалы', icon: FileText, path: `/profile/${user.id}?tab=materials` },
        {
          id: 'my-notifs', label: 'Уведомления', icon: Bell, path: '/notifications',
          badge: unreadCount > 0 ? String(unreadCount > 99 ? '99+' : unreadCount) : undefined,
        },
        { id: 'my-settings', label: 'Настройки', icon: Settings, path: '/settings' },
      ]
      const filteredPersonal = lowerQ ? personalItems.filter((i) => i.label.toLowerCase().includes(lowerQ)) : personalItems
      if (filteredPersonal.length) result.push({ title: user.firstName ?? 'Личное', items: filteredPersonal })
    }

    // Navigation — filtered by query
    const navItems: CommandItem[] = [
      { id: 'n-home', label: 'Главная', icon: Home, path: '/' },
      { id: 'n-courses', label: 'Курсы', icon: GraduationCap, path: '/courses' },
      { id: 'n-materials', label: 'Материалы', icon: FileText, path: '/materials' },
      { id: 'n-forum', label: 'Форум', icon: MessageSquare, path: '/forum' },
      { id: 'n-groups', label: 'Группы', icon: Users, path: '/groups' },
      { id: 'n-deadlines', label: 'Дедлайны', icon: Calendar, path: '/deadlines' },
      { id: 'n-market', label: 'Маркетплейс', icon: ShoppingBag, path: '/marketplace' },
      { id: 'n-events', label: 'События', icon: PartyPopper, path: '/events' },
      { id: 'n-analytics', label: 'Аналитика', icon: BarChart3, path: '/analytics' },
      { id: 'n-friends', label: 'Друзья', icon: UserPlus, path: '/friends' },
    ]
    const filteredNav = lowerQ ? navItems.filter((i) => i.label.toLowerCase().includes(lowerQ)) : navItems
    if (filteredNav.length) result.push({ title: 'Навигация', items: filteredNav })

    // Actions — filtered by query, role-gated
    const actions: CommandItem[] = [
      { id: 'a-upload', label: 'Загрузить материал', icon: Upload, path: '/materials/upload' },
      { id: 'a-ask', label: 'Задать вопрос', icon: HelpCircle, path: '/forum/ask' },
      { id: 'a-group', label: 'Создать группу', icon: PlusCircle, path: '/groups' },
      { id: 'a-listing', label: 'Новое объявление', icon: Megaphone, path: '/marketplace/new' },
      { id: 'a-edit', label: 'Редактировать профиль', icon: UserCog, path: '/profile/edit' },
    ]
    if (isMod) actions.push({ id: 'a-course', label: 'Создать курс', icon: BookOpen, path: '/courses', roleBadge: 'Мод' })
    if (isAdmin) actions.push({ id: 'a-platform', label: 'Платформенная аналитика', icon: Shield, path: '/analytics', roleBadge: 'Админ' })
    const filteredActions = lowerQ ? actions.filter((i) => i.label.toLowerCase().includes(lowerQ)) : actions
    if (filteredActions.length) result.push({ title: 'Действия', items: filteredActions })

    return result
  }, [query, isSearching, contentGroups, user, unreadCount, isMod, isAdmin])

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

  /* ------ State management ------ */
  useEffect(() => { if (open) { setQuery(''); setActiveIndex(0); requestAnimationFrame(() => inputRef.current?.focus()) } }, [open])
  useEffect(() => { setActiveIndex((p) => p >= flatItems.length ? Math.max(0, flatItems.length - 1) : p) }, [flatItems.length])
  useEffect(() => {
    if (!listRef.current) return
    listRef.current.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])
  useEffect(() => { setActiveIndex(0) }, [debouncedQuery])

  const selectItem = useCallback((item: CommandItem) => { setOpen(false); navigate(item.path) }, [navigate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((p) => p < flatItems.length - 1 ? p + 1 : 0) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((p) => p > 0 ? p - 1 : flatItems.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); if (flatItems[activeIndex]) selectItem(flatItems[activeIndex]) }
  }, [flatItems, activeIndex, selectItem])

  const activeItemId = flatItems[activeIndex]?.id
  let runningIndex = 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          asChild
          aria-label="Командная палитра"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -24 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'fixed left-1/2 top-[18%] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2',
              'rounded-2xl border border-border/40 bg-card/95 backdrop-blur-2xl shadow-2xl shadow-black/20',
              'flex flex-col overflow-hidden focus:outline-none',
            )}
            onKeyDown={handleKeyDown}
          >
            <DialogPrimitive.Title className="sr-only">Поиск по платформе</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Поиск курсов, материалов, людей</DialogPrimitive.Description>

            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl transition-colors', isFetching ? 'bg-primary/20' : 'bg-primary/10')}>
                {isFetching
                  ? <Loader2 className="h-[18px] w-[18px] text-primary animate-spin" />
                  : <Search className="h-[18px] w-[18px] text-primary" />
                }
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск курсов, материалов, людей..."
                className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
              <kbd className="hidden shrink-0 select-none rounded-lg border border-border/50 bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:inline-block">
                Esc
              </kbd>
            </div>

            <div className="h-px bg-border/40" />

            {/* Results */}
            <div ref={listRef} className="max-h-[min(420px,55vh)] overflow-y-auto overscroll-contain scrollbar-thin px-2 py-2">
              {flatItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <Search className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {isFetching ? 'Ищем...' : isSearching ? 'Ничего не найдено' : 'Начните вводить для поиска'}
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isSearching ? debouncedQuery : '__static__'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    {groups.map((group, gi) => {
                      const groupStart = runningIndex
                      const groupItems = group.items.map((itm, idx) => {
                        const itemIdx = groupStart + idx
                        const isActive = itm.id === activeItemId
                        const Icon = itm.icon
                        return (
                          <button
                            key={itm.id}
                            data-active={isActive}
                            onClick={() => selectItem(itm)}
                            onMouseEnter={() => setActiveIndex(itemIdx)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-100',
                              isActive ? 'bg-primary/10' : 'hover:bg-accent/50',
                            )}
                          >
                            <div className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                              isActive ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground',
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-sm font-medium truncate">{itm.label}</span>
                              {itm.subtitle && <span className="block text-xs text-muted-foreground truncate">{itm.subtitle}</span>}
                            </div>
                            {itm.badge && (
                              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                                {itm.badge}
                              </span>
                            )}
                            {itm.roleBadge && (
                              <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">{itm.roleBadge}</span>
                            )}
                          </button>
                        )
                      })
                      runningIndex += group.items.length

                      return (
                        <div key={group.title}>
                          {gi > 0 && <div className="mx-3 my-1.5 h-px bg-border/30" />}
                          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                            {group.title}
                          </div>
                          {groupItems}
                        </div>
                      )
                    })}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            <div className="h-px bg-border/40" />
            <div className="flex items-center gap-5 px-5 py-2.5 text-[11px] text-muted-foreground/50">
              <span className="flex items-center gap-1">
                <kbd className="rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[10px]">↑↓</kbd>
                навигация
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[10px]">Enter</kbd>
                открыть
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[10px]">Esc</kbd>
                закрыть
              </span>
              {isSearching && searchData && (
                <span className="ml-auto">{searchData.total} результатов</span>
              )}
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
