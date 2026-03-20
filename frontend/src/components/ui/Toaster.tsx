import { useEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { AnimatePresence, motion } from 'framer-motion'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'destructive'
  duration?: number
}

let toastListeners: Array<(toasts: Toast[]) => void> = []
let toasts: Toast[] = []

function emitToasts() {
  toastListeners.forEach((listener) => listener([...toasts]))
}

export function toast(data: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2, 9)
  const newToast: Toast = { id, ...data }
  toasts = [...toasts, newToast]
  emitToasts()

  const duration = data.duration ?? 5000
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emitToasts()
  }, duration)
}

export function Toaster() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    toastListeners.push(setCurrentToasts)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setCurrentToasts)
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id)
    emitToasts()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {currentToasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              'relative flex w-80 items-start gap-3 rounded-lg border p-4 shadow-lg',
              t.variant === 'destructive'
                ? 'border-destructive/50 bg-destructive/10 text-destructive'
                : t.variant === 'success'
                  ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'border-border bg-card text-card-foreground',
            )}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && (
                <p className="mt-1 text-xs opacity-80">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
