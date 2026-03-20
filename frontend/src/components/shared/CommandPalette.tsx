import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Home,
  GraduationCap,
  FileText,
  MessageSquare,
  Users,
  Calendar,
  ShoppingBag,
  PartyPopper,
  BarChart3,
  UserPlus,
  Bell,
  Settings,
  Upload,
  HelpCircle,
  PlusCircle,
  Megaphone,
  UserCog,
  type LucideIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/cn'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CommandItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
  shortcut?: string
}

interface CommandGroup {
  title: string
  items: CommandItem[]
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const COMMAND_GROUPS: CommandGroup[] = [
  {
    title: 'Навигация',
    items: [
      { id: 'nav-home', label: 'Главная', icon: Home, path: '/' },
      { id: 'nav-courses', label: 'Курсы', icon: GraduationCap, path: '/courses' },
      { id: 'nav-materials', label: 'Материалы', icon: FileText, path: '/materials' },
      { id: 'nav-forum', label: 'Форум', icon: MessageSquare, path: '/forum' },
      { id: 'nav-groups', label: 'Группы', icon: Users, path: '/groups' },
      { id: 'nav-deadlines', label: 'Дедлайны', icon: Calendar, path: '/deadlines' },
      { id: 'nav-marketplace', label: 'Маркетплейс', icon: ShoppingBag, path: '/marketplace' },
      { id: 'nav-events', label: 'События', icon: PartyPopper, path: '/events' },
      { id: 'nav-analytics', label: 'Аналитика', icon: BarChart3, path: '/analytics' },
      { id: 'nav-friends', label: 'Друзья', icon: UserPlus, path: '/friends' },
      { id: 'nav-notifications', label: 'Уведомления', icon: Bell, path: '/notifications' },
      { id: 'nav-settings', label: 'Настройки', icon: Settings, path: '/settings' },
    ],
  },
  {
    title: 'Действия',
    items: [
      { id: 'act-upload', label: 'Загрузить материал', icon: Upload, path: '/materials/upload' },
      { id: 'act-ask', label: 'Задать вопрос', icon: HelpCircle, path: '/forum/ask' },
      { id: 'act-group', label: 'Создать группу', icon: PlusCircle, path: '/groups' },
      { id: 'act-listing', label: 'Новое объявление', icon: Megaphone, path: '/marketplace/new' },
      { id: 'act-profile', label: 'Редактировать профиль', icon: UserCog, path: '/profile/edit' },
    ],
  },
]

/** Flatten all items once for index tracking */
function flattenItems(groups: CommandGroup[]): CommandItem[] {
  const result: CommandItem[] = []
  for (const group of groups) {
    for (const item of group.items) {
      result.push(item)
    }
  }
  return result
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

  /* ------ Keyboard shortcuts to open palette ------ */

  const openPalette = useCallback(() => {
    setOpen(true)
  }, [])

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: 'k', ctrlOrMeta: true, handler: openPalette },
        {
          key: '/',
          handler: openPalette,
          ignoreWhenEditing: true,
        },
      ],
      [openPalette],
    ),
  )

  /* ------ Filter items by query ------ */

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return COMMAND_GROUPS

    const lowerQ = query.toLowerCase()
    const result: CommandGroup[] = []

    for (const group of COMMAND_GROUPS) {
      const matched = group.items.filter((item) =>
        item.label.toLowerCase().includes(lowerQ),
      )
      if (matched.length > 0) {
        result.push({ ...group, items: matched })
      }
    }

    return result
  }, [query])

  const flatItems = useMemo(() => flattenItems(filteredGroups), [filteredGroups])

  /* ------ Reset state when opening/closing ------ */

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // Focus the input after Radix renders the dialog
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  /* ------ Clamp active index when items change ------ */

  useEffect(() => {
    setActiveIndex((prev) => {
      if (prev >= flatItems.length) return Math.max(0, flatItems.length - 1)
      return prev
    })
  }, [flatItems.length])

  /* ------ Scroll active item into view ------ */

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  /* ------ Select handler ------ */

  const selectItem = useCallback(
    (item: CommandItem) => {
      setOpen(false)
      navigate(item.path)
    },
    [navigate],
  )

  /* ------ Keyboard navigation inside the palette ------ */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) =>
            prev < flatItems.length - 1 ? prev + 1 : 0,
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : flatItems.length - 1,
          )
          break
        case 'Enter':
          e.preventDefault()
          if (flatItems[activeIndex]) {
            selectItem(flatItems[activeIndex])
          }
          break
      }
    },
    [flatItems, activeIndex, selectItem],
  )

  /* ------ Build a set of active-item ids for O(1) lookup ------ */

  const activeItemId = flatItems[activeIndex]?.id

  /* ------ Render ------ */

  let runningIndex = 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          asChild
          aria-label="Командная палитра"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2',
              'rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl shadow-2xl',
              'flex flex-col overflow-hidden',
              'focus:outline-none',
            )}
            onKeyDown={handleKeyDown}
          >
            {/* Accessible hidden title for Radix */}
            <DialogPrimitive.Title className="sr-only">
              Командная палитра
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Быстрый поиск и навигация по платформе
            </DialogPrimitive.Description>

            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск команд и страниц..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <kbd className="hidden shrink-0 select-none rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                Esc
              </kbd>
            </div>

            {/* Item list */}
            <div
              ref={listRef}
              className="max-h-[min(400px,60vh)] overflow-y-auto overscroll-contain px-2 py-2"
            >
              {filteredGroups.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Ничего не найдено
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={query}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    {filteredGroups.map((group) => {
                      const groupStartIndex = runningIndex

                      const groupItems = group.items.map((item, idx) => {
                        const itemIndex = groupStartIndex + idx
                        const isActive = item.id === activeItemId
                        const Icon = item.icon

                        return (
                          <motion.button
                            key={item.id}
                            data-active={isActive}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.12,
                              delay: idx * 0.02,
                            }}
                            onClick={() => selectItem(item)}
                            onMouseEnter={() => setActiveIndex(itemIndex)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors duration-100',
                              isActive
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-accent/50',
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.shortcut && (
                              <kbd className="shrink-0 rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {item.shortcut}
                              </kbd>
                            )}
                          </motion.button>
                        )
                      })

                      runningIndex += group.items.length

                      return (
                        <div key={group.title} className="mb-2">
                          <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

            {/* Footer hint */}
            <div className="flex items-center gap-4 border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-0.5 text-[10px]">↑</kbd>
                <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-0.5 text-[10px]">↓</kbd>
                навигация
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-0.5 text-[10px]">Enter</kbd>
                открыть
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-0.5 text-[10px]">Esc</kbd>
                закрыть
              </span>
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
