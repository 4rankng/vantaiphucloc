import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Building2, CheckCircle2, ArrowRight } from 'lucide-react'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import { BarChartWidget, LineChartWidget } from '@/components/shared/data-display/Charts'
import { OcrViewToggle, type ViewMode } from '@/components/shared/data-display/OcrViewToggle/OcrViewToggle'
import { useUsers } from '@/hooks/use-queries'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import { buildDailyTotalLineData, buildMonthlyBarData, grandTotal, hasOcrData } from './ocrAnalytics.helpers'

/**
 * /superadmin landing — admin dashboard overview.
 * Account counts (bento) + a prominent OCR section. Account management lives
 * at /superadmin/accounts; per-day/month OCR detail lives at /superadmin/ocr-analytics.
 */
export function SuperAdminOverview() {
  const { data: users = [] } = useUsers()
  const [view, setView] = useState<ViewMode>('day')
  const { data: ocrStats, isLoading: ocrLoading } = useOcrStats(view === 'month' ? 365 : 30)

  const dailyData = useMemo(
    () => buildDailyTotalLineData(ocrStats?.daily ?? []),
    [ocrStats],
  )
  const monthlyData = useMemo(
    () => buildMonthlyBarData(ocrStats?.monthly ?? []),
    [ocrStats],
  )

  const totalCount = users.length
  const activeCount = users.filter((u) => u.isActive).length
  const inactiveCount = totalCount - activeCount
  const directorCount = users.filter((u) => u.role === 'director').length
  const accountantCount = users.filter((u) => u.role === 'accountant').length
  const driverCount = users.filter((u) => u.role === 'driver').length

  const ocrTotal = grandTotal(ocrStats)
  const showOcrEmpty = !ocrLoading && !hasOcrData(ocrStats)
  const ocrTitle = view === 'month'
    ? `Tổng lượt OCR (12 tháng): ${ocrTotal.toLocaleString('vi-VN')}`
    : `Tổng lượt OCR (30 ngày): ${ocrTotal.toLocaleString('vi-VN')}`
  const ocrSubtitle = view === 'month'
    ? 'Số lượt nhận dạng số cont theo tháng'
    : 'Số lượt nhận dạng số cont theo ngày'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Summary Stats Bento Grid ── */}
      <div className="bento-grid">
        {/* Panel 1: Tài khoản hệ thống */}
        <div className="bento-card bento-card-gradient-blue bento-col-12 md:bento-col-4">
          <div className="flex items-center gap-3">
            <div className="bento-badge-icon" style={{ background: 'color-mix(in srgb, var(--theme-status-info) 10%, transparent)', color: 'var(--theme-status-info)' }}>
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-grow min-w-0">
              <span className="bento-stat-label">Tài khoản hệ thống</span>
              <h3 className="bento-stat-value">
                {totalCount} <span className="text-xs font-semibold text-theme-muted" style={{ fontFamily: 'var(--font-sans)' }}>Tài khoản</span>
              </h3>
            </div>
          </div>
          <div className="bento-stat-footer">
            <span style={{ color: 'var(--theme-status-success)', fontWeight: 600 }}>Hoạt động: {activeCount}</span>
            <span style={{ color: 'var(--theme-status-error)', fontWeight: 600 }}>Tạm dừng: {inactiveCount}</span>
            <Link
              to="/superadmin/accounts"
              className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              Quản lý
              <ArrowRight className="w-3 h-3" strokeWidth={2.2} />
            </Link>
          </div>
        </div>

        {/* Panel 2: Phân bổ vai trò */}
        <div className="bento-card bento-col-12 md:bento-col-4">
          <div className="flex items-center gap-3">
            <div className="bento-badge-icon" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}>
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-grow min-w-0">
              <span className="bento-stat-label">Phân bổ vai trò</span>
              <div className="flex gap-2 mt-1 text-[11px] font-bold">
                <span className="inline-flex items-center rounded-md px-1.5 py-0.5" style={{ background: '#F1ECF9', color: '#6E45B0' }}>ĐT: {directorCount}</span>
                <span className="inline-flex items-center rounded-md px-1.5 py-0.5" style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}>KT: {accountantCount}</span>
                <span className="inline-flex items-center rounded-md px-1.5 py-0.5" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>LX: {driverCount}</span>
              </div>
            </div>
          </div>
          <div className="bento-stat-footer">
            <span>Giám đốc · Kế toán · Lái xe</span>
          </div>
        </div>

        {/* Panel 3: Trạng thái vận hành */}
        <div className="bento-card bento-card-gradient-emerald bento-col-12 md:bento-col-4">
          <div className="flex items-center gap-3">
            <div className="bento-badge-icon" style={{ background: 'color-mix(in srgb, var(--theme-status-success) 10%, transparent)', color: 'var(--theme-status-success)' }}>
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-grow min-w-0">
              <span className="bento-stat-label">Trạng thái vận hành</span>
              <h3 className="text-base font-bold mt-1" style={{ color: 'var(--theme-text-primary)' }}>
                Hệ thống ổn định
              </h3>
              <p className="text-[11px] text-theme-muted">Tất cả dịch vụ đang hoạt động</p>
            </div>
          </div>
          <div className="bento-stat-footer">
            <span>SuperAdmin quản trị</span>
          </div>
        </div>
      </div>

      {/* ── OCR Analytics section (prominent) ── */}
      <ChartCard
        title={ocrTitle}
        subtitle={ocrSubtitle}
        loading={ocrLoading}
        actions={
          <div className="flex items-center gap-2">
            <OcrViewToggle value={view} onChange={setView} />
            <Link
              to="/superadmin/ocr-analytics"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              Xem chi tiết
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} />
            </Link>
          </div>
        }
      >
        {showOcrEmpty ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              Chưa có dữ liệu
            </p>
          </div>
        ) : view === 'month' ? (
          <BarChartWidget data={monthlyData} height={340} />
        ) : (
          <LineChartWidget
            data={dailyData}
            height={340}
            options={{
              plugins: { legend: { display: false } },
              interaction: { mode: 'index', intersect: false },
            }}
          />
        )}
      </ChartCard>
    </div>
  )
}
