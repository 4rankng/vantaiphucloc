import { useState } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockPeriodCloses, formatCurrencyFull, formatCurrencyShort } from '@/data/mockData'
import { BookOpen, Lock, Unlock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DialogClose } from '@/components/ui/dialog'

export default function AccountantPeriodClosePage() {
  const [showClose, setShowClose] = useState(false)
  const openPeriod = mockPeriodCloses.find(p => p.status === 'open')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<BookOpen size={18}/>} label="Tháng hiện tại" value={openPeriod?.month || '—'} />
        <StatCard icon={<CheckCircle size={18}/>} label="Chuyến trong tháng" value={openPeriod?.jobCount || 0} />
        <StatCard icon={<Unlock size={18}/>} label="Doanh thu" value={formatCurrencyShort(openPeriod?.totalRevenue || 0)} variant="gold" />
        <StatCard icon={<Lock size={18}/>} label="Lợi nhuận" value={formatCurrencyShort(openPeriod?.profit || 0)} variant="success" />
      </div>

      {/* Current period */}
      {openPeriod && (
        <GlassCard className="p-5 border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-navy-900 font-display">Kỳ đang mở: {openPeriod.month}</h3>
              <p className="text-[11px] text-gray-400 mt-1">{openPeriod.jobCount} chuyến · Chưa chốt</p>
            </div>
            <Button onClick={() => setShowClose(true)} className="bg-gold-400 text-navy-950 hover:bg-gold-300 font-semibold gap-2">
              <Lock size={14}/> Chốt sổ
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <p className="text-[11px] text-gray-500">Doanh thu</p>
              <p className="text-lg font-bold text-emerald-700 font-mono-num">{formatCurrencyShort(openPeriod.totalRevenue)}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50/50 border border-red-100">
              <p className="text-[11px] text-gray-500">Chi phí</p>
              <p className="text-lg font-bold text-red-600 font-mono-num">{formatCurrencyShort(openPeriod.totalExpense)}</p>
            </div>
            <div className="p-3 rounded-lg bg-navy-50/50 border border-navy-100">
              <p className="text-[11px] text-gray-500">Lợi nhuận</p>
              <p className="text-lg font-bold text-navy-900 font-mono-num">{formatCurrencyShort(openPeriod.profit)}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Closed periods */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-navy-900 font-display mb-4">Lịch sử chốt sổ</h3>
        <div className="space-y-3">
          {mockPeriodCloses.filter(p => p.status === 'closed').map((pc) => (
            <div key={pc.id} className="p-4 rounded-xl border border-navy-100/50 hover:bg-navy-50/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-navy-900 font-mono-num">{pc.month}</span>
                  <StatusBadge variant="success" label="Đã chốt" />
                </div>
                <span className="text-[11px] text-gray-400">{pc.closedBy} · {pc.closedAt}</span>
              </div>
              <div className="grid grid-cols-4 gap-3 mt-3 text-[11px]">
                <div><span className="text-gray-400">Chuyến:</span> <span className="font-semibold text-navy-900">{pc.jobCount}</span></div>
                <div><span className="text-gray-400">DT:</span> <span className="font-semibold text-emerald-600 font-mono-num">{formatCurrencyShort(pc.totalRevenue)}</span></div>
                <div><span className="text-gray-400">CP:</span> <span className="font-semibold text-red-600 font-mono-num">{formatCurrencyShort(pc.totalExpense)}</span></div>
                <div><span className="text-gray-400">LN:</span> <span className="font-semibold text-navy-900 font-mono-num">{formatCurrencyShort(pc.profit)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Close Dialog */}
      <Dialog open={showClose} onOpenChange={setShowClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Chốt sổ {openPeriod?.month}</DialogTitle>
            <DialogDescription>Xác nhận chốt sổ tháng? Sau khi chốt sẽ không thể chỉnh sửa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Doanh thu</span><span className="font-semibold text-emerald-600 font-mono-num">{openPeriod && formatCurrencyFull(openPeriod.totalRevenue)}</span></div>
            <div className="flex justify-between py-2 border-b border-navy-100"><span className="text-gray-500">Chi phí</span><span className="font-semibold text-red-600 font-mono-num">{openPeriod && formatCurrencyFull(openPeriod.totalExpense)}</span></div>
            <div className="flex justify-between py-2"><span className="text-gray-500">Lợi nhuận</span><span className="font-bold text-navy-900 font-mono-num">{openPeriod && formatCurrencyFull(openPeriod.profit)}</span></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose>
            <Button className="bg-gold-400 text-navy-950 hover:bg-gold-300 font-semibold gap-2"><Lock size={14}/> Xác nhận chốt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
