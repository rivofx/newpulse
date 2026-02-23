'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function FriendRequestsBadge({ mini = false }: { mini?: boolean }) {
  const [count, setCount] = useState(0)
  const supabase = createClient()

  const loadCount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { count } = await supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true })
      .eq('addressee_id', user.id)
      .eq('status', 'pending')

    setCount(count || 0)
  }, [supabase])

  useEffect(() => {
    loadCount()

    const channel = supabase
      .channel('friend-requests-badge')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
      }, loadCount)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadCount, supabase])

  if (count === 0) return null

  if (mini) {
    return (
      <span className={cn(
        'bg-rose-500 text-white text-[9px] font-bold rounded-full',
        'min-w-[14px] h-[14px] flex items-center justify-center px-0.5'
      )}>
        {count > 9 ? '9+' : count}
      </span>
    )
  }

  return (
    <span className="unread-badge bg-rose-500">
      {count > 9 ? '9+' : count}
    </span>
  )
}
