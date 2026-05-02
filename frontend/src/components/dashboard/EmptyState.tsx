import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: 'var(--theme-bg-tertiary)' }}
      >
        <Icon className="h-6 w-6" style={{ color: 'var(--theme-text-muted)', opacity: 0.6 }} />
      </div>
      <p className="mt-3 text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
        {title}
      </p>
      {description && (
        <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {description}
        </p>
      )}
    </div>
  )
}
