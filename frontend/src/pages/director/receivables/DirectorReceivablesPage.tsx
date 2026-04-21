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
        <StatCard icon={<Clock size={18}/>} label="Số khách nợ" value={`${debtors.length}`} variant="warning" />
        <div className="col-span-2 lg:col-span-1"><StatCard icon={<AlertTriangle size={18}/>} label="Quá hạn" value={formatCurrencyShort(96000000)} variant="danger" /></div>
      </div>

      <FilterBar searchPlaceholder="Tìm khách hàng..." />

      {isMobile ? (
        <div className="space-y-2">
          {debtors.map((c) => (
            <MobileListCard key={c.id}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[var(--theme-text-primary)] truncate max-w-[70%]">{c.name}</p>
                <span className="text-sm font-bold text-red-600 font-mono-num">{formatCurrencyShort(c.outstandingDebt)}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[var(--theme-text-muted)]">
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
            <thead><tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider border-b border-[var(--theme-border-default)]">
              <th className="px-4 py-2.5 font-semibold">Khách hàng</th><th className="px-4 py-2.5 font-semibold">Người liên hệ</th>
              <th className="px-4 py-2.5 font-semibold">Điện thoại</th><th className="px-4 py-2.5 font-semibold text-right">Công nợ</th>
              <th className="px-4 py-2.5 font-semibold text-right">Tỷ lệ</th>
            </tr></thead>
            <tbody>{debtors.map((c) => (
              <tr key={c.id} className="border-b border-[var(--theme-border-light)] last:border-0 hover:var(--theme-bg-tertiary)">
                <td className="px-4 py-2.5 font-semibold text-[var(--theme-text-primary)]">{c.name}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)]">{c.contactPerson || '—'}</td>
                <td className="px-4 py-2.5 text-[var(--theme-text-muted)] font-mono-num">{c.phone}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-red-600 font-mono-num">{formatCurrencyFull(c.outstandingDebt)}</td>
                <td className="px-4 py-2.5 text-right text-[var(--theme-text-muted)] font-mono-num">{((c.outstandingDebt / totalDebt) * 100).toFixed(1)}%</td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="border-t-2 border-[var(--theme-border-default)] var(--theme-bg-tertiary)">
              <td colSpan={3} className="px-4 py-3 font-bold text-[var(--theme-text-primary)]">Tổng cộng</td>
              <td className="px-4 py-3 text-right font-bold text-red-600 font-mono-num">{formatCurrencyFull(totalDebt)}</td>
              <td className="px-4 py-3 text-right font-bold text-[var(--theme-text-primary)] font-mono-num">100%</td>
            </tr></tfoot>
          </table>
        </GlassCard>
      )}

      {/* Aging Summary */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-display mb-3">Phân loại theo thời gian</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {agingBuckets.map((b) => (
            <div key={b.label} className="p-3 rounded-lg text-[var(--theme-bg-tertiary)]/50 border border-[var(--theme-border-default)]">
              <p className="text-[11px] text-[var(--theme-text-muted)] font-medium">{b.label}</p>
              <p className="text-lg font-bold text-[var(--theme-text-primary)] font-mono-num mt-1">{formatCurrencyShort(Math.random() * 80000000 + 10000000)}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
