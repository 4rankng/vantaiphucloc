import { StatusBadge } from '@/components/shared/StatusBadge'
import { GlassCard } from '@/components/shared/GlassCard'
import { getJobStatusBadge, type JobStatus, formatCurrencyShort } from '@/data/mockData'
import { tripStatusVariant } from '@/lib/statusMaps'
import { Button } from '@/components/ui/Button'
import type { TripData } from '../TripCard'

interface TripTableProps {
  data: TripData[]
  onRowClick?: (id: string) => void
  showActions?: boolean
}

const columns = [
  { key: 'id', label: 'Mã' },
  { key: 'jobDate', label: 'Ngày' },
  { key: 'route', label: 'Tuyến' },
  { key: 'driverName', label: 'Tài xế' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'revenue', label: 'Cước', align: 'right' as const },
] as const

export function TripTable({ data, onRowClick, showActions }: TripTableProps) {
  return (
    <GlassCard className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
            <th className="px-4 py-2.5 font-semibold">Mã</th>
            <th className="px-4 py-2.5 font-semibold">Ngày</th>
            <th className="px-4 py-2.5 font-semibold">Tuyến</th>
            {showActions && <th className="px-4 py-2.5 font-semibold">Cont</th>}
            {showActions && <th className="px-4 py-2.5 font-semibold">Đầu kéo</th>}
            <th className="px-4 py-2.5 font-semibold">Tài xế</th>
            <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
            <th className="px-4 py-2.5 font-semibold text-right">Cước</th>
            {showActions && <th className="px-4 py-2.5 font-semibold">Hành động</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((j) => {
            const s = getJobStatusBadge(j.status as JobStatus)
            return (
              <tr
                key={j.id}
                className="hover:bg-[var(--theme-bg-tertiary)] cursor-pointer"
                style={{ borderBottom: '1px solid var(--theme-border-light)' }}
                onClick={() => onRowClick?.(j.id)}
              >
                <td className="px-4 py-2.5 font-semibold text-[var(--theme-text-primary)] font-mono-num">{j.id}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)] font-mono-num">{j.jobDate}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-primary)] max-w-[200px] truncate">{j.route}</td>
                {showActions && <td className="px-4 py-2.5"><span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{j.trailerType}</span></td>}
                {showActions && <td className="px-4 py-2.5 text-[var(--theme-text-muted)] font-mono-num">{j.tractorPlate}</td>}
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)]">{j.driverName}</td>
                <td className="px-4 py-2.5"><StatusBadge variant={tripStatusVariant(j.status)} label={s.label} /></td>
                <td className="px-4 py-2.5 text-right font-semibold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(j.revenue)}</td>
                {showActions && (
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    {j.status === 'PLANNED' && <Button size="sm" variant="gold" className="text-xs h-7">Bắt đầu</Button>}
                    {j.status === 'IN_PROGRESS' && <Button size="sm" variant="outline" className="text-xs h-7">Hoàn thành</Button>}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </GlassCard>
  )
}
