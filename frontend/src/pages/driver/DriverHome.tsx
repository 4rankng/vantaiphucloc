import { useState, useEffect, useMemo } from 'react'
import { Plus, Calendar, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder } from '@/data/domain'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { WorkOrderCard } from '@/components/shared/WorkOrderCard'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { useSalaryPeriods } from '@/hooks/use-queries'

const PREVIEW_COUNT = 10

export function DriverHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // Latest salary period for the banner
  const { data: salaryPeriods = [] } = useSalaryPeriods(Number(user!.id))
  const latestPeriod = salaryPeriods[0] ?? null

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders({ driverId: Number(user!.id) }).then(res => {
      if (!cancelled && res.success) setWorkOrders(res.data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [user!.id])

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const filteredJobs = useMemo(() => {
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    return workOrders.filter(w => w.createdAt >= start && w.createdAt <= end)
  }, [workOrders, year, month])

  const recentJobs = useMemo(() =>
    [...filteredJobs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, PREVIEW_COUNT),
    [filteredJobs],
  )

  const matchedCount = useMemo(() =>
    filteredJobs.filter(w => w.status === 'MATCHED' || w.status === 'COMPLETED').length,
    [filteredJobs],
  )

  const totalEarnings = useMemo(() =>
    filteredJobs.reduce((sum, w) => sum + w.earning, 0),
    [filteredJobs],
  )

  // Format a date string like "26/04" from ISO
  const fmtShort = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

  return (
    <div className="space-y-4">
      <MonthNavigator year={year} month={month + 1} onPrev={handlePrevMonth} onNext={handleNextMonth} />

      {/* ── Salary / earnings banner ── */}
      <button
        onClick={() => navigate('/driver/history')}
        className="w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] touch-manipulation"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          boxShadow: 'var(--theme-shadow-card)',
        }}
      >
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--theme-brand-primary)' }}>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {latestPeriod ? (
            <p className="text-xs mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
              Kỳ lương {fmtShort(latestPeriod.startDate)} → {fmtShort(latestPeriod.endDate)}
            </p>
          ) : (
            <p className="text-xs mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
              Tháng {month + 1}/{year}
            </p>
          )}
          <p className="text-xl font-bold tabular-nums leading-tight" style={{ color: 'var(--theme-text-primary)' }}>
            {formatCurrencyFull(latestPeriod ? latestPeriod.netPay : totalEarnings)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            {matchedCount} phiếu đã ghép
          </p>
        </div>

        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
      </button>

      {/* ── Recent work orders ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Phiếu gần đây
          </p>
          <button
            onClick={() => navigate('/driver/history')}
            className="text-xs font-semibold touch-manipulation"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            Xem tất cả
          </button>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Chưa có chuyến nào</p>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn + để tạo chuyến mới</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentJobs.map(job => (
              <WorkOrderCard
                key={job.id}
                variant="driver"
                data={job}
                onClick={() => navigate(`/driver/job/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => navigate('/driver/work-orders/new')} label="Tạo chuyến" />
    </div>
  )
}
