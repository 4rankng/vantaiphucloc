import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard, DetailModal } from '@/components/shared/DataList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockTractors, mockTrailers } from '@/data/mockData'
import { Truck } from 'lucide-react'

const statusMap: Record<string, { variant: 'success'|'warning'|'danger'|'neutral'; label: string }> = {
  running: { variant: 'success', label: 'Đang chạy' },
  idle: { variant: 'warning', label: 'Rảnh' },
  maintenance: { variant: 'danger', label: 'Bảo dưỡng' },
  in_use: { variant: 'success', label: 'Đang dùng' },
}

export default function DispatcherFleetPage() {
  const isMobile = useIsMobile()
  const [detailId, setDetailId] = useState<string | null>(null)
  const detail = mockTractors.find(t => t.id === detailId)

  return (
    <div className="space-y-4">
      <FilterBar searchPlaceholder="Tìm biển số..." />
      {isMobile ? (
        <div className="space-y-2">
          {mockTractors.map((t) => (
            <MobileListCard key={t.id} onClick={() => setDetailId(t.id)}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg text-[var(--theme-bg-tertiary)] flex items-center justify-center text-[var(--theme-text-secondary)]"><Truck size={16}/></div>
                  <span className="text-sm font-bold text-[var(--theme-text-primary)] font-mono-num">{t.licensePlate}</span>
                </div>
                <StatusBadge {...statusMap[t.status]} />
              </div>
              <p className="text-[11px] text-[var(--theme-text-muted)]">{t.driverName || 'Chưa gán'} · {t.make}</p>
            </MobileListCard>
          ))}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider border-b border-[var(--theme-border-default)]">
              <th className="px-4 py-2.5 font-semibold">Biển số</th><th className="px-4 py-2.5 font-semibold">Hãng</th>
              <th className="px-4 py-2.5 font-semibold">Tài xế</th><th className="px-4 py-2.5 font-semibold">Trạng thái</th>
            </tr></thead>
            <tbody>{mockTractors.map((t) => (
              <tr key={t.id} className="border-b border-[var(--theme-border-light)] last:border-0 hover:var(--theme-bg-tertiary) cursor-pointer" onClick={() => setDetailId(t.id)}>
                <td className="px-4 py-2.5 font-semibold text-[var(--theme-text-primary)] font-mono-num">{t.licensePlate}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)]">{t.make} {t.model}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-secondary)]">{t.driverName || '—'}</td>
                <td className="px-4 py-2.5"><StatusBadge {...statusMap[t.status]} /></td>
              </tr>
            ))}</tbody>
          </table>
        </GlassCard>
      )}
      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title="Chi tiết xe">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Biển số</span><span className="font-semibold text-[var(--theme-text-primary)] font-mono-num">{detail.licensePlate}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Hãng</span><span className="text-[var(--theme-text-primary)]">{detail.make} {detail.model}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Tài xế</span><span className="text-[var(--theme-text-primary)]">{detail.driverName || '—'}</span></div>
            <div className="flex justify-between py-2"><span className="text-[var(--theme-text-muted)]">Trạng thái</span><StatusBadge {...statusMap[detail.status]} /></div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
