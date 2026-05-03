import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder } from '@/data/domain'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { WorkOrderCard } from '@/components/shared/WorkOrderCard'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { useMySalaryPeriods, useSalaryConfig } from '@/hooks/use-queries'
import { getSalaryPeriodDates, dayBefore, dayAfter } from '@/utils/salaryPeriod'

const PAGE_SIZE = 10

type FilterTab = 'all' | 'pending'

export function DriverHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const sentinelRef = useRef<HTMLDivElement>(null)

  // Salary period config + navigation
  const { data: config } = useSalaryConfig()
  const now = new Date()
  const defaultPeriod = useMemo(
    () => getSalaryPeriodDates(now, { fromDay: config?.from_day ?? 1, toDay: config?.to_day ?? 31 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config?.from_day, config?.to_day],
  )
  const [periodStart, setPeriodStart] = useState<Date>(defaultPeriod.startDate)

  // Recompute end date from start + config
  const currentPeriod = useMemo(
    () => getSalaryPeriodDates(periodStart, { fromDay: config?.from_day ?? 1, toDay: config?.to_day ?? 31 }),
    [periodStart, config?.from_day, config?.to_day],
  )

  const { data: salaryPeriods = [] } = useMySalaryPeriods()

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders({ driverId: Number(user!.id) }).then(res => {
      if (!cancelled && res.success) setWorkOrders(res.data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [user!.id])

  // Reset visible count when period or filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [periodStart, filter])

  const handlePrevPeriod = useCallback(() => {
    setPeriodStart(getSalaryPeriodDates(dayBefore(currentPeriod.startDate), { fromDay: config?.from_day ?? 1, toDay: config?.to_day ?? 31 }).startDate)
  }, [currentPeriod.startDate, config?.from_day, config?.to_day])

  const handleNextPeriod = useCallback(() => {
    setPeriodStart(getSalaryPeriodDates(dayAfter(currentPeriod.endDate), { fromDay: config?.from_day ?? 1, toDay: config?.to_day ?? 31 }).startDate)
  }, [currentPeriod.endDate, config?.from_day, config?.to_day])

  // Trips in the current pay period — used by the monthly stat card (always
  // reflects the period total regardless of the active list filter).
  const periodJobs = useMemo(() => {
    const startISO = currentPeriod.startDate.toISOString()
    const endISO = new Date(currentPeriod.endDate.getFullYear(), currentPeriod.endDate.getMonth(), currentPeriod.endDate.getDate(), 23, 59, 59).toISOString()
    return workOrders.filter(w => w.createdAt >= startISO && w.createdAt <= endISO)
  }, [workOrders, currentPeriod])

  // Trips that match BOTH the period and the active list filter — used by the list.
  const filteredJobs = useMemo(() => {
    const byFilter = filter === 'pending'
      ? periodJobs.filter(w => w.status === 'PENDING')
      : periodJobs
    return [...byFilter].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [periodJobs, filter])

  const visibleJobs = useMemo(
    () => filteredJobs.slice(0, visibleCount),
    [filteredJobs, visibleCount],
  )

  const hasMore = visibleCount < filteredJobs.length

  // Infinite scroll
  const loadMore = useCallback(() => {
    setVisibleCount(n => n + PAGE_SIZE)
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore) loadMore() },
      { rootMargin: '120px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  // Stat card aggregations use periodJobs (NOT filteredJobs) so the totals
  // reflect the whole month regardless of which list tab the driver is viewing.
  const matchedCount = useMemo(() =>
    periodJobs.filter(w => w.status === 'MATCHED' || w.status === 'COMPLETED').length,
    [periodJobs],
  )

  const totalEarnings = useMemo(() =>
    periodJobs.reduce((sum, w) => sum + w.earning, 0),
    [periodJobs],
  )

  // Match salary period for current date range
  const matchedSalaryPeriod = useMemo(() => {
    const startStr = currentPeriod.startDate.toISOString().split('T')[0]
    const endStr = currentPeriod.endDate.toISOString().split('T')[0]
    return salaryPeriods.find(p => p.startDate === startStr && p.endDate === endStr) ?? null
  }, [salaryPeriods, currentPeriod])

  const earningsValue = matchedSalaryPeriod ? matchedSalaryPeriod.netPay : totalEarnings
  const displayMonth = currentPeriod.startDate.getMonth() + 1
  const displayYear = currentPeriod.startDate.getFullYear()

  return (
    <div className="space-y-4">
      {/* Combined month + earnings card */}
      <div
        className="rounded-xl overflow-hidden flex relative"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--theme-brand-primary) 5%, var(--theme-bg-secondary)) 0%, var(--theme-bg-secondary) 55%)',
          border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 14%, var(--theme-border-default))',
          boxShadow: '0 2px 8px -2px rgba(5,150,105,0.10), var(--theme-shadow-card)',
        }}
      >
        {/* Watermark truck silhouette */}
        <svg
          viewBox="0 0 120 60"
          fill="none"
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 0, bottom: 0,
            width: 90, height: 45,
            opacity: 0.045,
            pointerEvents: 'none',
          }}
        >
          <rect x="0"  y="10" width="72" height="35" rx="3" fill="#059669"/>
          <path d="M72 14 L92 14 Q96 14 96 18 L96 45 L72 45 Z" fill="#059669"/>
          <circle cx="18"  cy="48" r="8" fill="#059669"/>
          <circle cx="82"  cy="48" r="8" fill="#059669"/>
        </svg>

        <div className="flex-1 min-w-0 flex items-center justify-center py-3 px-2">
          <MonthNavigator
            year={displayYear}
            month={displayMonth}
            onPrev={handlePrevPeriod}
            onNext={handleNextPeriod}
            periodStart={currentPeriod.startDate}
            periodEnd={currentPeriod.endDate}
          />
        </div>

        <div
          className="w-px self-stretch my-3"
          style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 18%, var(--theme-border-default))' }}
        />

        <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-3">
          <img src="/icons/money.png" alt="" aria-hidden className="shrink-0 w-9 h-9 object-contain" />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold tabular-nums leading-tight whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
              {formatCurrencyFull(earningsValue)}
            </p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              {matchedCount} chuyến
            </p>
          </div>
        </div>
      </div>

      {/* Trip list */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Chuyến đã đi
          </p>

          <div
            className="flex rounded-full p-0.5 gap-0.5 shrink-0"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            {(['all', 'pending'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className="text-xs px-3 py-2 rounded-full font-medium transition-all touch-manipulation h-9 flex items-center shrink-0"
                style={
                  filter === tab
                    ? { background: 'var(--theme-brand-primary)', color: '#fff' }
                    : { background: 'transparent', color: 'var(--theme-text-muted)' }
                }
              >
                {tab === 'all' ? 'Tất cả' : 'Chờ đối soát'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div
            className="rounded-lg p-10 flex flex-col items-center justify-center text-center gap-3"
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
          <>
            <div className="space-y-2.5">
              {visibleJobs.map(job => (
                <WorkOrderCard
                  key={job.id}
                  variant="driver"
                  data={job}
                  onClick={() => navigate(`/driver/job/${job.id}`)}
                />
              ))}
            </div>

            <div ref={sentinelRef} className="h-1" />

            {hasMore && (
              <div className="flex justify-center py-2">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--theme-brand-primary)', borderTopColor: 'transparent' }} />
              </div>
            )}
          </>
        )}
      </div>

      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => navigate('/driver/work-orders/new')} label="Tạo chuyến" />

      <div className="h-20" />
    </div>
  )
}
