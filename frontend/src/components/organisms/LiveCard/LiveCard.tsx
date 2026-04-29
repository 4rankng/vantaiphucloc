interface LiveCardProps {
  title: string
  subtitle?: string
  elapsed?: string
  onClick: () => void
}

export function LiveCard({ title, subtitle, elapsed, onClick }: LiveCardProps) {
  return (
    <div className="px-4 mb-4">
      <button
        onClick={onClick}
        className="w-full text-left rounded-2xl overflow-hidden card-lift"
        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
      >
        {/* Amber header bar */}
        <div className="px-4 py-2.5 flex items-center justify-between"
          style={{ background: 'var(--theme-status-warning)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full live-dot" style={{ background: 'var(--theme-text-on-brand)' }} />
            <span className="text-[11px] font-bold" style={{ color: 'var(--theme-text-on-brand)' }}>ĐANG CHẠY</span>
            {elapsed && <span className="text-[10px]" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.8 }}>• {elapsed}</span>}
          </div>
          <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-on-brand)' }}>Chi tiết →</span>
        </div>

        {/* Content */}
        <div className="px-4 py-3" style={{ background: 'var(--theme-bg-secondary)' }}>
          <p className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>{title}</p>
          {subtitle && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>{subtitle}</span>
            </div>
          )}
        </div>
      </button>
    </div>
  )
}
