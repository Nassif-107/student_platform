import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/cn'

// Map of route segments to Russian labels
const ROUTE_LABELS: Record<string, string> = {
  courses: 'Курсы',
  materials: 'Материалы',
  forum: 'Форум',
  groups: 'Группы',
  deadlines: 'Дедлайны',
  marketplace: 'Маркетплейс',
  events: 'События',
  analytics: 'Аналитика',
  friends: 'Друзья',
  notifications: 'Уведомления',
  settings: 'Настройки',
  profile: 'Профиль',
  professors: 'Преподаватели',
  upload: 'Загрузка',
  ask: 'Новый вопрос',
  find: 'Поиск команды',
  new: 'Новое объявление',
  edit: 'Редактирование',
}

interface BreadcrumbsProps {
  /** Override the last breadcrumb label (e.g., course title instead of ID) */
  current?: string
  className?: string
}

export function Breadcrumbs({ current, className }: BreadcrumbsProps) {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  // Don't show on home page or auth pages
  if (segments.length <= 1 && !current) return null
  if (segments[0] === 'auth') return null

  // Build breadcrumb items
  const items: { label: string; path: string }[] = []
  let pathAccumulator = ''

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    pathAccumulator += `/${seg}`

    // If it's the last segment and we have a custom label, use it
    if (i === segments.length - 1 && current) {
      items.push({ label: current, path: pathAccumulator })
    }
    // If it looks like an ID (24-char hex or UUID), skip it
    else if (/^[0-9a-f]{24}$/.test(seg) || /^[0-9a-f-]{36}$/.test(seg)) {
      // skip — the "current" prop should provide the label
      if (current && i === segments.length - 1) {
        items.push({ label: current, path: pathAccumulator })
      }
    }
    // Known route segment
    else if (ROUTE_LABELS[seg]) {
      items.push({ label: ROUTE_LABELS[seg], path: pathAccumulator })
    }
  }

  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumbs" className={cn('flex items-center gap-1.5 text-sm', className)}>
      <Link
        to="/"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={item.path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
