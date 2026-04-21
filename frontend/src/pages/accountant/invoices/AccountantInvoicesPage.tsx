import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard, DetailModal } from '@/components/shared/DataList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockInvoices, formatCurrencyFull, formatCurrencyShort } from '@/data/mockData'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
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
                  <div className="w-7 h-7 rounded text-[var(--theme-bg-tertiary)] flex items-center justify-center text-[var(--theme-text-secondary)]"><FileText size={14}/></div>
                  <span className="text-xs font-bold text-[var(--theme-text-primary)] font-mono-num">{inv.id}</span>
                </div>
                <StatusBadge variant={invStatusVariant(inv.status)} label={invStatusLabel(inv.status)} />
              </div>
              <p className="text-[12px] text-[var(--theme-text-primary)] font-medium">{inv.clientName}</p>
              <p className="text-[11px] text-[var(--theme-text-muted)]">{inv.category} · {inv.issueDate}</p>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] text-[var(--theme-text-muted)]">Hạn: {inv.dueDate}</span>
                <span className="text-sm font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(inv.amount)}</span>
              </div>
            </MobileListCard>
          ))}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider border-b border-[var(--theme-border-default)]">
              <th className="px-4 py-2.5 font-semibold">Mã</th><th className="px-4 py-2.5 font-semibold">Khách hàng</th>
              <th className="px-4 py-2.5 font-semibold">Loại</th><th className="px-4 py-2.5 font-semibold">Ngày PH</th>
              <th className="px-4 py-2.5 font-semibold">Hạn TT</th><th className="px-4 py-2.5 font-semibold">Trạng thái</th>
              <th className="px-4 py-2.5 font-semibold text-right">Số tiền</th>
            </tr></thead>
            <tbody>{mockInvoices.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--theme-border-light)] last:border-0 hover:var(--theme-bg-tertiary) cursor-pointer" onClick={() => setDetailId(inv.id)}>
                <td className="px-4 py-2.5 font-semibold text-[var(--theme-text-primary)] font-mono-num">{inv.id}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-primary)]">{inv.clientName}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)]">{inv.category}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)] font-mono-num">{inv.issueDate}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)] font-mono-num">{inv.dueDate}</td>
                <td className="px-4 py-2.5"><StatusBadge variant={invStatusVariant(inv.status)} label={invStatusLabel(inv.status)} /></td>
                <td className="px-4 py-2.5 text-right font-semibold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(inv.amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        </GlassCard>
      )}

      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title="Chi tiết hóa đơn">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Mã</span><span className="font-semibold text-[var(--theme-text-primary)] font-mono-num">{detail.id}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Khách hàng</span><span className="text-[var(--theme-text-primary)]">{detail.clientName}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Loại</span><span className="text-[var(--theme-text-primary)]">{detail.category}</span></div>
            {detail.route && <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Tuyến</span><span className="text-[var(--theme-text-primary)] text-right max-w-[60%]">{detail.route}</span></div>}
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Ngày PH</span><span className="text-[var(--theme-text-primary)]">{detail.issueDate}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Hạn TT</span><span className="text-[var(--theme-text-primary)]">{detail.dueDate}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Số tiền</span><span className="font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyFull(detail.amount)}</span></div>
            <div className="flex justify-between py-2"><span className="text-[var(--theme-text-muted)]">Trạng thái</span><StatusBadge variant={invStatusVariant(detail.status)} label={invStatusLabel(detail.status)} /></div>
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
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button className="bg-[var(--theme-brand-secondary)] text-[var(--theme-brand-primary-dark)] hover:bg-gold-300">Tạo</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
