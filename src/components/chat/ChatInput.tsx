'use client'

import { useState, useRef, useCallback } from 'react'
import { Send, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string) => Promise<void>
  onTyping?: () => void
  placeholder?: string
  disabled?: boolean
}

// Simple emoji panel
const EMOJI_SET = ['😊', '😂', '🥰', '😍', '🤔', '👍', '❤️', '🔥', '💯', '🎉', '😎', '🙏', '😭', '💀', '⚡']

export function ChatInput({ onSend, onTyping, placeholder = 'Type a message…', disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    onTyping?.()

    // Auto resize
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }

  const handleSend = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed || sending || disabled) return
    if (trimmed.length > 2000) return

    setSending(true)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setShowEmoji(false)

    try {
      await onSend(trimmed)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }, [value, sending, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const insertEmoji = (emoji: string) => {
    setValue(prev => prev + emoji)
    textareaRef.current?.focus()
    setShowEmoji(false)
  }

  const canSend = value.trim().length > 0 && !sending && !disabled

  return (
    <div className="relative">
      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full left-0 mb-2 bg-surface-1 border border-[hsl(var(--border))] rounded-2xl p-3 shadow-lg animate-slide-up z-10">
          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
            {EMOJI_SET.map(emoji => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="text-xl hover:scale-125 transition-transform active:scale-110 leading-none"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={cn(
        'flex items-end gap-2 bg-surface-2 border border-[hsl(var(--border))] rounded-2xl px-3 py-2',
        'focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent',
        'transition-all duration-150'
      )}>
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className={cn(
            'flex-shrink-0 mb-0.5 p-1 rounded-lg transition-colors',
            showEmoji ? 'text-accent bg-accent-muted' : 'text-ink-subtle hover:text-ink'
          )}
          aria-label="Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          maxLength={2000}
          className={cn(
            'flex-1 bg-transparent text-ink text-sm placeholder:text-ink-subtle',
            'resize-none focus:outline-none leading-relaxed py-0.5',
            'disabled:opacity-50'
          )}
          aria-label="Message input"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex-shrink-0 mb-0.5 w-8 h-8 rounded-xl flex items-center justify-center transition-all',
            canSend
              ? 'bg-accent text-white hover:bg-blue-500 active:scale-95 shadow-sm'
              : 'bg-surface-3 text-ink-subtle cursor-not-allowed'
          )}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="absolute -bottom-4 right-1 text-[10px] text-ink-subtle">
        {value.length > 1800 && `${value.length}/2000`}
      </p>
    </div>
  )
}
