import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard, DetailModal } from '@/components/shared/DataList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockExpenses, formatCurrencyFull, formatCurrencyShort, EXPENSE_CATEGORIES } from '@/data/mockData'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { CircleDollarSign, Check, X } from 'lucide-react'

const expStatusVariant = (s: string): 'success'|'warning'|'danger'|'neutral' =>
  s === 'APPROVED' ? 'success' : s === 'CANCELLED' ? 'danger' : 'warning'
const expStatusLabel = (s: string) =>
  s === 'APPROVED' ? 'Đã duyệt' : s === 'CANCELLED' ? 'Đã huỷ' : 'Chờ duyệt'

export default function AccountantExpensesPage() {
  const isMobile = useIsMobile()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const detail = mockExpenses.find(e => e.id === detailId)

  return (
    <div className="space-y-4">
      <FilterBar searchPlaceholder="Tìm chi phí..." filters={[
        { key: 'category', label: 'Danh mục', options: [{ value: 'all', label: 'Tất cả' }, ...EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))] },
        { key: 'status', label: 'Trạng thái', options: [{ value: 'all', label: 'Tất cả' }, { value: 'DRAFT', label: 'Chờ duyệt' }, { value: 'APPROVED', label: 'Đã duyệt' }, { value: 'CANCELLED', label: 'Đã huỷ' }] },
      ]} onCreateClick={() => setShowCreate(true)} createLabel="Thêm chi phí" />

      {isMobile ? (
        <div className="space-y-2">
          {mockExpenses.map((e) => (
            <MobileListCard key={e.id} onClick={() => setDetailId(e.id)}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-[var(--theme-brand-primary-light)] flex items-center justify-center text-[var(--theme-brand-secondary)]"><CircleDollarSign size={14}/></div>
                  <span className="text-xs font-bold text-[var(--theme-text-primary)]">{e.category}</span>
                </div>
                <StatusBadge variant={expStatusVariant(e.status)} label={expStatusLabel(e.status)} />
              </div>
              <p className="text-[12px] text-[var(--theme-text-primary)]">{e.description}</p>
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="text-[var(--theme-text-muted)]">{e.tractorPlate} · {e.date}</span>
                <span className="font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(e.amount)}</span>
              </div>
              {e.status === 'DRAFT' && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1"><Check size={12}/> Duyệt</Button>
                  <Button size="sm" variant="outline" className="text-red-600 text-xs h-7 gap-1"><X size={12}/> Huỷ</Button>
                </div>
              )}
            </MobileListCard>
          ))}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider border-b border-[var(--theme-border-default)]">
              <th className="px-4 py-2.5 font-semibold">Mã</th><th className="px-4 py-2.5 font-semibold">Danh mục</th>
              <th className="px-4 py-2.5 font-semibold">Mô tả</th><th className="px-4 py-2.5 font-semibold">Xe</th>
              <th className="px-4 py-2.5 font-semibold">Ngày</th><th className="px-4 py-2.5 font-semibold">Trạng thái</th>
              <th className="px-4 py-2.5 font-semibold text-right">Số tiền</th><th className="px-4 py-2.5 font-semibold">Hành động</th>
            </tr></thead>
            <tbody>{mockExpenses.map((e) => (
              <tr key={e.id} className="border-b border-[var(--theme-border-light)] last:border-0 hover:var(--theme-bg-tertiary) cursor-pointer" onClick={() => setDetailId(e.id)}>
                <td className="px-4 py-2.5 font-semibold text-[var(--theme-text-primary)] font-mono-num">{e.id}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-primary)]">{e.category}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)] max-w-[200px] truncate">{e.description}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)] font-mono-num">{e.tractorPlate}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)] font-mono-num">{e.date}</td>
                <td className="px-4 py-2.5"><StatusBadge variant={expStatusVariant(e.status)} label={expStatusLabel(e.status)} /></td>
                <td className="px-4 py-2.5 text-right font-semibold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyShort(e.amount)}</td>
                <td className="px-4 py-2.5" onClick={ev => ev.stopPropagation()}>
                  {e.status === 'DRAFT' && <div className="flex gap-1"><Button size="sm" className="bg-emerald-600 text-white h-7 text-xs gap-1"><Check size={11}/>Duyệt</Button></div>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </GlassCard>
      )}

      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title="Chi tiết chi phí">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Mã</span><span className="font-semibold text-[var(--theme-text-primary)] font-mono-num">{detail.id}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Danh mục</span><span className="text-[var(--theme-text-primary)]">{detail.category}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Mô tả</span><span className="text-[var(--theme-text-primary)]">{detail.description}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Xe</span><span className="text-[var(--theme-text-primary)] font-mono-num">{detail.tractorPlate}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Ngày</span><span className="text-[var(--theme-text-primary)]">{detail.date}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Số tiền</span><span className="font-bold text-[var(--theme-text-primary)] font-mono-num">{formatCurrencyFull(detail.amount)}</span></div>
            <div className="flex justify-between py-2"><span className="text-[var(--theme-text-muted)]">Trạng thái</span><StatusBadge variant={expStatusVariant(detail.status)} label={expStatusLabel(detail.status)} /></div>
          </div>
        )}
      </DetailModal>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Thêm chi phí</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Danh mục</Label>
              <Select><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Mô tả</Label><Input placeholder="Mô tả chi phí" /></div>
            <div className="space-y-2"><Label>Số tiền (VNĐ)</Label><Input type="number" placeholder="0" /></div>
            <div className="space-y-2"><Label>Xe</Label><Input placeholder="Biển số" /></div>
            <div className="space-y-2"><Label>Ngày</Label><Input type="date" /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button className="bg-[var(--theme-brand-secondary)] text-[var(--theme-brand-primary-dark)] hover:bg-gold-300">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
