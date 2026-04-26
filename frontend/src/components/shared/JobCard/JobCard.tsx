import { ContBadge } from '@/components/shared/ContBadge'
import { formatCurrencyFull, type WorkOrder } from '@/data/mockData'

export function JobCard({ job, onClick }: { job: WorkOrder; onClick: () => void }) {
  const date = new Date(job.createdAt)
  const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-3.5 transition-all active:scale-[0.98] touch-manipulation"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      {/* Container numbers + types */}
      <div className={`grid ${job.containers.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1 mb-2`}>
        {job.containers.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <p className="text-sm font-bold font-mono truncate" style={{ color: 'var(--theme-text-primary)' }}>
              {c.containerNumber}
            </p>
            <ContBadge type={c.workType} />
          </div>
        ))}
      </div>

      {/* Customer + Route */}
      <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
        {job.clientName}
      </p>
      <p className="text-[11px] truncate" style={{ color: 'var(--theme-text-muted)' }}>
        {job.route}
      </p>

      {/* Bottom: earning + date */}
      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        {job.earning > 0 ? (
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            +{formatCurrencyFull(job.earning)}
          </span>
        ) : (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}
          >
            Chờ đối soát
          </span>
        )}
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>
          {dateStr}
        </span>
      </div>
    </button>
  )
}
