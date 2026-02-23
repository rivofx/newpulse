'use client'

import { useState } from 'react'
import { Flag, MoreHorizontal } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatMessageTime } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface MessageBubbleProps {
  id: string
  content: string
  createdAt: string
  author: Profile
  isOwn: boolean
  showAvatar: boolean
  showName: boolean
  onReport?: (messageId: string) => void
  optimistic?: boolean
}

export function MessageBubble({
  id,
  content,
  createdAt,
  author,
  isOwn,
  showAvatar,
  showName,
  onReport,
  optimistic,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={cn(
        'group flex items-end gap-2 px-4 py-0.5 animate-fade-in',
        isOwn && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div className="w-8 flex-shrink-0">
        {showAvatar && !isOwn ? (
          <Avatar src={author.avatar_url} name={author.display_name} userId={author.id} size="sm" />
        ) : null}
      </div>

      {/* Message content */}
      <div className={cn('flex flex-col max-w-[75%]', isOwn && 'items-end')}>
        {showName && !isOwn && (
          <span className="text-xs font-semibold text-ink-muted mb-1 ml-1">
            {author.display_name}
          </span>
        )}

        <div className="relative group/bubble">
          <div className={cn(isOwn ? 'bubble-mine' : 'bubble-theirs', optimistic && 'opacity-70')}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>

          {/* Context menu */}
          {onReport && !isOwn && (
            <div className={cn(
              'absolute top-0 -left-8 opacity-0 group-hover/bubble:opacity-100 transition-opacity',
              showMenu && 'opacity-100'
            )}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-6 h-6 rounded-lg bg-surface-2 hover:bg-surface-3 flex items-center justify-center transition-colors"
              >
                <MoreHorizontal className="w-3 h-3 text-ink-subtle" />
              </button>

              {showMenu && (
                <div className="absolute left-0 top-8 z-10 bg-surface-1 border border-[hsl(var(--border))] rounded-xl shadow-lg p-1 min-w-[120px]">
                  <button
                    onClick={() => { onReport(id); setShowMenu(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <span className="text-[10px] text-ink-subtle mt-0.5 mx-1">
          {optimistic ? 'Sending...' : formatMessageTime(createdAt)}
        </span>
      </div>
    </div>
  )
}
