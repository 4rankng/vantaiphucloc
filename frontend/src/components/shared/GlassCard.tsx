import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  style?: React.CSSProperties
}

export function GlassCard({ children, className, onClick, hover = false }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card rounded-xl',
        hover && 'hover:shadow-md transition-shadow cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

export function GlassCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card rounded-xl p-5 space-y-3', className)}>
      <div className="h-4 w-24 skeleton-shimmer rounded" />
      <div className="h-8 w-32 skeleton-shimmer rounded" />
      <div className="h-3 w-20 skeleton-shimmer rounded" />
    </div>
  )
}
