import { StatusBadge } from '@/components/shared/StatusBadge'
import { GlassCard } from '@/components/shared/GlassCard'
import { vehicleStatusMap } from '@/lib/statusMaps'
import type { VehicleData } from '../VehicleCard'

interface VehicleTableProps {
  tractors: VehicleData[]
  trailers: VehicleData[]
  onRowClick?: (id: string) => void
}

export function VehicleTable({ tractors, trailers, onRowClick }: VehicleTableProps) {
  return (
    <GlassCard className="overflow-hidden">
      <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
        <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">Đầu kéo ({tractors.length})</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
            <th className="px-4 py-2.5 font-semibold">Biển số</th>
            <th className="px-4 py-2.5 font-semibold">Hãng/Model</th>
            <th className="px-4 py-2.5 font-semibold">Tài xế</th>
            <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
            <th className="px-4 py-2.5 font-semibold">Hạn đăng kiểm</th>
          </tr>
        </thead>
        <tbody>
          {tractors.map(t => (
            <tr
              key={t.id}
              className="hover:bg-[var(--theme-bg-tertiary)] cursor-pointer"
              style={{ borderBottom: '1px solid var(--theme-border-light)' }}
              onClick={() => onRowClick?.(t.id)}
            >
              <td className="px-4 py-3 font-semibold text-[var(--theme-text-primary)] font-mono-num">{t.licensePlate}</td>
              <td className="px-4 py-3 text-[var(--theme-text-muted)]">{t.make} {t.model}</td>
              <td className="px-4 py-3 text-[var(--theme-text-secondary)]">{t.driverName || '—'}</td>
              <td className="px-4 py-3"><StatusBadge {...(vehicleStatusMap[t.status] || { variant: 'neutral', label: t.status })} /></td>
              <td className="px-4 py-3 text-[var(--theme-text-muted)] font-mono-num">{t.inspectionDue || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="p-4" style={{ borderTop: '1px solid var(--theme-border-default)' }}>
        <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">Rơ mooc ({trailers.length})</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
            <th className="px-4 py-2.5 font-semibold">Biển số</th>
            <th className="px-4 py-2.5 font-semibold">Loại</th>
            <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {trailers.map(t => (
            <tr key={t.id} className="hover:bg-[var(--theme-bg-tertiary)]" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
              <td className="px-4 py-3 font-semibold text-[var(--theme-text-primary)] font-mono-num">{t.licensePlate}</td>
              <td className="px-4 py-3">
                {t.type && <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{t.type}</span>}
              </td>
              <td className="px-4 py-3"><StatusBadge {...(vehicleStatusMap[t.status] || { variant: 'neutral', label: t.status })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  )
}
