'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Hash, Users, MessageCircle, Sun, Moon, LogOut, Settings, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ui/ThemeProvider'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import { ConversationsList } from '@/components/chat/ConversationsList'
import { FriendRequestsBadge } from '@/components/friends/FriendRequestsBadge'

interface SidebarProps {
  user: Profile
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="w-72 h-full flex flex-col bg-surface-1 border-r border-[hsl(var(--border))]">
      {/* Header */}
      <div className="p-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Pulse
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 flex flex-col gap-1">
        <Link
          href="/chat/global"
          className={cn('sidebar-item', pathname === '/chat/global' && 'active')}
        >
          <Hash className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium text-sm">Global Chat</span>
        </Link>

        <Link
          href="/chat/friends"
          className={cn('sidebar-item', pathname.startsWith('/chat/friends') && 'active')}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium text-sm">Friends</span>
          <div className="ml-auto">
            <FriendRequestsBadge />
          </div>
        </Link>

        <Link
          href="/chat/friends/find"
          className={cn('sidebar-item', pathname === '/chat/friends/find' && 'active')}
        >
          <UserPlus className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium text-sm">Find People</span>
        </Link>
      </nav>

      <div className="px-3 mb-2">
        <div className="h-px bg-[hsl(var(--border))]" />
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <p className="px-4 py-1 text-xs font-semibold text-ink-subtle uppercase tracking-wider">
          Messages
        </p>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3">
          <ConversationsList currentUserId={user.id} />
        </div>
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-[hsl(var(--border))]">
        <div className="flex items-center gap-2.5">
          <Link href="/chat/profile" className="flex-1 min-w-0 flex items-center gap-2.5 hover:bg-surface-2 rounded-xl px-2 py-1.5 transition-colors">
            <Avatar src={user.avatar_url} name={user.display_name} userId={user.id} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{user.display_name}</p>
              <p className="text-xs text-ink-subtle truncate">{user.status || 'Online'}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="btn-ghost p-1.5"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/chat/profile" className="btn-ghost p-1.5" aria-label="Settings">
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={handleSignOut}
              className="btn-ghost p-1.5 text-rose-400 hover:text-rose-300"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
