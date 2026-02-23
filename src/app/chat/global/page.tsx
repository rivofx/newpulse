'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Hash, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { MessageSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { filterProfanity, checkRateLimit, formatDateDivider } from '@/lib/utils'
import type { GlobalMessageWithProfile, Profile } from '@/types/database'

const PAGE_SIZE = 50

export default function GlobalChatPage() {
  const [messages, setMessages] = useState<GlobalMessageWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineCount] = useState(Math.floor(Math.random() * 20) + 5) // simulated
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setCurrentUser(profile)

      // Load initial messages
      const { data } = await supabase
        .from('global_messages')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (data) {
        setMessages(data.reverse() as GlobalMessageWithProfile[])
      }
      setLoading(false)
      setTimeout(() => scrollToBottom(false), 50)
    }
    init()
  }, [supabase, scrollToBottom])

  useEffect(() => {
    // Real-time subscription
    const channel = supabase
      .channel('global-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'global_messages',
      }, async (payload) => {
        const { data: msgWithProfile } = await supabase
          .from('global_messages')
          .select('*, profiles(*)')
          .eq('id', payload.new.id)
          .single()

        if (msgWithProfile) {
          setMessages(prev => {
            // Remove optimistic version if exists
            const filtered = prev.filter(m => !m.id.startsWith('optimistic-'))
            return [...filtered, msgWithProfile as GlobalMessageWithProfile]
          })
          setTimeout(() => scrollToBottom(), 50)
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== currentUser?.id) {
          setTypingUsers(prev => {
            if (!prev.includes(payload.displayName)) {
              return [...prev, payload.displayName]
            }
            return prev
          })
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(n => n !== payload.displayName))
          }, 2500)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, currentUser?.id, scrollToBottom])

  async function handleSend(content: string) {
    if (!currentUser) return
    if (!checkRateLimit()) {
      toast('Slow down! You\'re sending messages too fast.', 'error')
      return
    }

    const filtered = filterProfanity(content)

    // Optimistic update
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMsg: GlobalMessageWithProfile = {
      id: optimisticId,
      user_id: currentUser.id,
      content: filtered,
      image_url: null,
      created_at: new Date().toISOString(),
      profiles: currentUser,
    }
    setMessages(prev => [...prev, optimisticMsg])
    setTimeout(() => scrollToBottom(), 50)

    const { error } = await supabase
      .from('global_messages')
      .insert({ user_id: currentUser.id, content: filtered })

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      toast('Failed to send message', 'error')
    }
  }

  async function handleTyping() {
    if (!currentUser) return

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    await supabase.channel('global-chat').send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUser.id, displayName: currentUser.display_name }
    })
  }

  async function handleReport(messageId: string) {
    if (!currentUser) return
    const { error } = await supabase
      .from('message_reports')
      .insert({
        reporter_id: currentUser.id,
        message_id: messageId,
        message_type: 'global',
        reason: 'User report',
      })

    if (!error) toast('Message reported. Thank you!', 'success')
    else toast('Could not report message', 'error')
  }

  // Render messages with date dividers
  function renderMessages() {
    let lastDate = ''
    return messages.map((msg, i) => {
      const msgDate = formatDateDivider(msg.createdAt || msg.created_at)
      const showDivider = msgDate !== lastDate
      if (showDivider) lastDate = msgDate

      const prevMsg = messages[i - 1]
      const showAvatar = !prevMsg || prevMsg.user_id !== msg.user_id || showDivider
      const showName = showAvatar

      return (
        <div key={msg.id}>
          {showDivider && (
            <div className="flex items-center gap-3 my-4 px-4">
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              <span className="text-xs text-ink-subtle font-medium">{msgDate}</span>
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
            </div>
          )}
          <MessageBubble
            id={msg.id}
            content={msg.content}
            createdAt={msg.created_at}
            author={msg.profiles}
            isOwn={msg.user_id === currentUser?.id}
            showAvatar={showAvatar}
            showName={showName}
            onReport={handleReport}
            optimistic={msg.id.startsWith('optimistic-')}
          />
        </div>
      )
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-1 border-b border-[hsl(var(--border))] flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
          <Hash className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Global Chat
          </h1>
          <p className="text-xs text-ink-subtle">Open to everyone</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-ink-muted">
          <Users className="w-3.5 h-3.5" />
          <span>{onlineCount} online</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto scrollbar-thin py-2 pb-16 md:pb-2"
      >
        {loading ? (
          <div className="flex flex-col gap-1">
            {[...Array(8)].map((_, i) => (
              <MessageSkeleton key={i} mine={i % 3 === 0} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Hash className="w-8 h-8 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-ink">Be the first to say hello!</p>
              <p className="text-sm text-ink-muted mt-1">Global Chat is open to all users.</p>
            </div>
          </div>
        ) : (
          <>
            {renderMessages()}
            <div ref={bottomRef} />
          </>
        )}

        <TypingIndicator names={typingUsers} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-surface-1 border-t border-[hsl(var(--border))] flex-shrink-0 pb-safe mb-16 md:mb-0">
        <ChatInput
          onSend={handleSend}
          onTyping={handleTyping}
          placeholder="Message the world…"
          disabled={!currentUser}
        />
      </div>
    </div>
  )
}
