import { CheckCircle, Clock, CircleDollarSign } from 'lucide-react'
import { formatCurrencyFull, type WorkOrder } from '@/data/mockData'

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  PENDING:  { label: 'Chờ đối soát', icon: Clock,       color: 'var(--theme-status-warning)', bg: 'var(--theme-status-warning-light)' },
  PRICED:   { label: 'Đã tính giá', icon: CheckCircle,  color: 'var(--theme-status-success)', bg: 'var(--theme-status-success-light)' },
  APPROVED: { label: 'Đã duyệt',    icon: CheckCircle,  color: 'var(--theme-brand-primary)',  bg: 'var(--theme-brand-primary-light)' },
}

export function WorkOrderCard({ data: wo }: { data: WorkOrder }) {
  const s = STATUS_CONFIG[wo.status] ?? STATUS_CONFIG.PENDING
  const StatusIcon = s.icon
  return (
    <div
      className="rounded-2xl p-3.5"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <p className="text-sm font-bold font-mono truncate flex-1" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.workOrderNumber}
        </p>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
        >
          {wo.workType}
        </span>
      </div>

      <p className="text-[11px] font-medium truncate mb-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
        {wo.driverName}
      </p>
      <p className="text-[10px] font-mono mb-1" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.tractorPlate}
      </p>
      <p className="text-[11px] truncate mb-2" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.clientName}
      </p>

      {/* Earning */}
      {wo.earning > 0 ? (
        <div className="flex items-center gap-1.5 mb-1">
          <CircleDollarSign className="w-3.5 h-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            {formatCurrencyFull(wo.earning)}
          </span>
        </div>
      ) : (
        <div
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: s.bg }}
        >
          <StatusIcon className="w-3 h-3" style={{ color: s.color }} />
          <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</span>
        </div>
      )}

      <p className="text-[10px] mt-2" style={{ color: 'var(--theme-text-muted)' }}>
        {new Date(wo.createdAt).toLocaleDateString('vi-VN')}
      </p>
    </div>
  )
}
