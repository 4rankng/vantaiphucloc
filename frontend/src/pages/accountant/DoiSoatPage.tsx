import { useState, useMemo } from 'react'
import { ClipboardList, Search } from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { StatBreakdownCard } from '@/components/shared/StatBreakdownCard'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DashboardCard } from '@/components/shared/DashboardCard/DashboardCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useMonthParams } from './use-month-params'
import { useBookedTrips } from '@/hooks/use-queries'
import { formatCurrency, getBookedTripStatusBadge } from '@/data/domain'
import { fuzzyMatch } from '@/lib/search-utils'
import type { BookedTrip } from '@/data/domain'

function tripRevenue(t: BookedTrip): number {
  return (t.unitPrice ?? 0) * Math.max(1, t.containers.length)
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  if (!d) return dateStr
  return `${d}/${m}`
}

export function DoiSoatPage() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const [search, setSearch] = useState('')

  const { data: trips = [], isLoading } = useBookedTrips({ dateFrom, dateTo, pageSize: 500 })

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return trips
    return trips.filter(t =>
      fuzzyMatch(t.client?.name ?? '', q) ||
      fuzzyMatch(t.pickupLocation?.name ?? '', q) ||
      fuzzyMatch(t.dropoffLocation?.name ?? '', q) ||
      fuzzyMatch(t.code ?? '', q) ||
      (t.containers ?? []).some(c => fuzzyMatch(c.containerNumber, q)),
    )
  }, [trips, search])

  const matchedCount = trips.filter(t => t.status === 'MATCHED').length
  const pendingCount = trips.filter(t => t.status === 'PENDING').length
  const totalRevenue = trips.reduce((sum, t) => sum + tripRevenue(t), 0)

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-display" style={{ color: 'var(--theme-text-primary)' }}>Đối soát</h1>
          <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            Danh sách chuyến đã đi theo tháng
          </p>
        </div>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:max-w-[540px]">
        <StatBreakdownCard
          label="Tổng chuyến"
          total={trips.length}
          items={[
            { label: 'Đã khớp', value: matchedCount },
            { label: 'Chờ ghép', value: pendingCount },
          ]}
        />
      </div>

      {/* ── Trip table ── */}
      <DashboardCard>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader
            title="Chuyến đã đi"
            icon={ClipboardList}
            right={
              <div className="flex items-center gap-3">
                {filtered.length !== trips.length && (
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {filtered.length}/{trips.length}
                  </span>
                )}
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                    style={{ color: 'var(--theme-text-muted)' }}
                  />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm chủ hàng, tuyến, cont..."
                    className="search-pill h-8 w-56"
                  />
                </div>
              </div>
            }
          />
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title={search.trim() ? 'Không tìm thấy chuyến' : 'Chưa có chuyến nào trong tháng này'}
            compact
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full [&_td]:align-middle" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)', width: 56 }}>Ngày</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Chủ hàng</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tuyến</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)', width: 52 }}>Cont</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)', width: 120 }}>Doanh thu</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)', width: 100 }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const badge = getBookedTripStatusBadge(t.status)
                  const rev = tripRevenue(t)
                  return (
                    <tr
                      key={t.id}
                      className="transition-colors"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <td className="px-3 py-2.5 tabular-nums text-[13px] font-medium whitespace-nowrap" style={{ color: 'var(--theme-text-secondary)' }}>
                        {formatDate(t.tripDate)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                          {t.client?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 max-w-[240px]">
                        <span className="text-[13px] truncate block" style={{ color: 'var(--theme-text-secondary)' }}>
                          {t.pickupLocation?.name ?? '—'} → {t.dropoffLocation?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                          {t.containers.length}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[13px] font-bold whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
                        {rev > 0 ? formatCurrency(rev) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <StatusBadge variant={badge.variant} label={badge.label} size="sm" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </div>
  )
}
