import type { ElementType } from 'react'

interface DashboardSectionHeaderProps {
  title: string
  subtitle?: string
  icon?: ElementType
  className?: string
  right?: React.ReactNode
}

export function DashboardSectionHeader({
  title,
  subtitle,
  icon: Icon,
  className = '',
  right,
}: DashboardSectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg border"
            style={{
              background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
              borderColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            }}
          >
            <Icon
              className="h-3.5 w-3.5"
              style={{ color: 'var(--accent)', opacity: 0.7 }}
            />
          </div>
        )}
        <div>
          <h2
            className="font-semibold"
            style={{ fontSize: '13.5px', letterSpacing: '-0.01em', color: 'var(--ink)' }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="typo-meta mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right}
    </div>
  )
}
