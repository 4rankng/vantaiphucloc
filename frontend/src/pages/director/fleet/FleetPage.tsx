import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard, DetailModal } from '@/components/shared/DataList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatCard } from '@/components/shared/StatCard'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockTractors, mockTrailers } from '@/data/mockData'
import { Truck, CircleDot, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DialogClose } from '@/components/ui/dialog'

const statusMap: Record<string, { variant: 'success'|'warning'|'danger'|'neutral'; label: string }> = {
  running: { variant: 'success', label: 'Đang chạy' },
  idle: { variant: 'warning', label: 'Rảnh' },
  maintenance: { variant: 'danger', label: 'Bảo dưỡng' },
  in_use: { variant: 'success', label: 'Đang dùng' },
}

export default function FleetPage() {
  const isMobile = useIsMobile()
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const running = mockTractors.filter(t => t.status === 'running').length
  const idle = mockTractors.filter(t => t.status === 'idle').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Truck size={18}/>} label="Đầu kéo" value={mockTractors.length} />
        <StatCard icon={<CircleDot size={18}/>} label="Đang chạy" value={running} variant="success" />
        <StatCard icon={<Wrench size={18}/>} label="Rơ mooc" value={mockTrailers.length} />
        <StatCard icon={<CircleDot size={18}/>} label="Rảnh" value={idle} variant="warning" />
      </div>

      <FilterBar searchPlaceholder="Tìm biển số, tài xế..." onCreateClick={() => setShowCreate(true)} createLabel="Thêm xe" />

      {isMobile ? (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Đầu kéo</h4>
          {mockTractors.map((t) => (
            <MobileListCard key={t.id} onClick={() => setDetailId(t.id)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center text-navy-600"><Truck size={16}/></div>
                  <span className="text-sm font-bold text-navy-900 font-mono-num">{t.licensePlate}</span>
                </div>
                <StatusBadge {...statusMap[t.status]} />
              </div>
              <p className="text-[11px] text-gray-400">{t.make} {t.model} · {t.driverName || 'Chưa gán TX'}</p>
            </MobileListCard>
          ))}
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider pt-2">Rơ mooc</h4>
          {mockTrailers.map((t) => (
            <MobileListCard key={t.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gold-50 flex items-center justify-center text-gold-500"><Truck size={16}/></div>
                  <div>
                    <span className="text-sm font-bold text-navy-900 font-mono-num">{t.licensePlate}</span>
                    <span className="ml-2 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{t.type}</span>
                  </div>
                </div>
                <StatusBadge {...statusMap[t.status]} />
              </div>
            </MobileListCard>
          ))}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="p-4 border-b border-navy-100"><h3 className="text-sm font-bold text-navy-900">Đầu kéo ({mockTractors.length})</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-navy-100">
              <th className="px-4 py-2.5 font-semibold">Biển số</th><th className="px-4 py-2.5 font-semibold">Hãng/Model</th>
              <th className="px-4 py-2.5 font-semibold">Tài xế</th><th className="px-4 py-2.5 font-semibold">Trạng thái</th>
              <th className="px-4 py-2.5 font-semibold">Hạn đăng kiểm</th>
            </tr></thead>
            <tbody>{mockTractors.map((t) => (
              <tr key={t.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30 cursor-pointer" onClick={() => setDetailId(t.id)}>
                <td className="px-4 py-3 font-semibold text-navy-900 font-mono-num">{t.licensePlate}</td>
                <td className="px-4 py-3 text-gray-500">{t.make} {t.model}</td>
                <td className="px-4 py-3 text-gray-600">{t.driverName || '—'}</td>
                <td className="px-4 py-3"><StatusBadge {...statusMap[t.status]} /></td>
                <td className="px-4 py-3 text-gray-500 font-mono-num">{t.inspectionDue || '25/04/2025'}</td>
              </tr>
            ))}</tbody>
          </table>
          <div className="p-4 border-t border-navy-100"><h3 className="text-sm font-bold text-navy-900 mb-3">Rơ mooc ({mockTrailers.length})</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-navy-100">
              <th className="px-4 py-2.5 font-semibold">Biển số</th><th className="px-4 py-2.5 font-semibold">Loại</th><th className="px-4 py-2.5 font-semibold">Trạng thái</th>
            </tr></thead>
            <tbody>{mockTrailers.map((t) => (
              <tr key={t.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30">
                <td className="px-4 py-3 font-semibold text-navy-900 font-mono-num">{t.licensePlate}</td>
                <td className="px-4 py-3"><span className="text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{t.type}</span></td>
                <td className="px-4 py-3"><StatusBadge {...statusMap[t.status]} /></td>
              </tr>
            ))}</tbody>
          </table>
        </GlassCard>
      )}

      <DetailModal open={!!detailId} onOpenChange={() => setDetailId(null)} title="Chi tiết xe">
        {(() => { const t = mockTractors.find(x => x.id === detailId); if (!t) return null; return (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Biển số</span><span className="font-semibold text-navy-900 font-mono-num">{t.licensePlate}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Hãng</span><span className="text-navy-900">{t.make} {t.model}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Trạng thái</span><StatusBadge {...statusMap[t.status]} /></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Tài xế</span><span className="text-navy-900">{t.driverName || '—'}</span></div>
            <div className="flex justify-between py-2"><span className="text-gray-500">Hạn đăng kiểm</span><span className="text-navy-900">{t.inspectionDue || '25/04/2025'}</span></div>
          </div>
        )})()}
      </DetailModal>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Thêm phương tiện</DialogTitle><DialogDescription>Nhập thông tin xe mới</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Biển số</Label><Input placeholder="VD: 15C-123.45" /></div>
            <div className="space-y-2"><Label>Loại xe</Label>
              <Select><SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                <SelectContent><SelectItem value="tractor">Đầu kéo</SelectItem><SelectItem value="trailer">Rơ mooc</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Hãng xe</Label><Input placeholder="VD: Howo" /></div>
            <div className="space-y-2"><Label>Model</Label><Input placeholder="VD: ZZ4257N3247C1" /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button className="bg-gold-400 text-navy-950 hover:bg-gold-300">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
