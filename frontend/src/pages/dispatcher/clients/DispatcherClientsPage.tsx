import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard, DetailModal } from '@/components/shared/DataList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockClients, formatCurrencyShort } from '@/data/mockData'
import { Building2, User, Phone } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
                <div className="w-7 h-7 rounded bg-navy-100 flex items-center justify-center text-navy-600">
                  {c.type === 'company' ? <Building2 size={14}/> : <User size={14}/>}
                </div>
                <span className="text-sm font-semibold text-navy-900 truncate">{c.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 ml-9">
                <Phone size={11}/> <span>{c.phone}</span>
                {c.outstandingDebt > 0 && <span className="text-red-600 font-semibold ml-auto">{formatCurrencyShort(c.outstandingDebt)}</span>}
              </div>
            </MobileListCard>
          ))}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-navy-100">
              <th className="px-4 py-2.5 font-semibold">Tên</th><th className="px-4 py-2.5 font-semibold">Loại</th>
              <th className="px-4 py-2.5 font-semibold">Điện thoại</th><th className="px-4 py-2.5 font-semibold">Liên hệ</th>
              <th className="px-4 py-2.5 font-semibold text-right">Công nợ</th>
            </tr></thead>
            <tbody>{mockClients.map((c) => (
              <tr key={c.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30 cursor-pointer" onClick={() => setDetailId(c.id)}>
                <td className="px-4 py-2.5 font-semibold text-navy-900">{c.name}</td>
                <td className="px-4 py-2.5"><StatusBadge variant={c.type === 'company' ? 'info' : 'neutral'} label={c.type === 'company' ? 'DN' : 'Cá nhân'} /></td>
                <td className="px-4 py-2.5 text-gray-500 font-mono-num">{c.phone}</td>
                <td className="px-4 py-2.5 text-gray-500">{c.contactPerson || '—'}</td>
                <td className="px-4 py-2.5 text-right font-semibold font-mono-num">{c.outstandingDebt > 0 ? <span className="text-red-600">{formatCurrencyShort(c.outstandingDebt)}</span> : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </GlassCard>
      )}
      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title="Chi tiết khách hàng">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Tên</span><span className="font-semibold text-navy-900">{detail.name}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Loại</span><StatusBadge variant={detail.type === 'company' ? 'info' : 'neutral'} label={detail.type === 'company' ? 'Doanh nghiệp' : 'Cá nhân'} /></div>
            {detail.address && <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Địa chỉ</span><span className="text-navy-900 text-right max-w-[60%]">{detail.address}</span></div>}
            <div className="flex justify-between py-2"><span className="text-gray-500">Điện thoại</span><span className="text-navy-900 font-mono-num">{detail.phone}</span></div>
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
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button className="bg-gold-400 text-navy-950 hover:bg-gold-300">Thêm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
