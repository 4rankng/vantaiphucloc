import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  hover?: boolean
}

export function GlassCard({ children, className, style, onClick, hover = false }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        'rounded-xl border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] p-4 transition-colors duration-150',
        (hover || onClick) && 'cursor-pointer hover:border-[var(--theme-border-strong,#d4d4d8)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function GlassCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] p-5 space-y-3', className)}>
      <div className="h-4 w-24 animate-pulse rounded bg-[var(--theme-bg-tertiary)]" />
      <div className="h-8 w-32 animate-pulse rounded bg-[var(--theme-bg-tertiary)]" />
      <div className="h-3 w-20 animate-pulse rounded bg-[var(--theme-bg-tertiary)]" />
    </div>
  )
}
