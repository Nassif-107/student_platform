import { useEffect, useCallback } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlOrMeta?: boolean
  shift?: boolean
  handler: () => void
  /** Skip shortcut when user is typing in an input/textarea */
  ignoreWhenEditing?: boolean
}

/**
 * Global keyboard shortcuts hook.
 * Attaches a single keydown listener and dispatches matched shortcuts.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isEditing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      for (const shortcut of shortcuts) {
        const ctrlOrMeta = shortcut.ctrlOrMeta
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey
        const shift = shortcut.shift ? e.shiftKey : !e.shiftKey

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlOrMeta &&
          shift
        ) {
          if (shortcut.ignoreWhenEditing && isEditing) continue
          e.preventDefault()
          shortcut.handler()
          return
        }
      }
    },
    [shortcuts],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
