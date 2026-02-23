'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { ConversationSkeleton } from '@/components/ui/Skeleton'
import { cn, formatTime } from '@/lib/utils'
import type { ConversationWithDetails } from '@/types/database'

interface ConversationsListProps {
  currentUserId: string
}

export function ConversationsList({ currentUserId }: ConversationsListProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const supabase = createClient()

  const loadConversations = useCallback(async () => {
    // Get conversations where user is a member
    const { data: memberData } = await supabase
      .from('conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', currentUserId)

    if (!memberData?.length) {
      setConversations([])
      setLoading(false)
      return
    }

    const convIds = memberData.map(m => m.conversation_id)

    // Get other members' profiles
    const { data: otherMembers } = await supabase
      .from('conversation_members')
      .select('conversation_id, user_id, profiles(*)')
      .in('conversation_id', convIds)
      .neq('user_id', currentUserId)

    // Get last message per conversation
    const convDetails: ConversationWithDetails[] = []

    for (const convId of convIds) {
      const member = memberData.find(m => m.conversation_id === convId)
      const other = otherMembers?.find(m => m.conversation_id === convId)
      if (!other?.profiles) continue

      const { data: lastMsg } = await supabase
        .from('private_messages')
        .select('content, created_at, user_id')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Count unread
      let unreadCount = 0
      if (lastMsg && member?.last_read_at) {
        const { count } = await supabase
          .from('private_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('user_id', currentUserId)
          .gt('created_at', member.last_read_at)
        unreadCount = count || 0
      } else if (lastMsg && !member?.last_read_at) {
        const { count } = await supabase
          .from('private_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('user_id', currentUserId)
        unreadCount = count || 0
      }

      convDetails.push({
        id: convId,
        created_at: '',
        other_user: other.profiles as never,
        last_message: lastMsg ? { content: lastMsg.content, created_at: lastMsg.created_at, user_id: lastMsg.user_id } : undefined,
        unread_count: unreadCount,
        last_read_at: member?.last_read_at || null,
      })
    }

    // Sort by last message
    convDetails.sort((a, b) => {
      const aTime = a.last_message?.created_at || ''
      const bTime = b.last_message?.created_at || ''
      return bTime.localeCompare(aTime)
    })

    setConversations(convDetails)
    setLoading(false)
  }, [currentUserId, supabase])

  useEffect(() => {
    loadConversations()

    // Subscribe to new messages
    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'private_messages',
      }, () => loadConversations())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadConversations, supabase])

  if (loading) {
    return (
      <div className="flex flex-col gap-0.5">
        {[...Array(4)].map((_, i) => <ConversationSkeleton key={i} />)}
      </div>
    )
  }

  if (!conversations.length) {
    return (
      <div className="px-2 py-4 text-center">
        <p className="text-xs text-ink-subtle">No conversations yet.</p>
        <p className="text-xs text-ink-subtle">Add friends to start chatting!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {conversations.map(conv => {
        const active = pathname === `/chat/conversation/${conv.id}`
        const isMe = conv.last_message?.user_id === currentUserId

        return (
          <Link
            key={conv.id}
            href={`/chat/conversation/${conv.id}`}
            className={cn(
              'flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer transition-colors',
              active ? 'bg-accent-muted' : 'hover:bg-surface-2'
            )}
          >
            <Avatar
              src={conv.other_user.avatar_url}
              name={conv.other_user.display_name}
              userId={conv.other_user.id}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className={cn('text-sm truncate', conv.unread_count > 0 ? 'font-semibold text-ink' : 'font-medium text-ink')}>
                  {conv.other_user.display_name}
                </p>
                {conv.last_message && (
                  <span className="text-[10px] text-ink-subtle flex-shrink-0">
                    {formatTime(conv.last_message.created_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <p className={cn('text-xs truncate', conv.unread_count > 0 ? 'text-ink-muted font-medium' : 'text-ink-subtle')}>
                  {conv.last_message
                    ? `${isMe ? 'You: ' : ''}${conv.last_message.content}`
                    : 'No messages yet'
                  }
                </p>
                {conv.unread_count > 0 && (
                  <span className="unread-badge flex-shrink-0">{conv.unread_count > 99 ? '99+' : conv.unread_count}</span>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
