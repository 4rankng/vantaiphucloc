import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard, DetailModal } from '@/components/shared/DataList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockInvoices, formatCurrencyFull, formatCurrencyShort } from '@/data/mockData'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { FileText } from 'lucide-react'

const invStatusVariant = (s: string): 'success'|'warning'|'danger'|'info'|'neutral' =>
  s === 'PAID' ? 'success' : s === 'ISSUED' ? 'info' : s === 'OVERDUE' ? 'danger' : s === 'CANCELLED' ? 'danger' : 'neutral'
const invStatusLabel = (s: string) =>
  s === 'PAID' ? 'Đã thu' : s === 'ISSUED' ? 'Đã phát hành' : s === 'OVERDUE' ? 'Quá hạn' : s === 'DRAFT' ? 'Nháp' : 'Huỷ'

export default function AccountantInvoicesPage() {
  const isMobile = useIsMobile()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const detail = mockInvoices.find(i => i.id === detailId)

  return (
    <div className="space-y-4">
      <FilterBar searchPlaceholder="Tìm hóa đơn..." filters={[
        { key: 'status', label: 'Trạng thái', options: [{ value: 'all', label: 'Tất cả' }, { value: 'PAID', label: 'Đã thu' }, { value: 'ISSUED', label: 'Đã PH' }, { value: 'OVERDUE', label: 'Quá hạn' }] },
      ]} onCreateClick={() => setShowCreate(true)} createLabel="Tạo HĐ" />

      {isMobile ? (
        <div className="space-y-2">
          {mockInvoices.map((inv) => (
            <MobileListCard key={inv.id} onClick={() => setDetailId(inv.id)}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-navy-100 flex items-center justify-center text-navy-600"><FileText size={14}/></div>
                  <span className="text-xs font-bold text-navy-900 font-mono-num">{inv.id}</span>
                </div>
                <StatusBadge variant={invStatusVariant(inv.status)} label={invStatusLabel(inv.status)} />
              </div>
              <p className="text-[12px] text-navy-900 font-medium">{inv.clientName}</p>
              <p className="text-[11px] text-gray-400">{inv.category} · {inv.issueDate}</p>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] text-gray-400">Hạn: {inv.dueDate}</span>
                <span className="text-sm font-bold text-navy-900 font-mono-num">{formatCurrencyShort(inv.amount)}</span>
              </div>
            </MobileListCard>
          ))}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-navy-100">
              <th className="px-4 py-2.5 font-semibold">Mã</th><th className="px-4 py-2.5 font-semibold">Khách hàng</th>
              <th className="px-4 py-2.5 font-semibold">Loại</th><th className="px-4 py-2.5 font-semibold">Ngày PH</th>
              <th className="px-4 py-2.5 font-semibold">Hạn TT</th><th className="px-4 py-2.5 font-semibold">Trạng thái</th>
              <th className="px-4 py-2.5 font-semibold text-right">Số tiền</th>
            </tr></thead>
            <tbody>{mockInvoices.map((inv) => (
              <tr key={inv.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30 cursor-pointer" onClick={() => setDetailId(inv.id)}>
                <td className="px-4 py-2.5 font-semibold text-navy-900 font-mono-num">{inv.id}</td>
                <td className="px-4 py-2.5 text-navy-900">{inv.clientName}</td>
                <td className="px-4 py-2.5 text-gray-500">{inv.category}</td>
                <td className="px-4 py-2.5 text-gray-500 font-mono-num">{inv.issueDate}</td>
                <td className="px-4 py-2.5 text-gray-500 font-mono-num">{inv.dueDate}</td>
                <td className="px-4 py-2.5"><StatusBadge variant={invStatusVariant(inv.status)} label={invStatusLabel(inv.status)} /></td>
                <td className="px-4 py-2.5 text-right font-semibold text-navy-900 font-mono-num">{formatCurrencyShort(inv.amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        </GlassCard>
      )}

      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title="Chi tiết hóa đơn">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Mã</span><span className="font-semibold text-navy-900 font-mono-num">{detail.id}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Khách hàng</span><span className="text-navy-900">{detail.clientName}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Loại</span><span className="text-navy-900">{detail.category}</span></div>
            {detail.route && <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Tuyến</span><span className="text-navy-900 text-right max-w-[60%]">{detail.route}</span></div>}
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Ngày PH</span><span className="text-navy-900">{detail.issueDate}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Hạn TT</span><span className="text-navy-900">{detail.dueDate}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Số tiền</span><span className="font-bold text-navy-900 font-mono-num">{formatCurrencyFull(detail.amount)}</span></div>
            <div className="flex justify-between py-2"><span className="text-gray-500">Trạng thái</span><StatusBadge variant={invStatusVariant(detail.status)} label={invStatusLabel(detail.status)} /></div>
          </div>
        )}
      </DetailModal>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Tạo hóa đơn</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Khách hàng</Label>
              <Select><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                <SelectContent>{['CT CP Vận tải HP','CT TNHH Mộc Châu','Tập đoàn Lào Cai'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Loại</Label>
              <Select><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                <SelectContent>{['Cước vận chuyển','Phí lưu bãi','Phí lưu vỏ','HĐ vận chuyển'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Số tiền (VNĐ)</Label><Input type="number" placeholder="0" /></div>
            <div className="space-y-2"><Label>Hạn thanh toán</Label><Input type="date" /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button className="bg-gold-400 text-navy-950 hover:bg-gold-300">Tạo</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
