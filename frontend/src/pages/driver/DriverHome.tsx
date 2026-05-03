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

  const filteredJobs = useMemo(() => {
    const startISO = currentPeriod.startDate.toISOString()
    const endISO = new Date(currentPeriod.endDate.getFullYear(), currentPeriod.endDate.getMonth(), currentPeriod.endDate.getDate(), 23, 59, 59).toISOString()
    const byPeriod = workOrders.filter(w => w.createdAt >= startISO && w.createdAt <= endISO)
    const byFilter = filter === 'pending'
      ? byPeriod.filter(w => w.status === 'PENDING')
      : byPeriod
    return [...byFilter].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [workOrders, currentPeriod, filter])

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

  const matchedCount = useMemo(() =>
    filteredJobs.filter(w => w.status === 'MATCHED' || w.status === 'COMPLETED').length,
    [filteredJobs],
  )

  const totalEarnings = useMemo(() =>
    filteredJobs.reduce((sum, w) => sum + w.earning, 0),
    [filteredJobs],
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
        className="rounded-lg overflow-hidden flex"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          boxShadow: 'var(--theme-shadow-card)',
        }}
      >
        <div className="w-[55%] flex items-center justify-center py-3 px-2">
          <MonthNavigator
            year={displayYear}
            month={displayMonth}
            onPrev={handlePrevPeriod}
            onNext={handleNextPeriod}
            periodStart={currentPeriod.startDate}
            periodEnd={currentPeriod.endDate}
          />
        </div>

        <div className="w-px self-stretch my-3" style={{ background: 'var(--theme-border-default)' }} />

        <div className="w-[45%] flex items-center gap-2 px-3 py-3">
          <img src="/icons/money.png" alt="" aria-hidden className="shrink-0 w-10 h-10 object-contain" />
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
