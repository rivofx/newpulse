'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, Check, Clock, UserMinus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import type { Profile, Friendship } from '@/types/database'

interface SearchResult {
  profile: Profile
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted'
  friendshipId?: string
}

export default function FindPeoplePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null)
    })
  }, [supabase.auth])

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || !currentUserId) {
      setResults([])
      return
    }

    setSearching(true)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .ilike('display_name', `%${trimmed}%`)
      .neq('id', currentUserId)
      .limit(20)

    if (!profiles) {
      setSearching(false)
      return
    }

    // Get all friendships involving current user
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
      .in('status', ['pending', 'accepted'])

    const results: SearchResult[] = profiles.map(profile => {
      const friendship = (friendships || []).find(
        (f: Friendship) =>
          (f.requester_id === currentUserId && f.addressee_id === profile.id) ||
          (f.addressee_id === currentUserId && f.requester_id === profile.id)
      )

      let status: SearchResult['friendshipStatus'] = 'none'
      if (friendship) {
        if (friendship.status === 'accepted') status = 'accepted'
        else if (friendship.status === 'pending') {
          status = friendship.requester_id === currentUserId ? 'pending_sent' : 'pending_received'
        }
      }

      return { profile, friendshipStatus: status, friendshipId: friendship?.id }
    })

    setResults(results)
    setSearching(false)
  }, [currentUserId, supabase])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  async function sendRequest(addresseeId: string) {
    if (!currentUserId) return

    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: currentUserId, addressee_id: addresseeId, status: 'pending' })

    if (error) {
      if (error.code === '23505') toast('Request already sent', 'info')
      else toast('Failed to send request', 'error')
      return
    }

    toast('Friend request sent! 🙌', 'success')
    search(query)
  }

  async function cancelRequest(friendshipId: string) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'cancelled' } as any)
      .eq('id', friendshipId)

    if (!error) { toast('Request cancelled', 'info'); search(query) }
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-16 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 bg-surface-1 border-b border-[hsl(var(--border))] px-4 py-3 z-10">
        <h1 className="font-bold text-ink mb-3" style={{ fontFamily: 'var(--font-display)' }}>Find People</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
          <input
            type="text"
            placeholder="Search by display name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input-base pl-9"
            autoFocus
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {searching && (
          <div className="flex items-center gap-2 text-sm text-ink-subtle py-4">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Searching…
          </div>
        )}

        {!searching && query && results.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-ink-subtle mx-auto mb-3" />
            <p className="font-semibold text-ink">No users found</p>
            <p className="text-sm text-ink-muted mt-1">Try a different name</p>
          </div>
        )}

        {!query && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-accent" />
            </div>
            <p className="font-semibold text-ink">Search for friends</p>
            <p className="text-sm text-ink-muted mt-1">Type a display name to find people</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map(({ profile, friendshipStatus, friendshipId }) => (
              <div
                key={profile.id}
                className="flex items-center gap-3 bg-surface-1 border border-[hsl(var(--border))] rounded-2xl p-3 hover:border-accent/30 transition-colors"
              >
                <Avatar
                  src={profile.avatar_url}
                  name={profile.display_name}
                  userId={profile.id}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{profile.display_name}</p>
                  <p className="text-xs text-ink-subtle">
                    {friendshipStatus === 'accepted' ? '✓ Already friends'
                     : friendshipStatus === 'pending_sent' ? 'Request sent'
                     : friendshipStatus === 'pending_received' ? 'Sent you a request'
                     : 'Pulse member'}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {friendshipStatus === 'none' && (
                    <button
                      onClick={() => sendRequest(profile.id)}
                      className="flex items-center gap-1.5 text-sm btn-primary py-1.5 px-3"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  )}
                  {friendshipStatus === 'pending_sent' && (
                    <button
                      onClick={() => cancelRequest(friendshipId!)}
                      className="flex items-center gap-1.5 text-sm btn-secondary py-1.5 px-3"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Pending
                    </button>
                  )}
                  {friendshipStatus === 'pending_received' && (
                    <span className="text-sm text-ink-muted flex items-center gap-1.5 px-2">
                      <Clock className="w-3.5 h-3.5" />
                      Check Friends
                    </span>
                  )}
                  {friendshipStatus === 'accepted' && (
                    <span className="text-sm text-emerald-400 flex items-center gap-1.5 px-2">
                      <Check className="w-3.5 h-3.5" />
                      Friends
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
