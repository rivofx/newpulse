import Image from 'next/image'
import { getInitials, getAvatarColor, cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  userId: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showOnline?: boolean
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

const onlineSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
}

export function Avatar({ src, name, userId, size = 'md', showOnline, className }: AvatarProps) {
  const colorClass = getAvatarColor(userId)
  const sizeClass = sizes[size]
  const initials = getInitials(name)

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn('avatar', sizeClass, !src && colorClass)}>
        {src ? (
          <Image
            src={src}
            alt={name}
            fill
            className="object-cover rounded-full"
            sizes="64px"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {showOnline && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-surface-0 bg-emerald-400',
            onlineSizes[size]
          )}
        />
      )}
    </div>
  )
}
