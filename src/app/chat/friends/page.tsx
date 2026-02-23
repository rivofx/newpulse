'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Users, UserCheck, Clock, MessageCircle, UserX, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import type { Profile, FriendshipWithProfile } from '@/types/database'

interface FriendWithConv {
  friendship: FriendshipWithProfile
  friend: Profile
  conversationId?: string
}

export default function FriendsPage() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [incomingRequests, setIncomingRequests] = useState<FriendshipWithProfile[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendshipWithProfile[]>([])
  const [friends, setFriends] = useState<FriendWithConv[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setCurrentUser(profile)

    // Incoming pending
    const { data: incoming } = await supabase
      .from('friendships')
      .select('*, requester:requester_id(id, display_name, avatar_url, status, created_at, updated_at)')
      .eq('addressee_id', user.id)
      .eq('status', 'pending')

    // Outgoing pending
    const { data: outgoing } = await supabase
      .from('friendships')
      .select('*, addressee:addressee_id(id, display_name, avatar_url, status, created_at, updated_at)')
      .eq('requester_id', user.id)
      .eq('status', 'pending')

    // Accepted friendships
    const { data: acceptedAsRequester } = await supabase
      .from('friendships')
      .select('*, addressee:addressee_id(id, display_name, avatar_url, status, created_at, updated_at)')
      .eq('requester_id', user.id)
      .eq('status', 'accepted')

    const { data: acceptedAsAddressee } = await supabase
      .from('friendships')
      .select('*, requester:requester_id(id, display_name, avatar_url, status, created_at, updated_at)')
      .eq('addressee_id', user.id)
      .eq('status', 'accepted')

    setIncomingRequests((incoming || []) as FriendshipWithProfile[])
    setOutgoingRequests((outgoing || []) as FriendshipWithProfile[])

    // Build friends list with conversation IDs
    const allFriends: FriendWithConv[] = []

    for (const f of (acceptedAsRequester || []) as FriendshipWithProfile[]) {
      if (!f.addressee) continue
      const convId = await findOrGetConversation(user.id, f.addressee.id)
      allFriends.push({ friendship: f, friend: f.addressee as Profile, conversationId: convId })
    }

    for (const f of (acceptedAsAddressee || []) as FriendshipWithProfile[]) {
      if (!f.requester) continue
      const convId = await findOrGetConversation(user.id, f.requester.id)
      allFriends.push({ friendship: f, friend: f.requester as Profile, conversationId: convId })
    }

    setFriends(allFriends)
    setLoading(false)
  }, [supabase])

  async function findOrGetConversation(userId: string, otherUserId: string): Promise<string | undefined> {
    const { data } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId)

    if (!data?.length) return undefined

    const convIds = data.map(m => m.conversation_id)
    const { data: shared } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', convIds)

    return shared?.[0]?.conversation_id
  }

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('friends-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadData, supabase])

  async function acceptRequest(friendshipId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() } as any)
      .eq('id', friendshipId)

    if (error) { toast('Failed to accept request', 'error'); return }

    // Find the friendship to get both user IDs
    const { data: friendship } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('id', friendshipId)
      .single()

    if (friendship) {
      // Create conversation
      const { data: conv } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single()

      if (conv) {
        await supabase.from('conversation_members').insert([
          { conversation_id: conv.id, user_id: friendship.requester_id },
          { conversation_id: conv.id, user_id: friendship.addressee_id },
        ])
      }
    }

    toast('Friend request accepted! 🎉', 'success')
    loadData()
  }

  async function rejectRequest(friendshipId: string) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'rejected', updated_at: new Date().toISOString() } as any)
      .eq('id', friendshipId)

    if (!error) { toast('Request declined', 'info'); loadData() }
    else toast('Failed to decline request', 'error')
  }

  async function cancelRequest(friendshipId: string) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() } as any)
      .eq('id', friendshipId)

    if (!error) { toast('Request cancelled', 'info'); loadData() }
    else toast('Failed to cancel request', 'error')
  }

  async function removeFriend(friendshipId: string) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'rejected', updated_at: new Date().toISOString() } as any)
      .eq('id', friendshipId)

    if (!error) { toast('Friend removed', 'info'); loadData() }
    else toast('Failed to remove friend', 'error')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-2 animate-pulse" />
          <div className="h-3 w-32 bg-surface-2 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-16 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 bg-surface-1 border-b border-[hsl(var(--border))] px-4 py-3 z-10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <Users className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Friends</h1>
          <p className="text-xs text-ink-subtle">{friends.length} friends</p>
        </div>
        <Link
          href="/chat/friends/find"
          className="ml-auto btn-primary text-sm py-1.5 px-3"
        >
          + Find People
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-6">
        {/* Incoming requests */}
        {incomingRequests.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Incoming Requests ({incomingRequests.length})
            </h2>
            <div className="flex flex-col gap-2">
              {incomingRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 bg-surface-1 border border-[hsl(var(--border))] rounded-2xl p-3">
                  <Avatar
                    src={req.requester?.avatar_url}
                    name={req.requester?.display_name || '?'}
                    userId={req.requester_id}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">{req.requester?.display_name}</p>
                    <p className="text-xs text-ink-subtle">Wants to be your friend</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => acceptRequest(req.id)}
                      className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition-colors"
                      aria-label="Accept"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => rejectRequest(req.id)}
                      className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 flex items-center justify-center transition-colors"
                      aria-label="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Outgoing requests */}
        {outgoingRequests.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Sent Requests ({outgoingRequests.length})
            </h2>
            <div className="flex flex-col gap-2">
              {outgoingRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 bg-surface-1 border border-[hsl(var(--border))] rounded-2xl p-3">
                  <Avatar
                    src={req.addressee?.avatar_url}
                    name={req.addressee?.display_name || '?'}
                    userId={req.addressee_id}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">{req.addressee?.display_name}</p>
                    <p className="text-xs text-ink-subtle">Pending…</p>
                  </div>
                  <button
                    onClick={() => cancelRequest(req.id)}
                    className="text-xs text-ink-subtle hover:text-rose-400 transition-colors px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Friends list */}
        <section>
          <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5" />
            Friends ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <div className="text-center py-12 bg-surface-1 border border-dashed border-[hsl(var(--border))] rounded-2xl">
              <Users className="w-10 h-10 text-ink-subtle mx-auto mb-3" />
              <p className="font-semibold text-ink">No friends yet</p>
              <p className="text-sm text-ink-muted mt-1 mb-4">Search for people to connect with</p>
              <Link href="/chat/friends/find" className="btn-primary text-sm">
                Find People
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {friends.map(({ friendship, friend, conversationId }) => (
                <div key={friendship.id} className="flex items-center gap-3 bg-surface-1 border border-[hsl(var(--border))] rounded-2xl p-3 group hover:border-accent/30 transition-colors">
                  <Avatar
                    src={friend.avatar_url}
                    name={friend.display_name}
                    userId={friend.id}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">{friend.display_name}</p>
                    <p className="text-xs text-ink-subtle">{friend.status || 'Member'}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {conversationId && (
                      <Link
                        href={`/chat/conversation/${conversationId}`}
                        className="w-9 h-9 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 flex items-center justify-center transition-colors"
                        aria-label="Send message"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => removeFriend(friendship.id)}
                      className="w-9 h-9 rounded-xl text-ink-subtle hover:bg-rose-500/10 hover:text-rose-400 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Remove friend"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
