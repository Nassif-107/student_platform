import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  trend?: {
    direction: 'up' | 'down'
    percentage: number
  }
  /** Accent color for the icon container gradient */
  color?: 'primary' | 'success' | 'info' | 'warning'
  className?: string
}

const COLOR_MAP = {
  primary: {
    bg: 'from-primary/15 to-primary/5',
    icon: 'text-primary',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]',
  },
  success: {
    bg: 'from-success/15 to-success/5',
    icon: 'text-success',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--success)/0.15)]',
  },
  info: {
    bg: 'from-info/15 to-info/5',
    icon: 'text-info',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--info)/0.15)]',
  },
  warning: {
    bg: 'from-warning/15 to-warning/5',
    icon: 'text-warning',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--warning)/0.15)]',
  },
}

/** Animate a number from 0 to target using requestAnimationFrame */
function useAnimatedCounter(target: number, duration = 800) {
  const [current, setCurrent] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  useEffect(() => {
    if (!isInView || target === 0) return
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [isInView, target, duration])

  return { current, ref }
}

function StatCard({ icon, label, value, trend, color = 'primary', className }: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : parseInt(value, 10)
  const isNumeric = !isNaN(numericValue) && typeof value === 'number'
  const { current, ref } = useAnimatedCounter(isNumeric ? numericValue : 0)
  const colors = COLOR_MAP[color]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4',
        'transition-all duration-300 ease-out',
        'hover:border-border hover:shadow-lg hover:-translate-y-0.5',
        colors.glow,
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.02] pointer-events-none" />

      <div className="relative flex items-center gap-4">
        {/* Icon with gradient background */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            'bg-gradient-to-br transition-transform duration-300 group-hover:scale-105',
            colors.bg, colors.icon
          )}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-none tracking-tight tabular-nums">
            {isNumeric ? current.toLocaleString('ru-RU') : value}
          </p>
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</p>
        </div>

        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
              trend.direction === 'up'
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.percentage}%
          </div>
        )}
      </div>
    </motion.div>
  )
}

export { StatCard }
export type { StatCardProps }
