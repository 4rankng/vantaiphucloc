import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ActivityItem {
  id: string
  icon?: ReactNode
  title: string
  description?: string
  timestamp?: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
  className?: string
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  if (items.length === 0) return null
  return (
    <div className={cn('space-y-0', className)}>
      {items.map((item, i) => (
        <div key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
          {i < items.length - 1 && (
            <div className="absolute left-[15px] top-8 bottom-0 w-px bg-[var(--theme-border-default)]" />
          )}
          {item.icon ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)]">
              {item.icon}
            </div>
          ) : (
            <div className="h-8 w-8 shrink-0 rounded-full border-2 border-[var(--theme-brand-primary)] bg-[var(--theme-bg-secondary)]" />
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-medium text-[var(--theme-text-primary)]">{item.title}</p>
            {item.description && (
              <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">{item.description}</p>
            )}
            {item.timestamp && (
              <p className="text-xs text-[var(--theme-text-muted)] mt-1">{item.timestamp}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
