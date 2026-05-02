import { useState, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder } from '@/data/domain'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { WorkOrderCard } from '@/components/shared/WorkOrderCard'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { useMySalaryPeriods } from '@/hooks/use-queries'

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
  const { data: salaryPeriods = [] } = useMySalaryPeriods()
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

  const displayMonth = month + 1
  const earningsValue = latestPeriod ? latestPeriod.netPay : totalEarnings

  return (
    <div className="space-y-4">
      {/* ── Combined month + earnings card ── */}
      <div
        className="rounded-2xl overflow-hidden flex"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          boxShadow: 'var(--theme-shadow-card)',
        }}
      >
        {/* Left: month navigator — 60% */}
        <div className="w-[55%] flex items-center justify-center py-3 px-2">
          <MonthNavigator
            year={year}
            month={displayMonth}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
          />
        </div>

        {/* Divider */}
        <div className="w-px self-stretch my-3" style={{ background: 'var(--theme-border-default)' }} />

        {/* Right: earnings stat — 40%, no button */}
        <div className="w-[45%] flex items-center gap-2 px-3 py-3">
          {/* Money icon */}
          <img src="/icons/money.png" alt="" aria-hidden className="shrink-0 w-10 h-10 object-contain" />

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold tabular-nums leading-tight truncate" style={{ color: 'var(--theme-text-primary)' }}>
              {formatCurrencyFull(earningsValue)}
            </p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              {matchedCount} chuyến
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent work orders ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Chuyến đã đi
          </p>
          <button
            onClick={() => navigate('/driver/history')}
            className="text-xs font-semibold px-3 py-1 rounded-full border touch-manipulation transition-colors"
            style={{
              color: 'var(--theme-text-primary)',
              borderColor: 'var(--theme-border-default)',
            }}
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
          <div
            className="rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3"
            style={{ background: 'var(--theme-bg-secondary)' }}
          >
            <img src="/icons/calkey.png" alt="" aria-hidden className="w-32 h-32 object-contain" />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Chưa có chuyến nào
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                Nhấn + để tạo chuyến mới
              </p>
            </div>
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
