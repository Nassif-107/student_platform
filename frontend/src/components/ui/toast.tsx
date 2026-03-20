import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastVariant = 'default' | 'success' | 'error' | 'warning'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (opts: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

let toastCounter = 0

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`
    const newToast: Toast = { id, variant: 'default', ...opts }
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border/60 bg-card text-card-foreground',
  success: 'border-success/30 bg-success/5 text-foreground',
  error: 'border-destructive/30 bg-destructive/5 text-foreground',
  warning: 'border-warning/30 bg-warning/5 text-foreground',
}

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-5 w-5 text-info" />,
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <AlertCircle className="h-5 w-5 text-destructive" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
}

const variantAccent: Record<ToastVariant, string> = {
  default: 'bg-info',
  success: 'bg-success',
  error: 'bg-destructive',
  warning: 'bg-warning',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const variant = toast.variant ?? 'default'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border p-4',
        'shadow-xl backdrop-blur-sm',
        variantStyles[variant]
      )}
    >
      {/* Accent bar on left */}
      <div className={cn('absolute left-0 top-0 h-full w-1 rounded-l-xl', variantAccent[variant])} />

      <span className="mt-0.5 shrink-0 pl-1">{variantIcons[variant]}</span>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold tracking-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Закрыть</span>
      </button>
    </motion.div>
  )
}

function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col-reverse gap-2 sm:bottom-6 sm:right-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

export { ToastProvider, Toaster, useToast }
export type { Toast, ToastVariant }
