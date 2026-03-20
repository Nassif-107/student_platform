import * as React from 'react'
import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  onAction?: () => void
  className?: string
}

function EmptyState({
  icon,
  title,
  description,
  action,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 p-12 text-center',
        'bg-gradient-to-b from-muted/30 to-muted/10',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/60"
      >
        <div className="text-muted-foreground/60">
          {icon ?? <Inbox className="h-10 w-10" />}
        </div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-1.5 text-lg font-semibold tracking-tight"
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground"
        >
          {description}
        </motion.p>
      )}

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {typeof action === 'string'
            ? onAction && <Button onClick={onAction}>{action}</Button>
            : action}
        </motion.div>
      )}
    </motion.div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
