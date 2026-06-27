import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { Activity, TrendingUp, TrendingDown, BarChart3, Truck, Coins } from 'lucide-react'
import { OcrPerformanceChart } from '@/components/shared/data-display/OcrPerformanceChart/OcrPerformanceChart'
import { OcrDriverChart } from '@/components/shared/data-display/OcrDriverChart/OcrDriverChart'
import { TripChartCard } from '@/components/shared/data-display/TripChartCard'
import { KpiHeroCard } from '@/components/shared/data-display/KpiHeroCard'
import { DashboardSectionHeader } from '@/components/shared/data-display/DashboardSectionHeader'
import { MonthNavigator } from '@/components/shared/navigation/MonthNavigator'
import { AnimatedNumber } from '@/components/shared'
import { useInfiniteScroll } from '@/components/shared/data-display/ListUtils'
import { useProfile, useMonthlyPnL } from '@/hooks/use-queries'
import { useDirectorDashboard, useDirectorDashboardDrilldown } from '@/hooks/queries/pnl'
import { useMonthParams } from '@/pages/accountant/use-month-params'
import { formatCurrencyFull as fmt } from '@/data/domain'
import { pad, sumChiPhi } from '@/lib/accounting-utils'
import type { AuditLogEntry } from '@/services/api/audit.api'
import { getAuditLogs } from '@/services/api/audit.api'
import { formatActivityEntry } from '@/lib/activity-utils'
import { CostDonut, type DonutSlice } from './components/CostDonut'
import { NoiBoBarList, NgoaiBarList } from './components/VehicleProfitBars'
import { ActivityItem } from './components/ActivityFeed'
import { DirectorKpiDrilldownSheet, type KpiMetric } from './components/DirectorKpiDrilldownSheet'

// ─── Helpers ────────────────────────────────────────────────────────────────

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Chào buổi sáng'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

const fmtFull = (n: number): string => n.toLocaleString('vi-VN')

// ─── Main Overview Component ──────────────────────────────────────────────────

