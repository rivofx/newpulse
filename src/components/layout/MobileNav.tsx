'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Hash, Users, UserPlus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FriendRequestsBadge } from '@/components/friends/FriendRequestsBadge'

export function MobileNav() {
  const pathname = usePathname()

  const tabs = [
    { href: '/chat/global', icon: Hash, label: 'Global' },
    { href: '/chat/friends', icon: Users, label: 'Friends' },
    { href: '/chat/friends/find', icon: UserPlus, label: 'Find' },
    { href: '/chat/profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-1 border-t border-[hsl(var(--border))] z-40 pb-safe">
      <div className="flex items-stretch">
        {tabs.map(tab => {
          const active = pathname === tab.href || (tab.href !== '/chat/global' && tab.href !== '/chat/profile' && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors relative',
                active ? 'text-accent' : 'text-ink-subtle hover:text-ink-muted'
              )}
            >
              <div className="relative">
                <tab.icon className="w-5 h-5" />
                {tab.label === 'Friends' && (
                  <div className="absolute -top-1 -right-1">
                    <FriendRequestsBadge mini />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
