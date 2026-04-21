import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

interface LoadingStateProps {
  rows?: number
  className?: string
}

export function LoadingState({ rows = 4, className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-4 p-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton shape="card" className="h-16" />
        </div>
      ))}
    </div>
  )
}