export function SuperAdminOverview() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const { data: profile } = useProfile()

  // Director Dashboard Stats (KPIs, Trip frequency, Top Routes, Top Drivers, Vehicle PNL breakdown)
  const { data: stats } = useDirectorDashboard(dateFrom, dateTo)
  const { data: drilldown, isFetching: drilldownLoading } = useDirectorDashboardDrilldown(dateFrom, dateTo)
  const [activeMetric, setActiveMetric] = useState<KpiMetric | null>(null)

  // Accountant Dashboard PnL (for Cost structure donut chart)
  const { data: pnl } = useMonthlyPnL(dateFrom, dateTo)

  const total            = stats?.total            ?? 0
  const matched          = stats?.matched          ?? 0
  const pending          = stats?.pending          ?? 0
  const revenue          = stats?.revenue          ?? 0
  const avgRev           = stats?.avgRevenuePerTrip ?? 0
  const totalCost        = stats?.totalCost        ?? 0
  const profit           = stats?.profit           ?? 0
  const buckets          = stats?.buckets          ?? []
  const topRoutes        = stats?.topRoutes        ?? []
  const topDrivers       = stats?.topDrivers       ?? []
  const totalDelta       = stats?.totalDelta       ?? null
  const revenueDelta     = stats?.revenueDelta     ?? null
  const costDelta        = stats?.costDelta        ?? null
  const profitDelta      = stats?.profitDelta      ?? null
  const ownFleetRows     = stats?.ownFleetPnl?.rows ?? []
  const vendorRows       = stats?.vendorPnl?.rows  ?? []
  const ownFleetProfit   = stats?.ownFleetPnl?.totalProfit ?? 0
  const vendorProfit     = stats?.vendorPnl?.totalProfit   ?? 0
  const bienLai          = revenue > 0 ? (profit / revenue) * 100 : null

  // Cost structure logic
  const salaryProd = (pnl?.totalProductivitySalary ?? 0) + (pnl?.totalAllowance ?? 0)
  const salaryBase = pnl?.totalBaseSalary ?? 0
  const vehicleExp = pnl?.totalVehicleExpenses ?? 0
  const generalExp = pnl?.totalCpChung ?? 0
  const totalExpenses = sumChiPhi(pnl)

  const costSlices = useMemo<DonutSlice[]>(() => {
    const realTotal = salaryProd + salaryBase + vehicleExp + generalExp
    if (realTotal <= 0) return []
    return [
      { name: 'Lương chuyến & Phụ cấp', pct: Math.round((salaryProd / realTotal) * 100), color: '#059669' },
      { name: 'Lương cơ bản', pct: Math.round((salaryBase / realTotal) * 100), color: '#34D399' },
      { name: 'Chi phí xe vận hành', pct: Math.round((vehicleExp / realTotal) * 100), color: '#3B82F6' },
      { name: 'Chi phí quản lý chung', pct: Math.round((generalExp / realTotal) * 100), color: '#F59E0B' },
    ].filter(s => s.pct > 0)
  }, [salaryProd, salaryBase, vehicleExp, generalExp])

  // ── Audit Log Activity Feed ──
  const AUDIT_PAGE_SIZE = 12
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditLoading, setAuditLoading] = useState(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    setAuditLogs([])
    setAuditPage(1)
    setAuditTotal(0)
    setAuditLoading(true)
    getAuditLogs({ page: 1, pageSize: AUDIT_PAGE_SIZE, createdAfter: dateFrom }).then(data => {
      if (cancelledRef.current) return
      setAuditLogs(data.items)
      setAuditTotal(data.total)
    }).catch(() => {}).finally(() => {
      if (!cancelledRef.current) setAuditLoading(false)
    })
    return () => { cancelledRef.current = true }
  }, [dateFrom])

  const hasMoreAudit = auditLogs.length < auditTotal

  const loadMoreAudit = useCallback(() => {
    if (auditLoading || !hasMoreAudit) return
    const nextPage = auditPage + 1
    setAuditLoading(true)
    getAuditLogs({ page: nextPage, pageSize: AUDIT_PAGE_SIZE }).then(data => {
      if (cancelledRef.current) return
      setAuditLogs(prev => {
        const merged = [...prev, ...data.items]
        const deduped: AuditLogEntry[] = []
        for (const entry of merged) {
          const last = deduped[deduped.length - 1]
          const prevTxt = last ? formatActivityEntry(last.action, last.tableName) : ''
          const curTxt = formatActivityEntry(entry.action, entry.tableName)
          const prevMs = last ? new Date(last.createdAt).getTime() : 0
          const curMs = new Date(entry.createdAt).getTime()
          if (last && prevTxt === curTxt && Math.abs(curMs - prevMs) < 2000) continue
          deduped.push(entry)
        }
        return deduped
      })
      setAuditPage(nextPage)
      setAuditTotal(data.total)
    }).catch(() => {}).finally(() => {
      if (!cancelledRef.current) setAuditLoading(false)
    })
  }, [auditPage, auditLoading, hasMoreAudit])

  const sentinelRef = useInfiniteScroll(loadMoreAudit)

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Greeting Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="text-left">
          <h1
            className="text-[22px] font-extrabold tracking-tight leading-tight"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {greeting()},{' '}
            <span>{profile?.fullName || 'bạn'}</span>
          </h1>
          <p className="mt-1.5 text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
            Hệ thống ổn định · {total.toLocaleString('vi-VN')} chuyến · {matched.toLocaleString('vi-VN')} đã ghép · {pending.toLocaleString('vi-VN')} chờ xử lý
          </p>
        </div>

        <MonthNavigator
          year={year}
          month={month}
          onPrev={onPrev}
          onNext={onNext}
          periodStart={periodStart}
          periodEnd={periodEnd}
        />
      </header>

      {/* ── KPI cards (Financial & Operations Overview) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiHeroCard
          label={`Tổng chuyến · Tháng ${pad(month)}/${year}`}
          value={total}
          formattedValue={<span>{total.toLocaleString('vi-VN')}</span>}
          icon={Activity}
          color="emerald"
          sublabel={`${pending} chờ ghép · ${matched} đã ghép`}
          trend={totalDelta != null ? { value: `${Math.abs(totalDelta)}%`, positive: totalDelta >= 0 } : undefined}
          onClick={() => setActiveMetric('trips')}
        />
        <KpiHeroCard
          label="Doanh thu"
          value={revenue}
          formattedValue={<AnimatedNumber value={revenue} format="currency" />}
          icon={TrendingUp}
          color="blue"
          sublabel={avgRev > 0 ? `TB ${fmt(avgRev)}/chuyến` : 'Chưa có doanh thu'}
          trend={revenueDelta != null ? { value: `${Math.abs(revenueDelta)}%`, positive: revenueDelta >= 0 } : undefined}
          onClick={() => setActiveMetric('revenue')}
        />
        <KpiHeroCard
          label="Chi phí"
          value={totalCost}
          formattedValue={<AnimatedNumber value={totalCost} format="currency" />}
          icon={TrendingDown}
          color="rose"
          sublabel={revenue > 0 ? `${Math.round((totalCost / revenue) * 100)}% doanh thu` : 'Chưa có dữ liệu'}
          trend={costDelta != null ? { value: `${Math.abs(costDelta)}%`, positive: costDelta <= 0 } : undefined}
          onClick={() => setActiveMetric('cost')}
        />
        <KpiHeroCard
          label="Lợi nhuận"
          value={profit}
          formattedValue={<AnimatedNumber value={profit} format="currency" />}
          icon={Coins}
          color="amber"
          sublabel={bienLai != null ? `Biên lãi ${bienLai.toFixed(1)}%` : 'Chưa có dữ liệu'}
          trend={profitDelta != null ? { value: `${Math.abs(profitDelta)}%`, positive: profitDelta >= 0 } : undefined}
          onClick={() => setActiveMetric('profit')}
        />
      </div>

      <DirectorKpiDrilldownSheet
        open={activeMetric != null}
        metric={activeMetric ?? 'revenue'}
        data={drilldown}
        loading={drilldownLoading}
        onClose={() => setActiveMetric(null)}
      />

      {/* ── Main grid: Trip frequency and Cost structure ── */}
      <div className="bento-grid">
        {/* Frequencies graph */}
        <TripChartCard
          title="Tần suất chuyến đi"
          subtitle={`Tháng ${pad(month)} · ${year}`}
          bars={buckets}
          className="bento-col-12 md:bento-col-8"
        />

        {/* Cost breakdown donut (Accountant widget) */}
        <div className="bento-card bento-col-12 md:bento-col-4 text-left">
          <div className="mb-4">
            <h3 className="type-h3" style={{ color: 'var(--theme-text-primary)' }}>Cơ cấu chi phí</h3>
            <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
              {costSlices.length > 0 ? `Tháng ${pad(month)}/${year} · tổng ${fmt(totalExpenses)}` : 'Chưa có chi phí ghi nhận'}
            </p>
          </div>
          {costSlices.length > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <CostDonut slices={costSlices} total={fmtFull(totalExpenses)} />
              <div className="w-full flex flex-col gap-2.5">
                {costSlices.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0" style={{ background: s.color }} />
                    <span className="flex-1 truncate" style={{ color: 'var(--theme-text-secondary)' }}>{s.name}</span>
                    <span className="font-mono font-bold text-[11px] tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center py-6">
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có chi phí ghi nhận trong tháng.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Vehicle profit breakdown lists ── */}
      <div className="bento-grid">
        {/* Internal fleet */}
        <div className="bento-card bento-col-12 lg:bento-col-6 text-left">
          <DashboardSectionHeader
            title="Xe nội bộ"
            icon={Truck}
            className="pb-3"
            right={
              <div className="flex items-center gap-2">
                {ownFleetRows.length > 0 && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold font-mono"
                    style={{
                      background: ownFleetProfit >= 0
                        ? 'color-mix(in srgb, var(--theme-status-success) 10%, transparent)'
                        : 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)',
                      color: ownFleetProfit >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
                    }}
                  >
                    {ownFleetProfit >= 0 ? '+' : ''}{fmtFull(ownFleetProfit)}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{ownFleetRows.length} xe</span>
              </div>
            }
          />
          <div className="mb-3 border-b" style={{ borderColor: 'var(--theme-border-light)' }} />
          <div>
            {ownFleetRows.length > 0 ? (
              <NoiBoBarList rows={ownFleetRows} />
            ) : (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                Không có xe nội bộ trong tháng này
              </div>
            )}
          </div>
        </div>

        {/* Vendor vehicles */}
        <div className="bento-card bento-col-12 lg:bento-col-6 text-left">
          <DashboardSectionHeader
            title="Xe ngoài"
            icon={Truck}
            className="pb-3"
            right={
              <div className="flex items-center gap-2">
                {vendorRows.length > 0 && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold font-mono"
                    style={{
                      background: vendorProfit >= 0
                        ? 'color-mix(in srgb, var(--theme-status-success) 10%, transparent)'
                        : 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)',
                      color: vendorProfit >= 0 ? 'var(--theme-status-success)' : 'var(--theme-status-error)',
                    }}
                  >
                    {vendorProfit >= 0 ? '+' : ''}{fmtFull(vendorProfit)}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{vendorRows.length} xe</span>
              </div>
            }
          />
          <div className="mb-3 border-b" style={{ borderColor: 'var(--theme-border-light)' }} />
          <div>
            {vendorRows.length > 0 ? (
              <NgoaiBarList rows={vendorRows} />
            ) : (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                Không có xe ngoài trong tháng này
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── System counts, top lists & audit log feed ── */}
      <div className="bento-grid">
        {/* Xếp hạng hoạt động (Top lists) */}
        <div className="bento-card bento-col-12 md:bento-col-6 flex flex-col gap-4 text-left">
          <DashboardSectionHeader
            title="Xếp hạng hoạt động"
            icon={BarChart3}
            className="pb-3 border-b border-theme-border-light"
          />

          <div className="space-y-4 flex-grow">
            {/* Top routes */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-text-muted)' }}>
                Tuyến đường nổi bật
              </h4>
              <div className="flex flex-col gap-2.5">
                {topRoutes.length === 0 && (
                  <p className="text-xs py-2 text-center" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
                )}
                {topRoutes.slice(0, 3).map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2 text-xs">
                    <span className="w-4 shrink-0 flex items-center justify-center h-4 rounded text-[9px] font-bold" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)', color: 'var(--theme-brand-primary)' }}>
                      {i + 1}
                    </span>
                    <span className="flex-grow truncate font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{r.name}</span>
                    <span className="shrink-0 text-right font-bold font-mono tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top drivers */}
            <div className="pt-2 border-t border-theme-border-light">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-text-muted)' }}>
                Lái xe dẫn đầu
              </h4>
              <div className="flex flex-col gap-2">
                {topDrivers.length === 0 && (
                  <p className="text-xs py-2 text-center" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
                )}
                {topDrivers.slice(0, 3).map((d, i) => (
                  <div key={d.name + d.plate} className="flex items-center gap-2.5 text-xs py-0.5">
                    <span className="w-4 shrink-0 flex items-center justify-center h-4 rounded text-[9px] font-bold" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)', color: 'var(--theme-brand-primary)' }}>
                      {i + 1}
                    </span>
                    <div className="flex-grow min-w-0">
                      <p className="truncate font-semibold leading-none" style={{ color: 'var(--theme-text-primary)' }}>{d.name}</p>
                      {d.plate && <p className="truncate text-[10px] leading-tight text-theme-muted mt-0.5">{d.plate}</p>}
                    </div>
                    <span className="shrink-0 font-bold font-mono tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{d.tripCount} chuyến</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Activity Feed */}
        <div className="bento-card bento-col-12 md:bento-col-6 flex flex-col text-left">
          <div className="pb-3 border-b" style={{ borderColor: 'var(--theme-border-light)' }}>
            <h3 className="type-h3" style={{ color: 'var(--theme-text-primary)' }}>Hoạt động gần đây</h3>
          </div>
          <div className="flex-grow overflow-y-auto mt-2 px-1 custom-scrollbar" style={{ maxHeight: 290 }}>
            {auditLogs.length === 0 && !auditLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 h-full">
                <Activity className="w-7 h-7" style={{ color: 'var(--theme-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có hoạt động nào</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {auditLogs.map((log, i) => <ActivityItem key={log.id} log={log} isFirst={i === 0} />)}
                {hasMoreAudit && (
                  <div ref={sentinelRef} className="flex items-center justify-center py-3">
                    {auditLoading && (
                      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Đang tải…</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <OcrPerformanceChart />

      <OcrDriverChart />
    </div>
  )
}
