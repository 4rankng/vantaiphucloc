import { cva } from 'class-variance-authority'
import type { BadgeVariant } from '@/components/shared/StatusBadge'

interface TrendProps {
  direction: 'up' | 'down' | 'flat'
  value?: string
  className?: string
}

const trendColors: Record<string, string> = {
  up: 'text-emerald-600',
  down: 'text-red-500',
  flat: 'text-[var(--theme-text-muted)]',
}

export function TrendIndicator({ direction, value, className }: TrendProps) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trendColors[direction]} ${className ?? ''}`}>
      {arrow}{value}
    </span>
  )
}
