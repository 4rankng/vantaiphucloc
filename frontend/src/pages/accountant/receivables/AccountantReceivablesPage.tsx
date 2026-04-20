import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard } from '@/components/shared/DataList'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatCard } from '@/components/shared/StatCard'
import { mockClients, mockLedger, formatCurrencyFull, formatCurrencyShort } from '@/data/mockData'
import { DollarSign, AlertTriangle, TrendingDown, ArrowUpRight } from 'lucide-react'

const typeVariant = (t: string): 'info'|'success'|'warning' =>
  t === 'INVOICE' ? 'info' : t === 'PAYMENT_RECEIVED' ? 'success' : 'warning'
const typeLabel = (t: string) =>
  t === 'INVOICE' ? 'Phát hành HĐ' : t === 'PAYMENT_RECEIVED' ? 'Thu tiền' : 'Trả đối tác'

export default function AccountantReceivablesPage() {
  const isMobile = useIsMobile()
  const debtors = mockClients.filter(c => c.outstandingDebt > 0).sort((a, b) => b.outstandingDebt - a.outstandingDebt)
  const totalDebt = debtors.reduce((s, c) => s + c.outstandingDebt, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={<DollarSign size={18}/>} label="Tổng công nợ" value={formatCurrencyShort(totalDebt)} variant="danger" />
        <StatCard icon={<AlertTriangle size={18}/>} label="Quá hạn" value={formatCurrencyShort(96000000)} variant="danger" />
        <div className="col-span-2 lg:col-span-1"><StatCard icon={<ArrowUpRight size={18}/>} label="Số khách nợ" value={debtors.length} variant="warning" /></div>
      </div>

      <FilterBar searchPlaceholder="Tìm khách hàng..." />

      {/* AR by customer */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-navy-900 font-display mb-3">Công nợ theo khách hàng</h3>
        {isMobile ? (
          <div className="space-y-2">
            {debtors.map((c) => (
              <MobileListCard key={c.id}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-navy-900 truncate max-w-[70%]">{c.name}</p>
                  <span className="text-sm font-bold text-red-600 font-mono-num">{formatCurrencyShort(c.outstandingDebt)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, (c.outstandingDebt / totalDebt) * 200)}%` }} />
                </div>
              </MobileListCard>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-navy-100">
              <th className="px-4 py-2.5 font-semibold">Khách hàng</th><th className="px-4 py-2.5 font-semibold text-right">Công nợ</th><th className="px-4 py-2.5 font-semibold text-right">Tỷ lệ</th>
            </tr></thead>
            <tbody>{debtors.map((c) => (
              <tr key={c.id} className="border-b border-navy-50 last:border-0">
                <td className="px-4 py-2.5 font-semibold text-navy-900">{c.name}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-red-600 font-mono-num">{formatCurrencyFull(c.outstandingDebt)}</td>
                <td className="px-4 py-2.5 text-right text-gray-400 font-mono-num">{((c.outstandingDebt / totalDebt) * 100).toFixed(1)}%</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </GlassCard>

      {/* Ledger */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-navy-900 font-display mb-3">Sổ cái gần đây</h3>
        <div className="space-y-2">
          {mockLedger.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-navy-100/50">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-navy-100 text-navy-700">{typeLabel(l.type)}</span>
                  <span className="text-xs text-gray-400 font-mono-num">{l.date}</span>
                </div>
                <p className="text-[12px] text-navy-900">{l.clientName} — {l.notes}</p>
              </div>
              <div className="text-right">
                {l.debit > 0 && <p className="text-sm font-semibold text-red-600 font-mono-num">+{formatCurrencyShort(l.debit)}</p>}
                {l.credit > 0 && <p className="text-sm font-semibold text-emerald-600 font-mono-num">-{formatCurrencyShort(l.credit)}</p>}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
