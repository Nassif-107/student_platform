import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/cn'

interface LoadingScreenProps {
  className?: string
  message?: string
}

export function LoadingScreen({
  className,
  message = 'Загрузка...',
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-6 gradient-mesh',
        className,
      )}
    >
      {/* Animated logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/30 via-info/20 to-primary/30 blur-xl"
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/25">
          <GraduationCap className="h-8 w-8 text-primary-foreground" />
        </div>
      </motion.div>

      {/* Animated dots */}
      <div className="flex items-center gap-2">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-medium text-muted-foreground"
        >
          {message}
        </motion.p>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              className="h-1.5 w-1.5 rounded-full bg-primary"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
