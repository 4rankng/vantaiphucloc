import { ContBadge } from '@/components/shared/ContBadge'
import type { WorkOrder } from '@/data/domain'

type WorkOrderJobCardStatus = 'unmatched' | 'matched' | 'pending-client'

interface WorkOrderJobCardProps {
  job: WorkOrder
  status?: WorkOrderJobCardStatus
  onClick?: () => void
}

const STATUS_LABELS: Record<WorkOrderJobCardStatus, { label: string; bg: string; color: string }> = {
  unmatched:      { label: 'Đối soát tài xế',    bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' },
  matched:        { label: 'Đã khớp',             bg: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' },
  'pending-client': { label: 'Đối soát khách hàng', bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' },
}

function uniqueWorkTypes(job: WorkOrder) {
  return Array.from(new Set(job.containers.map(c => c.workType)))
}

function allContNumbers(job: WorkOrder) {
  return job.containers.map(c => c.containerNumber).filter(Boolean).join(' · ') || job.code || ''
}

export function WorkOrderJobCard({ job, status = 'unmatched', onClick }: WorkOrderJobCardProps) {
  const types = uniqueWorkTypes(job)
  const statusCfg = STATUS_LABELS[status]

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {types.map(t => <ContBadge key={t} type={t} />)}
          <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {allContNumbers(job)}
          </span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2"
          style={{ background: statusCfg.bg, color: statusCfg.color }}
        >
          {statusCfg.label}
        </span>
      </div>
      <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
        {job.driverName} · {job.tractorPlate}
      </p>
      <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
        {job.clientName} · {job.route}
      </p>
    </>
  )

  const cardStyle = {
    background: 'var(--theme-bg-secondary)',
    boxShadow: 'var(--theme-shadow-card)',
    border: '1px solid var(--theme-border-default)',
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left rounded-2xl p-3 transition-all active:scale-[0.98] touch-manipulation"
        style={cardStyle}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className="w-full rounded-2xl p-3" style={cardStyle}>
      {inner}
    </div>
  )
}
