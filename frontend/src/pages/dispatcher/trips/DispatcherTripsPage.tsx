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

export default function DispatcherTripsPage() {
  const isMobile = useIsMobile()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const detail = mockJobs.find(j => j.id === detailId)

  return (
    <div className="space-y-4">
      <FilterBar searchPlaceholder="Tìm chuyến xe..." onCreateClick={() => setShowCreate(true)} createLabel="Tạo chuyến" />

      {isMobile ? (
        <div className="space-y-2">
          {mockJobs.map((j) => {
            const s = getJobStatusBadge(j.status)
            return (
              <MobileListCard key={j.id} onClick={() => setDetailId(j.id)}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-navy-900 font-mono-num">{j.id}</span>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{j.trailerType}</span>
                  </div>
                  <StatusBadge variant={statusVariant(j.status)} label={s.label} />
                </div>
                <p className="text-[12px] text-navy-900 font-medium">{j.route}</p>
                <div className="mt-2 space-y-1 text-[11px] text-gray-400">
                  <div className="flex justify-between"><span>{j.jobDate} · {j.driverName}</span><span className="font-bold text-navy-900 font-mono-num">{formatCurrencyShort(j.revenue)}</span></div>
                  <div className="flex justify-between"><span>Cont: {j.containerNumber}</span><span>{j.distanceKm} km</span></div>
                </div>
                <div className="flex gap-2 mt-3">
                  {j.status === 'PLANNED' && <Button size="sm" className="bg-gold-400 text-navy-950 hover:bg-gold-300 text-xs h-8">▶ Bắt đầu</Button>}
                  {j.status === 'IN_PROGRESS' && <Button size="sm" variant="outline" className="text-xs h-8">✓ Hoàn thành</Button>}
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
              <th className="px-4 py-2.5 font-semibold">Tuyến</th><th className="px-4 py-2.5 font-semibold">Tài xế</th>
              <th className="px-4 py-2.5 font-semibold">Trạng thái</th><th className="px-4 py-2.5 font-semibold text-right">Cước</th>
              <th className="px-4 py-2.5 font-semibold">Hành động</th>
            </tr></thead>
            <tbody>{mockJobs.map((j) => {
              const s = getJobStatusBadge(j.status)
              return (
                <tr key={j.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30 cursor-pointer" onClick={() => setDetailId(j.id)}>
                  <td className="px-4 py-2.5 font-semibold text-navy-900 font-mono-num">{j.id}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono-num">{j.jobDate}</td>
                  <td className="px-4 py-2.5 text-navy-900 max-w-[200px] truncate">{j.route}</td>
                  <td className="px-4 py-2.5 text-gray-500">{j.driverName}</td>
                  <td className="px-4 py-2.5"><StatusBadge variant={statusVariant(j.status)} label={s.label} /></td>
                  <td className="px-4 py-2.5 text-right font-semibold text-navy-900 font-mono-num">{formatCurrencyShort(j.revenue)}</td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    {j.status === 'PLANNED' && <Button size="sm" className="bg-gold-400 text-navy-950 hover:bg-gold-300 text-xs h-7">Bắt đầu</Button>}
                    {j.status === 'IN_PROGRESS' && <Button size="sm" variant="outline" className="text-xs h-7">Hoàn thành</Button>}
                  </td>
                </tr>
              )
            })}</tbody>
          </table>
        </GlassCard>
      )}

      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title={`Chuyến ${detailId || ''}`}>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Mã</span><span className="font-semibold text-navy-900 font-mono-num">{detail.id}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Tuyến</span><span className="text-navy-900 text-right max-w-[60%]">{detail.route}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Tài xế</span><span className="text-navy-900">{detail.driverName}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Đầu kéo</span><span className="text-navy-900 font-mono-num">{detail.tractorPlate}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Container</span><span className="text-navy-900 font-mono-num">{detail.containerNumber}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Khách hàng</span><span className="text-navy-900">{detail.clientName}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Mô tả</span><span className="text-navy-900">{detail.description}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Doanh thu</span><span className="font-bold text-navy-900 font-mono-num">{formatCurrencyFull(detail.revenue)}</span></div>
            <div className="flex justify-between py-2"><span className="text-gray-500">Trạng thái</span><StatusBadge variant={statusVariant(detail.status)} label={getJobStatusBadge(detail.status).label} /></div>
          </div>
        )}
      </DetailModal>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Tạo chuyến xe mới</DialogTitle><DialogDescription>Nhập thông tin chuyến</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Ngày</Label><Input type="date" /></div>
              <div className="space-y-2"><Label>Loại cont</Label>
                <Select><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent><SelectItem value="20FT">20FT</SelectItem><SelectItem value="40FT">40FT</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Tuyến đường</Label>
              <Select><SelectTrigger><SelectValue placeholder="Chọn tuyến" /></SelectTrigger>
                <SelectContent>{['HP → Hà Nội','HP → Mộc Châu','HP → Sa Pa','HP → Lào Cai','HP → Hạ Long'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Tài xế</Label>
                <Select><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>{['Nguyễn Văn Hùng','Trần Minh Tuấn','Lê Hoàng Nam','Phạm Đức Anh'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>Khách hàng</Label>
                <Select><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                  <SelectContent>{['CT CP Vận tải HP','CT TNHH Mộc Châu','Tập đoàn Lào Cai'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Số container</Label><Input placeholder="VD: MSKU-1234567" /></div>
            <div className="space-y-2"><Label>Mô tả</Label><Input placeholder="Mô tả hàng hoá" /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button className="bg-gold-400 text-navy-950 hover:bg-gold-300">Tạo chuyến</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
