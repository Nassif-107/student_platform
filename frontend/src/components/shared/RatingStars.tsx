import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'

interface RatingStarsProps {
  value: number
  max?: number
  interactive?: boolean
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

function RatingStars({
  value,
  max = 5,
  interactive = false,
  onChange,
  size = 'md',
  className,
}: RatingStarsProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)

  const displayValue = hoverValue ?? value
  const iconSize = sizeMap[size]

  const handleClick = (starIndex: number) => {
    if (!interactive) return
    onChange?.(starIndex)
  }

  const handleMouseEnter = (starIndex: number) => {
    if (!interactive) return
    setHoverValue(starIndex)
  }

  const handleMouseLeave = () => {
    if (!interactive) return
    setHoverValue(null)
  }

  const stars = Array.from({ length: max }, (_, i) => {
    const starNumber = i + 1
    const filled = displayValue >= starNumber
    const halfFilled = !filled && displayValue >= starNumber - 0.5

    return (
      <button
        key={i}
        type="button"
        disabled={!interactive}
        onClick={() => handleClick(starNumber)}
        onMouseEnter={() => handleMouseEnter(starNumber)}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'relative inline-flex',
          interactive && 'cursor-pointer transition-transform hover:scale-110',
          !interactive && 'cursor-default'
        )}
      >
        {/* Background star (empty) */}
        <Star className={cn(iconSize, 'text-muted-foreground/30')} />
        {/* Filled overlay */}
        {(filled || halfFilled) && (
          <Star
            className={cn(iconSize, 'absolute inset-0 fill-yellow-400 text-yellow-400')}
            style={halfFilled ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
          />
        )}
      </button>
    )
  })

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {stars}
      {!interactive && (
        <span className="ml-1 text-sm text-muted-foreground">
          {(value ?? 0).toFixed(1)}
        </span>
      )}
    </div>
  )
}

export { RatingStars }
export type { RatingStarsProps }
