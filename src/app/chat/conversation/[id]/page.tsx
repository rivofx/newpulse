'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Phone, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { Avatar } from '@/components/ui/Avatar'
import { MessageSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { filterProfanity, checkRateLimit, formatDateDivider } from '@/lib/utils'
import type { PrivateMessageWithProfile, Profile } from '@/types/database'

const PAGE_SIZE = 50

export default function ConversationPage() {
  const { id: conversationId } = useParams() as { id: string }
  const router = useRouter()
  const [messages, setMessages] = useState<PrivateMessageWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  const markRead = useCallback(async (userId: string) => {
    await supabase
      .from('conversation_members')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ last_read_at: new Date().toISOString() } as any)
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
  }, [conversationId, supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(profile)

      // Verify access - must be a member
      const { data: memberCheck } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (!memberCheck) {
        router.push('/chat/friends')
        return
      }

      // Get other member
      const { data: otherMember } = await supabase
        .from('conversation_members')
        .select('user_id, profiles(*)')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .single()

      if (otherMember?.profiles) setOtherUser(otherMember.profiles as unknown as Profile)

      // Load messages
      const { data: msgs } = await supabase
        .from('private_messages')
        .select('*, profiles(*)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (msgs) setMessages(msgs.reverse() as PrivateMessageWithProfile[])

      setLoading(false)
      setTimeout(() => scrollToBottom(false), 50)

      // Mark read
      await markRead(user.id)
    }
    init()
  }, [conversationId, router, supabase, scrollToBottom, markRead])

  useEffect(() => {
    if (!currentUser) return

    const channelName = `conv-${conversationId}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'private_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const { data: msgWithProfile } = await supabase
          .from('private_messages')
          .select('*, profiles(*)')
          .eq('id', payload.new.id)
          .single()

        if (msgWithProfile) {
          setMessages(prev => {
            const filtered = prev.filter(m => !m.id.startsWith('optimistic-'))
            return [...filtered, msgWithProfile as PrivateMessageWithProfile]
          })
          setTimeout(() => scrollToBottom(), 50)
          if (msgWithProfile.user_id !== currentUser.id) {
            markRead(currentUser.id)
          }
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          setTypingUsers(prev => {
            if (!prev.includes(payload.displayName)) return [...prev, payload.displayName]
            return prev
          })
          setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== payload.displayName)), 2500)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUser, supabase, scrollToBottom, markRead])

  async function handleSend(content: string) {
    if (!currentUser) return
    if (!checkRateLimit()) { toast('Slow down!', 'error'); return }

    const filtered = filterProfanity(content)
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMsg: PrivateMessageWithProfile = {
      id: optimisticId,
      conversation_id: conversationId,
      user_id: currentUser.id,
      content: filtered,
      created_at: new Date().toISOString(),
      profiles: currentUser,
    }

    setMessages(prev => [...prev, optimisticMsg])
    setTimeout(() => scrollToBottom(), 50)

    const { error } = await supabase
      .from('private_messages')
      .insert({ conversation_id: conversationId, user_id: currentUser.id, content: filtered })

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      toast('Failed to send message', 'error')
    }
  }

  async function handleTyping() {
    if (!currentUser) return
    await supabase.channel(`conv-${conversationId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUser.id, displayName: currentUser.display_name }
    })
  }

  function renderMessages() {
    let lastDate = ''
    return messages.map((msg, i) => {
      const msgDate = formatDateDivider(msg.created_at)
      const showDivider = msgDate !== lastDate
      if (showDivider) lastDate = msgDate

      const prevMsg = messages[i - 1]
      const showAvatar = !prevMsg || prevMsg.user_id !== msg.user_id || showDivider
      const showName = false // 1:1 chat, no need for names

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
        <button
          onClick={() => router.back()}
          className="btn-ghost p-1.5 md:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {otherUser && (
          <>
            <Avatar src={otherUser.avatar_url} name={otherUser.display_name} userId={otherUser.id} size="sm" />
            <div className="flex-1">
              <p className="font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                {otherUser.display_name}
              </p>
              <p className="text-xs text-emerald-400">Active now</p>
            </div>
          </>
        )}

        <div className="ml-auto flex gap-1">
          <button className="btn-ghost p-1.5" aria-label="Voice call" title="Coming soon">
            <Phone className="w-4 h-4" />
          </button>
          <button className="btn-ghost p-1.5" aria-label="Video call" title="Coming soon">
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2 pb-16 md:pb-2">
        {loading ? (
          <div className="flex flex-col gap-1">
            {[...Array(6)].map((_, i) => <MessageSkeleton key={i} mine={i % 2 === 0} />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            {otherUser && (
              <>
                <Avatar src={otherUser.avatar_url} name={otherUser.display_name} userId={otherUser.id} size="xl" />
                <div>
                  <p className="font-semibold text-ink">Start a conversation with {otherUser.display_name}</p>
                  <p className="text-sm text-ink-muted mt-1">Send your first message below!</p>
                </div>
              </>
            )}
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
      <div className="px-4 py-3 bg-surface-1 border-t border-[hsl(var(--border))] flex-shrink-0 mb-16 md:mb-0">
        <ChatInput
          onSend={handleSend}
          onTyping={handleTyping}
          placeholder={`Message ${otherUser?.display_name || ''}…`}
          disabled={!currentUser}
        />
      </div>
    </div>
  )
}
