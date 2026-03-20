import { cn } from '@/lib/cn'
import { formatRelative, formatDateTime } from '@/lib/format-date'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'

interface DateBadgeProps {
  date: string | Date
  className?: string
}

function DateBadge({ date, className }: DateBadgeProps) {
  const relative = formatRelative(date)
  const exact = formatDateTime(date)

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex text-xs text-muted-foreground cursor-default',
              className
            )}
          >
            {relative}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{exact}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { DateBadge }
export type { DateBadgeProps }
