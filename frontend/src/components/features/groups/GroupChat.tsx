import { useState, useEffect, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSocket } from '@/hooks/useSocket'
import { formatRelative } from '@/lib/format-date'
import { cn } from '@/lib/cn'

interface GroupChatProps {
  groupId: string
  currentUserId: string
}

interface ChatMessage {
  id: string
  userId: string
  text: string
  timestamp: string
  isMine: boolean
}

export function GroupChat({ groupId, currentUserId }: GroupChatProps) {
  const socket = useSocket()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!socket) return

    socket.emit('join-group', groupId)

    const handleMessage = (msg: { id: string; userId: string; text: string; timestamp: string }) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, { ...msg, isMine: msg.userId === currentUserId }]
      })
    }

    socket.on('group-message', handleMessage)

    return () => {
      socket.off('group-message', handleMessage)
      socket.emit('leave-group', groupId)
    }
  }, [socket, groupId, currentUserId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !socket) return

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      userId: currentUserId,
      text: inputValue.trim(),
      timestamp: new Date().toISOString(),
      isMine: true,
    }

    socket.emit('group-message', {
      groupId,
      id: msg.id,
      text: msg.text,
      timestamp: msg.timestamp,
    })

    setMessages((prev) => [...prev, msg])
    setInputValue('')
  }, [inputValue, socket, groupId, currentUserId])

  return (
    <div className="rounded-xl border bg-card">
      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Нет сообщений</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col gap-0.5',
                msg.isMine ? 'items-end' : 'items-start',
              )}
            >
              <div
                className={cn(
                  'rounded-lg px-3 py-2 text-sm max-w-[75%]',
                  msg.isMine
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted',
                )}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatRelative(msg.timestamp)}
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
