import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSocket } from '@/hooks/useSocket'
import { groupsService } from '@/services/groups.service'
import { formatRelative } from '@/lib/format-date'
import { cn } from '@/lib/cn'

interface GroupChatProps {
  groupId: string
  currentUserId: string
}

interface ChatMessage {
  id: string
  userId: string
  userName?: string
  text: string
  timestamp: string
  isMine: boolean
  pending?: boolean
}

export function GroupChat({ groupId, currentUserId }: GroupChatProps) {
  const socket = useSocket()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const socketJoined = useRef(false)

  // Step 1: Load history, THEN join socket room (prevents race condition)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessages([])
    socketJoined.current = false

    groupsService.getChatMessages(groupId, 50)
      .then((history) => {
        if (cancelled) return
        setMessages(history.map((m) => ({
          ...m,
          isMine: m.userId === currentUserId,
        })))
      })
      .catch(() => { /* chat is non-critical */ })
      .finally(() => {
        if (cancelled) return
        setLoading(false)

        // Only join socket AFTER history loaded — no race
        if (socket) {
          socket.emit('join-group', groupId)
          socketJoined.current = true
        }
      })

    return () => {
      cancelled = true
      if (socket && socketJoined.current) {
        socket.emit('leave-group', groupId)
      }
    }
  }, [groupId, currentUserId, socket])

  // Step 2: Listen for real-time messages (dedup by ID)
  useEffect(() => {
    if (!socket) return

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => {
        // Check for duplicates (server echo or already in history)
        if (prev.some((m) => m.id === msg.id)) return prev

        // Replace the FIRST pending optimistic message with matching text
        const pendingIdx = prev.findIndex((m) => m.pending && m.text === msg.text)
        if (pendingIdx !== -1) {
          const updated = [...prev]
          updated[pendingIdx] = { ...msg, isMine: msg.isMine ?? msg.userId === currentUserId }
          return updated
        }

        return [...prev, { ...msg, isMine: msg.isMine ?? msg.userId === currentUserId }]
      })
    }

    const handleError = (data: { text: string }) => {
      // Remove the pending message that failed to send
      setMessages((prev) => prev.filter((m) => !(m.pending && m.text === data.text)))
    }

    socket.on('group-message', handleMessage)
    socket.on('group-message-error', handleError)
    return () => {
      socket.off('group-message', handleMessage)
      socket.off('group-message-error', handleError)
    }
  }, [socket, currentUserId])

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !socket) return

    const text = inputValue.trim()

    // Optimistic: show message immediately as "pending"
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      userId: currentUserId,
      text,
      timestamp: new Date().toISOString(),
      isMine: true,
      pending: true,
    }
    setMessages((prev) => [...prev, optimistic])
    setInputValue('')

    // Send to server — server will persist and echo back the confirmed message
    socket.emit('group-message', { groupId, text })
  }, [inputValue, socket, groupId, currentUserId])

  return (
    <div className="rounded-xl border bg-card">
      <div className="h-80 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Нет сообщений. Напишите первое!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col gap-0.5',
                msg.isMine ? 'items-end' : 'items-start',
                msg.pending && 'opacity-60',
              )}
            >
              {!msg.isMine && msg.userName && (
                <span className="text-[10px] font-medium text-muted-foreground ml-1">{msg.userName}</span>
              )}
              <div
                className={cn(
                  'rounded-2xl px-3.5 py-2 text-sm max-w-[75%]',
                  msg.isMine
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted rounded-bl-md',
                )}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-muted-foreground px-1">
                {msg.pending ? 'Отправка...' : formatRelative(msg.timestamp)}
              </span>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex items-center gap-2 border-t p-3">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Написать сообщение..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!inputValue.trim()}
          title="Отправить"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
