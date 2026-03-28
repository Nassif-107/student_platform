import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Home, GraduationCap, FileText, MessageSquare,
  Users, Calendar, ShoppingBag, PartyPopper, BarChart3,
  UserPlus, Bell, Settings, Upload, HelpCircle, PlusCircle,
  Megaphone, UserCog, BookOpen, User, Loader2, Shield,
  Github, Clock, type LucideIcon,
} from 'lucide-react'
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/cn'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notifications.store'
import { coursesService } from '@/services/courses.service'
import { materialsService } from '@/services/materials.service'
import { professorsService } from '@/services/professors.service'
import { socialService } from '@/services/social.service'

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
  /** If set, only shown to users with these roles */
  roles?: string[]
}

interface CommandGroup {
  title: string
  items: CommandItem[]
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
  const debouncedQuery = useDebounce(query, 250)
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

  /* ------ Content search (2+ chars) ------ */
  const { data: courseResults, isFetching: cf } = useQuery({
    queryKey: ['cmd-courses', debouncedQuery],
    queryFn: () => coursesService.getCourses({ search: debouncedQuery, limit: 5 }),
    enabled: open && isSearching,
    staleTime: 30_000,
  })
  const { data: materialResults, isFetching: mf } = useQuery({
    queryKey: ['cmd-materials', debouncedQuery],
    queryFn: () => materialsService.getMaterials({ search: debouncedQuery, limit: 5 }),
    enabled: open && isSearching,
    staleTime: 30_000,
  })
  const { data: professorResults, isFetching: pf } = useQuery({
    queryKey: ['cmd-professors', debouncedQuery],
    queryFn: () => professorsService.getProfessors({ search: debouncedQuery, limit: 5 }),
    enabled: open && isSearching,
    staleTime: 30_000,
  })
  const { data: userResults, isFetching: uf } = useQuery({
    queryKey: ['cmd-users', debouncedQuery],
    queryFn: () => socialService.searchUsers(debouncedQuery, 1, 5),
    enabled: open && isSearching,
    staleTime: 30_000,
  })
  const isFetching = cf || mf || pf || uf

  /* ------ Build groups ------ */
  const groups = useMemo(() => {
    const result: CommandGroup[] = []
    const lowerQ = query.toLowerCase()

    // --- Content results (when searching) ---
    if (isSearching) {
      const courses = (courseResults?.items ?? []).map((c) => ({
        id: `c-${c.id}`, label: c.name, subtitle: `${c.code} · ${c.professorName}`,
        icon: BookOpen, path: `/courses/${c.id}`,
      }))
      if (courses.length) result.push({ title: 'Курсы', items: courses })

      const materials = (materialResults?.items ?? []).map((m) => ({
        id: `m-${m.id}`, label: m.title, subtitle: m.courseName ?? m.type,
        icon: FileText, path: `/materials/${m.id}`,
      }))
      if (materials.length) result.push({ title: 'Материалы', items: materials })

      const profs = (professorResults?.items ?? []).map((p) => ({
        id: `p-${p.id}`, label: `${p.lastName} ${p.firstName}`, subtitle: p.department,
        icon: GraduationCap, path: `/professors/${p.id}`,
      }))
      if (profs.length) result.push({ title: 'Преподаватели', items: profs })

      const users = (userResults?.items ?? []).map((u) => ({
        id: `u-${u.id}`, label: `${u.firstName} ${u.lastName}`, subtitle: u.faculty,
        icon: User, path: `/profile/${u.id}`,
      }))
      if (users.length) result.push({ title: 'Люди', items: users })
    }

    // --- User-specific quick links (no query or matching) ---
    if (!isSearching || 'мой профиль мои настройки'.includes(lowerQ)) {
      const personalItems: CommandItem[] = []
      if (user) {
        if (!lowerQ || 'мой профиль'.includes(lowerQ))
          personalItems.push({ id: 'my-profile', label: 'Мой профиль', icon: User, path: `/profile/${user.id}` })
        if (!lowerQ || 'мои материалы'.includes(lowerQ))
          personalItems.push({ id: 'my-materials', label: 'Мои материалы', icon: FileText, path: `/profile/${user.id}?tab=materials` })
        if (!lowerQ || 'уведомления'.includes(lowerQ))
          personalItems.push({
            id: 'my-notifs', label: 'Уведомления', icon: Bell, path: '/notifications',
            badge: unreadCount > 0 ? String(unreadCount > 99 ? '99+' : unreadCount) : undefined,
          })
        if (!lowerQ || 'настройки'.includes(lowerQ))
          personalItems.push({ id: 'my-settings', label: 'Настройки', icon: Settings, path: '/settings' })
      }
      if (personalItems.length && !isSearching) result.push({ title: `${user?.firstName ?? 'Личное'}`, items: personalItems })
    }

    // --- Navigation ---
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

    // --- Actions (role-gated) ---
    if (!isSearching) {
      const actions: CommandItem[] = [
        { id: 'a-upload', label: 'Загрузить материал', icon: Upload, path: '/materials/upload' },
        { id: 'a-ask', label: 'Задать вопрос', icon: HelpCircle, path: '/forum/ask' },
        { id: 'a-group', label: 'Создать группу', icon: PlusCircle, path: '/groups' },
        { id: 'a-listing', label: 'Новое объявление', icon: Megaphone, path: '/marketplace/new' },
        { id: 'a-edit', label: 'Редактировать профиль', icon: UserCog, path: '/profile/edit' },
      ]
      if (isMod) {
        actions.push({ id: 'a-course', label: 'Создать курс', subtitle: 'Модератор', icon: BookOpen, path: '/courses', roles: ['moderator', 'admin'] })
      }
      if (isAdmin) {
        actions.push({ id: 'a-platform', label: 'Платформенная аналитика', subtitle: 'Админ', icon: Shield, path: '/analytics', roles: ['admin'] })
      }
      const filteredActions = lowerQ ? actions.filter((i) => i.label.toLowerCase().includes(lowerQ)) : actions
      if (filteredActions.length) result.push({ title: 'Действия', items: filteredActions })
    }

    return result
  }, [query, isSearching, courseResults, materialResults, professorResults, userResults, user, unreadCount, isMod, isAdmin])

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

  /* ------ State ------ */
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
            <DialogPrimitive.Title className="sr-only">Командная палитра</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Поиск по платформе</DialogPrimitive.Description>

            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                {isFetching
                  ? <Loader2 className="h-4.5 w-4.5 text-primary animate-spin" />
                  : <Search className="h-4.5 w-4.5 text-primary" />
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

            {/* Results list — custom scrollbar */}
            <div
              ref={listRef}
              className="max-h-[min(420px,55vh)] overflow-y-auto overscroll-contain scrollbar-thin px-2 py-2"
            >
              {flatItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <Search className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {isFetching ? 'Ищем...' : query ? 'Ничего не найдено' : 'Начните вводить для поиска'}
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={debouncedQuery}
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
                              isActive
                                ? 'bg-primary/10 text-foreground'
                                : 'text-foreground/80 hover:bg-accent/50',
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
                              {itm.subtitle && (
                                <span className="block text-xs text-muted-foreground truncate">{itm.subtitle}</span>
                              )}
                            </div>
                            {itm.badge && (
                              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                                {itm.badge}
                              </span>
                            )}
                            {itm.roles && (
                              <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                                {itm.roles.includes('admin') ? 'Админ' : 'Мод'}
                              </span>
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
              <span className="ml-auto text-[10px]">
                {flatItems.length} результатов
              </span>
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
