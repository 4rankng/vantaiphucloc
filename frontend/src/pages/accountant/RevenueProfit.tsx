/**
 * Doanh thu & Lãi — accountant P&L dashboard.
 *
 * Revenue = Σ (TripOrder.unit_price × container_count) over MATCHED TOs.
 * Profit  = Revenue − (lương cơ bản + lương sản lượng + phụ cấp).
 *
 * Pure UI — derivations live in `useRevenueProfit.ts`.
 */

import { TrendingUp, Wallet, Briefcase, DollarSign } from 'lucide-react'
import { formatCurrencyFull } from '@/data/domain'
import { formatDateRange } from '@/lib/format'
import { useRevenueProfit } from './useRevenueProfit'

function KpiCard({
  label,
  value,
  highlight = false,
  positive,
  icon: Icon,
}: {
  label: string
  value: string
  highlight?: boolean
  positive?: boolean
  icon: React.ElementType
}) {
  const tone = highlight
    ? positive === false
      ? 'var(--theme-status-error)'
      : 'var(--theme-brand-primary)'
    : 'var(--theme-text-primary)'
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon
          className="h-4 w-4 shrink-0"
          style={{ color: 'var(--theme-text-muted)' }}
        />
        <p className="typo-caption">{label}</p>
      </div>
      <p
        className="text-lg font-semibold tabular-nums"
        style={{ color: tone }}
      >
        {value}
      </p>
    </div>
  )
}

export function RevenueProfit() {
  const { startDate, endDate, pnl, isLoading } = useRevenueProfit()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-display">Doanh thu & Lãi</h1>
          <p className="typo-body-sm mt-1">
            Kỳ {formatDateRange(startDate, endDate, 'short')}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg animate-pulse"
              style={{ background: 'var(--theme-bg-tertiary)' }}
            />
          ))}
        </div>
      ) : pnl == null ? (
        <div className="card p-10 text-center">
          <DollarSign
            className="w-8 h-8 mx-auto mb-3"
            style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }}
          />
          <p
            className="typo-h3 mb-1"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            Chưa có dữ liệu
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Doanh thu"
              value={formatCurrencyFull(pnl.revenue)}
              icon={TrendingUp}
            />
            <KpiCard
              label="Lương cơ bản"
              value={formatCurrencyFull(pnl.totalBaseSalary)}
              icon={Wallet}
            />
            <KpiCard
              label="Lương sản lượng"
              value={formatCurrencyFull(
                pnl.totalProductivitySalary + pnl.totalAllowance,
              )}
              icon={Briefcase}
            />
            <KpiCard
              label="Lãi"
              value={formatCurrencyFull(pnl.profit)}
              highlight
              positive={pnl.profit >= 0}
              icon={DollarSign}
            />
          </div>

          {/* Detail row */}
          <div className="card p-4">
            <p className="typo-caption mb-3">Chi tiết tính toán</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <DetailItem
                label="Số chuyến đã khớp"
                value={`${pnl.matchedTripCount}`}
              />
              <DetailItem
                label="Lương sản lượng"
                value={formatCurrencyFull(pnl.totalProductivitySalary)}
              />
              <DetailItem
                label="Phụ cấp"
                value={formatCurrencyFull(pnl.totalAllowance)}
              />
              <DetailItem
                label="Tỷ suất lãi/doanh thu"
                value={
                  pnl.revenue > 0
                    ? `${((pnl.profit / pnl.revenue) * 100).toFixed(1)}%`
                    : '—'
                }
                tone={pnl.profit >= 0 ? 'success' : 'error'}
              />
            </div>
          </div>

          {/* Partner breakdown */}
          <section className="space-y-3">
            <h2 className="typo-h2">Doanh thu theo khách hàng</h2>
            {pnl.partnerBreakdown.length === 0 ? (
              <div className="card p-6 text-center">
                <p
                  className="text-sm"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  Chưa có chuyến nào khớp trong kỳ này
                </p>
              </div>
            ) : (
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--theme-border-default)' }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <th
                        className="text-left px-4 py-2.5 text-xs font-semibold"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        Khách hàng
                      </th>
                      <th
                        className="text-right px-4 py-2.5 text-xs font-semibold"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        Số chuyến khớp
                      </th>
                      <th
                        className="text-right px-4 py-2.5 text-xs font-semibold"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        Doanh thu
                      </th>
                      <th
                        className="text-right px-4 py-2.5 text-xs font-semibold"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        % tổng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnl.partnerBreakdown.map((p, i) => {
                      const pct =
                        pnl.revenue > 0
                          ? ((p.revenue / pnl.revenue) * 100).toFixed(1)
                          : '0.0'
                      return (
                        <tr
                          key={p.partnerId}
                          style={{
                            background:
                              i % 2 === 0
                                ? 'var(--theme-bg-primary)'
                                : 'var(--theme-bg-secondary)',
                            borderTop:
                              '1px solid var(--theme-border-light)',
                          }}
                        >
                          <td
                            className="px-4 py-2.5 font-medium"
                            style={{ color: 'var(--theme-text-primary)' }}
                          >
                            {p.partnerName}
                          </td>
                          <td
                            className="px-4 py-2.5 text-right tabular-nums"
                            style={{ color: 'var(--theme-text-primary)' }}
                          >
                            {p.matchedTripCount}
                          </td>
                          <td
                            className="px-4 py-2.5 text-right tabular-nums"
                            style={{ color: 'var(--theme-text-primary)' }}
                          >
                            {formatCurrencyFull(p.revenue)}
                          </td>
                          <td
                            className="px-4 py-2.5 text-right tabular-nums"
                            style={{ color: 'var(--theme-text-muted)' }}
                          >
                            {pct}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function DetailItem({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'success' | 'error' | undefined
}) {
  const color =
    tone === 'success'
      ? 'var(--theme-status-success)'
      : tone === 'error'
        ? 'var(--theme-status-error)'
        : 'var(--theme-text-primary)'
  return (
    <div>
      <p className="typo-caption">{label}</p>
      <p
        className="text-sm font-semibold tabular-nums mt-0.5"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  )
}
