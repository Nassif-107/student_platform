import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  className?: string
}

function SearchBar({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'Поиск...',
  className,
}: SearchBarProps) {
  const callback = onChange ?? onSearch
  const [internalValue, setInternalValue] = React.useState(controlledValue ?? '')
  const [expanded, setExpanded] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentValue = controlledValue !== undefined ? controlledValue : internalValue

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInternalValue(newValue)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        callback?.(newValue)
      }, 300)
    },
    [callback]
  )

  const handleClear = React.useCallback(() => {
    setInternalValue('')
    callback?.('')
    inputRef.current?.focus()
  }, [callback])

  const handleExpandToggle = React.useCallback(() => {
    setExpanded((prev) => {
      if (!prev) {
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      return !prev
    })
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setExpanded(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className={cn('relative', className)}>
      {/* Desktop search */}
      <div className="hidden sm:block relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={currentValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="pl-10 pr-20"
        />
        {currentValue && (
          <button
            onClick={handleClear}
            title="Очистить поиск"
            className="absolute right-14 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          Ctrl+K
        </kbd>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden flex items-center">
        <AnimatePresence mode="wait">
          {expanded ? (
            <motion.div
              key="input"
              initial={{ width: 40, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              exit={{ width: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={currentValue}
                onChange={handleChange}
                placeholder={placeholder}
                className="pl-10 pr-10"
                onBlur={() => {
                  if (!currentValue) setExpanded(false)
                }}
              />
              <button
                onClick={() => {
                  handleClear()
                  setExpanded(false)
                }}
                title="Закрыть поиск"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <Button
              key="button"
              variant="ghost"
              size="icon"
              onClick={handleExpandToggle}
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Поиск</span>
            </Button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export { SearchBar }
export type { SearchBarProps }
