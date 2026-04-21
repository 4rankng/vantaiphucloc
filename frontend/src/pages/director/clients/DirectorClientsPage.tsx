import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, DetailModal } from '@/components/shared/DataList'
import { ClientCard, ClientTable } from '@/components/modules/ClientCard'
import { ClientDetail } from '@/components/modules/ClientDetail'
import { mockClients } from '@/data/mockData'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'

export default function DirectorClientsPage() {
  const isMobile = useIsMobile()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const detail = mockClients.find(c => c.id === detailId)

  return (
    <div className="space-y-4">
      <FilterBar searchPlaceholder="Tìm khách hàng..." onCreateClick={() => setShowCreate(true)} createLabel="Thêm khách" />
      {isMobile ? (
        <div className="space-y-2">
          {mockClients.map(c => (
            <ClientCard key={c.id} data={c as any} onClick={() => setDetailId(c.id)} />
          ))}
        </div>
      ) : (
        <ClientTable data={mockClients as any} onRowClick={setDetailId} />
      )}
      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title="Chi tiết khách hàng">
        {detail && <ClientDetail data={detail as any} />}
      </DetailModal>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Thêm khách hàng</DialogTitle><DialogDescription>Nhập thông tin khách hàng mới</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Tên</Label><Input placeholder="Tên khách hàng" /></div>
            <div className="space-y-2"><Label>Loại</Label>
              <Select><SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                <SelectContent><SelectItem value="company">Doanh nghiệp</SelectItem><SelectItem value="individual">Cá nhân</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Điện thoại</Label><Input placeholder="Số điện thoại" /></div>
            <div className="space-y-2"><Label>Mã số thuế</Label><Input placeholder="Nếu có" /></div>
            <div className="space-y-2"><Label>Địa chỉ</Label><Input placeholder="Địa chỉ" /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button variant="gold">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
