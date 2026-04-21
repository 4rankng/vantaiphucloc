import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard, DetailModal } from '@/components/shared/DataList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockClients, formatCurrencyShort } from '@/data/mockData'
import { Building2, User, Phone } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export default function DispatcherClientsPage() {
  const isMobile = useIsMobile()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const detail = mockClients.find(c => c.id === detailId)

  return (
    <div className="space-y-4">
      <FilterBar searchPlaceholder="Tìm khách hàng..." onCreateClick={() => setShowCreate(true)} createLabel="Thêm khách" />
      {isMobile ? (
        <div className="space-y-2">
          {mockClients.map((c) => (
            <MobileListCard key={c.id} onClick={() => setDetailId(c.id)}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded text-[var(--theme-bg-tertiary)] flex items-center justify-center text-[var(--theme-text-secondary)]">
                  {c.type === 'company' ? <Building2 size={14}/> : <User size={14}/>}
                </div>
                <span className="text-sm font-semibold text-[var(--theme-text-primary)] truncate">{c.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--theme-text-muted)] ml-9">
                <Phone size={11}/> <span>{c.phone}</span>
                {c.outstandingDebt > 0 && <span className="text-red-600 font-semibold ml-auto">{formatCurrencyShort(c.outstandingDebt)}</span>}
              </div>
            </MobileListCard>
          ))}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider border-b border-[var(--theme-border-default)]">
              <th className="px-4 py-2.5 font-semibold">Tên</th><th className="px-4 py-2.5 font-semibold">Loại</th>
              <th className="px-4 py-2.5 font-semibold">Điện thoại</th><th className="px-4 py-2.5 font-semibold">Liên hệ</th>
              <th className="px-4 py-2.5 font-semibold text-right">Công nợ</th>
            </tr></thead>
            <tbody>{mockClients.map((c) => (
              <tr key={c.id} className="border-b border-[var(--theme-border-light)] last:border-0 hover:var(--theme-bg-tertiary) cursor-pointer" onClick={() => setDetailId(c.id)}>
                <td className="px-4 py-2.5 font-semibold text-[var(--theme-text-primary)]">{c.name}</td>
                <td className="px-4 py-2.5"><StatusBadge variant={c.type === 'company' ? 'info' : 'neutral'} label={c.type === 'company' ? 'DN' : 'Cá nhân'} /></td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)] font-mono-num">{c.phone}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)]">{c.contactPerson || '—'}</td>
                <td className="px-4 py-2.5 text-right font-semibold font-mono-num">{c.outstandingDebt > 0 ? <span className="text-red-600">{formatCurrencyShort(c.outstandingDebt)}</span> : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </GlassCard>
      )}
      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title="Chi tiết khách hàng">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Tên</span><span className="font-semibold text-[var(--theme-text-primary)]">{detail.name}</span></div>
            <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Loại</span><StatusBadge variant={detail.type === 'company' ? 'info' : 'neutral'} label={detail.type === 'company' ? 'Doanh nghiệp' : 'Cá nhân'} /></div>
            {detail.address && <div className="flex justify-between py-2 border-b border-[var(--theme-border-default)]"><span className="text-[var(--theme-text-muted)]">Địa chỉ</span><span className="text-[var(--theme-text-primary)] text-right max-w-[60%]">{detail.address}</span></div>}
            <div className="flex justify-between py-2"><span className="text-[var(--theme-text-muted)]">Điện thoại</span><span className="text-[var(--theme-text-primary)] font-mono-num">{detail.phone}</span></div>
          </div>
        )}
      </DetailModal>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Thêm khách hàng</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Tên</Label><Input placeholder="Tên khách hàng" /></div>
            <div className="space-y-2"><Label>Điện thoại</Label><Input placeholder="Số điện thoại" /></div>
            <div className="space-y-2"><Label>Địa chỉ</Label><Input placeholder="Địa chỉ" /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button className="bg-[var(--theme-brand-secondary)] text-[var(--theme-brand-primary-dark)] hover:bg-gold-300">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
