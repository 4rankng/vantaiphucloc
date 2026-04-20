import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard, DetailModal } from '@/components/shared/DataList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockJobs, formatCurrencyFull, formatCurrencyShort, getJobStatusBadge } from '@/data/mockData'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const statusVariant = (s: string): 'success'|'warning'|'danger'|'info'|'neutral' =>
  s === 'IN_PROGRESS' ? 'success' : s === 'COMPLETED' ? 'info' : s === 'PLANNED' ? 'warning' : s === 'CANCELLED' ? 'danger' : 'neutral'

const filters = [
  { key: 'status', label: 'Trạng thái', options: [
    { value: 'all', label: 'Tất cả' }, { value: 'IN_PROGRESS', label: 'Đang chạy' },
    { value: 'PLANNED', label: 'Lên kế hoạch' }, { value: 'COMPLETED', label: 'Hoàn thành' },
  ]},
]

export default function DirectorTripsPage() {
  const isMobile = useIsMobile()
  const [detailId, setDetailId] = useState<string | null>(null)
  const detail = mockJobs.find(j => j.id === detailId)

  return (
    <div className="space-y-4">
      <FilterBar searchPlaceholder="Tìm mã chuyến, tài xế, tuyến..." filters={filters} />
      {isMobile ? (
        <div className="space-y-2">
          {mockJobs.map((j) => {
            const s = getJobStatusBadge(j.status)
            return (
              <MobileListCard key={j.id} onClick={() => setDetailId(j.id)}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-navy-900 font-mono-num">{j.id}</span>
                  <StatusBadge variant={statusVariant(j.status)} label={s.label} />
                </div>
                <p className="text-[12px] text-navy-900 font-medium truncate">{j.route}</p>
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <span className="text-gray-400">{j.jobDate} · {j.driverName}</span>
                  <span className="font-bold text-navy-900 font-mono-num">{formatCurrencyShort(j.revenue)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{j.trailerType}</span>
                  <span className="text-[10px] text-gray-400">Cont: {j.containerNumber}</span>
                </div>
              </MobileListCard>
            )
          })}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-navy-100">
              <th className="px-4 py-2.5 font-semibold">Mã</th><th className="px-4 py-2.5 font-semibold">Ngày</th>
              <th className="px-4 py-2.5 font-semibold">Tuyến</th><th className="px-4 py-2.5 font-semibold">Cont</th>
              <th className="px-4 py-2.5 font-semibold">Đầu kéo</th><th className="px-4 py-2.5 font-semibold">Tài xế</th>
              <th className="px-4 py-2.5 font-semibold">Trạng thái</th><th className="px-4 py-2.5 font-semibold text-right">Cước</th>
            </tr></thead>
            <tbody>{mockJobs.map((j) => {
              const s = getJobStatusBadge(j.status)
              return (
                <tr key={j.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30 cursor-pointer" onClick={() => setDetailId(j.id)}>
                  <td className="px-4 py-2.5 font-semibold text-navy-900 font-mono-num">{j.id}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono-num">{j.jobDate}</td>
                  <td className="px-4 py-2.5 text-navy-900 max-w-[200px] truncate">{j.route}</td>
                  <td className="px-4 py-2.5"><span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{j.trailerType}</span></td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono-num">{j.tractorPlate}</td>
                  <td className="px-4 py-2.5 text-gray-500">{j.driverName}</td>
                  <td className="px-4 py-2.5"><StatusBadge variant={statusVariant(j.status)} label={s.label} /></td>
                  <td className="px-4 py-2.5 text-right font-semibold text-navy-900 font-mono-num">{formatCurrencyShort(j.revenue)}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </GlassCard>
      )}

      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title={`Chuyến ${detailId || ''}`}>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Mã chuyến</span><span className="font-semibold text-navy-900 font-mono-num">{detail.id}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Ngày</span><span className="text-navy-900 font-mono-num">{detail.jobDate}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Tuyến</span><span className="text-navy-900 text-right max-w-[60%]">{detail.route}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Container</span><span className="text-navy-900 font-mono-num">{detail.containerNumber}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Đầu kéo</span><span className="text-navy-900 font-mono-num">{detail.tractorPlate}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Rơ mooc</span><span className="text-navy-900 font-mono-num">{detail.trailerPlate}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Tài xế</span><span className="text-navy-900">{detail.driverName}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Khách hàng</span><span className="text-navy-900">{detail.clientName}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Khoảng cách</span><span className="text-navy-900">{detail.distanceKm} km</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Doanh thu</span><span className="font-semibold text-navy-900 font-mono-num">{formatCurrencyFull(detail.revenue)}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Cước tài xế</span><span className="text-navy-900 font-mono-num">{formatCurrencyFull(detail.driverFee)}</span></div>
            <div className="flex justify-between py-2"><span className="text-gray-500">Trạng thái</span><StatusBadge variant={statusVariant(detail.status)} label={getJobStatusBadge(detail.status).label} /></div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
