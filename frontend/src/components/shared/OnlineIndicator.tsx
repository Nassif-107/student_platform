import { cn } from '@/lib/cn'

interface OnlineIndicatorProps {
  isOnline: boolean
  size?: 'sm' | 'md'
}

const sizeMap = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
} as const

export function OnlineIndicator({ isOnline, size = 'sm' }: OnlineIndicatorProps) {
  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 rounded-full border-2 border-background',
        sizeMap[size],
        isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400',
      )}
    />
  )
}
