import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, DetailModal } from '@/components/shared/DataList'
import { TripCard } from '@/components/modules/TripCard'
import { TripTable } from '@/components/modules/TripTable'
import { TripDetail } from '@/components/modules/TripDetail'
import { mockJobs } from '@/data/mockData'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'

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
          {mockJobs.map(j => (
            <TripCard key={j.id} data={j as any} onClick={() => setDetailId(j.id)} showActions />
          ))}
        </div>
      ) : (
        <TripTable data={mockJobs as any} onRowClick={setDetailId} showActions />
      )}
      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title={`Chuyến ${detailId || ''}`}>
        {detail && <TripDetail data={detail as any} />}
      </DetailModal>

      {/* Create form */}
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
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button variant="gold">Tạo chuyến</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
