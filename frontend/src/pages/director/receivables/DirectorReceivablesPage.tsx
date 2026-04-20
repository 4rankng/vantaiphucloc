import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard } from '@/components/shared/DataList'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockClients, formatCurrencyFull, formatCurrencyShort } from '@/data/mockData'
import { StatCard } from '@/components/shared/StatCard'
import { AlertTriangle, DollarSign, Clock } from 'lucide-react'

const agingBuckets = [
  { label: 'Dưới 30 ngày', min: 0, max: 30 },
  { label: '30–60 ngày', min: 30, max: 60 },
  { label: '60–90 ngày', min: 60, max: 90 },
  { label: 'Trên 90 ngày', min: 90, max: Infinity },
]

export default function DirectorReceivablesPage() {
  const isMobile = useIsMobile()
  const debtors = mockClients.filter(c => c.outstandingDebt > 0).sort((a, b) => b.outstandingDebt - a.outstandingDebt)
  const totalDebt = debtors.reduce((s, c) => s + c.outstandingDebt, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={<DollarSign size={18}/>} label="Tổng công nợ" value={formatCurrencyShort(totalDebt)} variant="danger" />
        <StatCard icon={<Clock size={18}/>} label="Số khách nợ" value={debtors.length} variant="warning" />
        <div className="col-span-2 lg:col-span-1"><StatCard icon={<AlertTriangle size={18}/>} label="Quá hạn" value={formatCurrencyShort(96000000)} variant="danger" /></div>
      </div>

      <FilterBar searchPlaceholder="Tìm khách hàng..." />

      {isMobile ? (
        <div className="space-y-2">
          {debtors.map((c) => (
            <MobileListCard key={c.id}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-navy-900 truncate max-w-[70%]">{c.name}</p>
                <span className="text-sm font-bold text-red-600 font-mono-num">{formatCurrencyShort(c.outstandingDebt)}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span>{c.contactPerson || ''}</span>
                <span>· {c.phone}</span>
              </div>
              {/* Aging bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" style={{ width: `${Math.min(100, (c.outstandingDebt / totalDebt) * 200)}%` }} />
              </div>
            </MobileListCard>
          ))}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-navy-100">
              <th className="px-4 py-2.5 font-semibold">Khách hàng</th><th className="px-4 py-2.5 font-semibold">Người liên hệ</th>
              <th className="px-4 py-2.5 font-semibold">Điện thoại</th><th className="px-4 py-2.5 font-semibold text-right">Công nợ</th>
              <th className="px-4 py-2.5 font-semibold text-right">Tỷ lệ</th>
            </tr></thead>
            <tbody>{debtors.map((c) => (
              <tr key={c.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/30">
                <td className="px-4 py-2.5 font-semibold text-navy-900">{c.name}</td>
                <td className="px-4 py-2.5 text-gray-500">{c.contactPerson || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 font-mono-num">{c.phone}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-red-600 font-mono-num">{formatCurrencyFull(c.outstandingDebt)}</td>
                <td className="px-4 py-2.5 text-right text-gray-400 font-mono-num">{((c.outstandingDebt / totalDebt) * 100).toFixed(1)}%</td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="border-t-2 border-navy-200 bg-navy-50/30">
              <td colSpan={3} className="px-4 py-3 font-bold text-navy-900">Tổng cộng</td>
              <td className="px-4 py-3 text-right font-bold text-red-600 font-mono-num">{formatCurrencyFull(totalDebt)}</td>
              <td className="px-4 py-3 text-right font-bold text-navy-900 font-mono-num">100%</td>
            </tr></tfoot>
          </table>
        </GlassCard>
      )}

      {/* Aging Summary */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-navy-900 font-display mb-3">Phân loại theo thời gian</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {agingBuckets.map((b) => (
            <div key={b.label} className="p-3 rounded-lg bg-navy-50/50 border border-navy-100">
              <p className="text-[11px] text-gray-400 font-medium">{b.label}</p>
              <p className="text-lg font-bold text-navy-900 font-mono-num mt-1">{formatCurrencyShort(Math.random() * 80000000 + 10000000)}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
