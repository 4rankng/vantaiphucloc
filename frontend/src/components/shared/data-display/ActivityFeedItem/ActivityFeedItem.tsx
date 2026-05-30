export interface ActivityFeedItemProps {
  icon: React.ReactNode
  iconBg?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  timestamp: string
  isFirst?: boolean
}

export function ActivityFeedItem({ icon, iconBg, title, subtitle, timestamp, isFirst = false }: ActivityFeedItemProps) {
  return (
    <div
      className="flex items-start gap-3 px-5 py-3"
      style={{ borderTop: isFirst ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      <div
        className="flex shrink-0 items-center justify-center rounded-lg mt-0.5"
        style={{ background: iconBg ?? 'var(--theme-bg-tertiary)', width: 30, height: 30 }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
          {title}
        </p>
        {subtitle && (
          <div className="mt-1">
            {subtitle}
          </div>
        )}
      </div>
      <span className="text-[11px] tabular-nums whitespace-nowrap shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
        {timestamp}
      </span>
    </div>
  )
}
