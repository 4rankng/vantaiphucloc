import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, DetailModal } from '@/components/shared/DataList'
import { StatCard } from '@/components/shared/StatCard'
import { VehicleCard } from '@/components/modules/VehicleCard'
import { VehicleTable } from '@/components/modules/VehicleTable'
import { VehicleDetail } from '@/components/modules/VehicleDetail'
import { mockTractors, mockTrailers } from '@/data/mockData'
import { Truck, CircleDot, Wrench } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'

export default function FleetPage() {
  const isMobile = useIsMobile()
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const detailVehicle = mockTractors.find(t => t.id === detailId)
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
          <h4 className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Đầu kéo</h4>
          {mockTractors.map(t => (
            <VehicleCard key={t.id} data={t as any} onClick={() => setDetailId(t.id)} />
          ))}
          <h4 className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider pt-2">Rơ mooc</h4>
          {mockTrailers.map(t => (
            <VehicleCard key={t.id} data={t as any} isTrailer />
          ))}
        </div>
      ) : (
        <VehicleTable tractors={mockTractors as any} trailers={mockTrailers as any} onRowClick={setDetailId} />
      )}

      <DetailModal open={!!detailId} onOpenChange={() => setDetailId(null)} title="Chi tiết xe">
        {detailVehicle && <VehicleDetail data={detailVehicle as any} />}
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
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button variant="gold">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
