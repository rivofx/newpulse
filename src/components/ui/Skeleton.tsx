import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />
}

export function MessageSkeleton({ mine = false }: { mine?: boolean }) {
  return (
    <div className={cn('flex gap-3 px-4 py-1', mine && 'flex-row-reverse')}>
      {!mine && <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />}
      <div className={cn('flex flex-col gap-1', mine && 'items-end')}>
        {!mine && <Skeleton className="w-24 h-3 rounded" />}
        <Skeleton className="h-10 rounded-2xl" style={{ width: `${120 + Math.random() * 100}px` } as React.CSSProperties} />
      </div>
    </div>
  )
}

export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-24 rounded" />
        <Skeleton className="h-3 w-36 rounded" />
      </div>
    </div>
  )
}
