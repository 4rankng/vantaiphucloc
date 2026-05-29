import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { DeliveredTripCard } from '@/components/shared/DeliveredTripCard'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { useMyEarnings, useSalaryConfig, useDeliveredTrips } from '@/hooks/use-queries'
import { getSalaryPeriodDates, getSalaryPeriodForMonth, dayBefore, dayAfter, toISODate } from '@/utils/salaryPeriod'
import { AnimatedNumber } from '@/components/shared/AnimatedNumber'

const PAGE_SIZE = 10

type FilterTab = 'all' | 'pending'

export function DriverHome() {
  return <MobileDriverHome />
}

function MobileDriverHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: _deliveredTrips, isLoading: loading } = useDeliveredTrips({ driverId: Number(user!.id) })
  const deliveredTrips = useMemo(() => _deliveredTrips?.items ?? [], [_deliveredTrips])

  // Filter persisted in URL (?filter=pending). Survives navigate(-1) back from trip detail.
  const filter = (searchParams.get('filter') as FilterTab | null) ?? 'all'
  const setFilter = useCallback((tab: FilterTab) => {
    setSearchParams(
      prev => { const n = new URLSearchParams(prev); if (tab === 'all') n.delete('filter'); else n.set('filter', tab); return n },
      { replace: true },
    )
  }, [setSearchParams])

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const sentinelRef = useRef<HTMLDivElement>(null)

  // Salary period config + navigation
  const { data: config } = useSalaryConfig()
  const now = useMemo(() => new Date(), [])
  const defaultPeriod = useMemo(() => {
    if (!config) return getSalaryPeriodDates(now, { fromDay: 1, toDay: 31 })
    // Use the salary month whose toDay falls in the current calendar month.
    // e.g. today=May 29, fromDay=21, toDay=20 → salary month = May → April 21 → May 20
    return getSalaryPeriodForMonth(now.getFullYear(), now.getMonth() + 1, config)
  }, [now, config])

  // PeriodStart persisted in URL (?from=2026-04-21). Survives navigate(-1) back from trip detail.
  const periodStartParam = searchParams.get('from')
  const [periodStart, _setPeriodStartState] = useState<Date>(() =>
    periodStartParam ? new Date(periodStartParam) : defaultPeriod.startDate,
  )
  const setPeriodStart = useCallback((date: Date) => {
    _setPeriodStartState(date)
    setSearchParams(
      prev => { const n = new URLSearchParams(prev); n.set('from', toISODate(date)); return n },
      { replace: true },
    )
  }, [setSearchParams])

  // Recompute end date from start + config
  const currentPeriod = useMemo(
    () => getSalaryPeriodDates(periodStart, { fromDay: config?.fromDay ?? 1, toDay: config?.toDay ?? 31 }),
    [periodStart, config?.fromDay, config?.toDay],
  )

  // Always keep ?from= in sync with the DISPLAYED period start (currentPeriod.startDate).
  // This covers the case where the user never manually navigates months — on initial
  // load the period is computed from config (which may not be cached yet), so ?from=
  // might not be set. Once currentPeriod.startDate is known, we write it to the URL
  // so that navigate(-1) from trip detail always restores the correct period.
  const currentPeriodStartISO = toISODate(currentPeriod.startDate)
  useEffect(() => {
    setSearchParams(
      prev => {
        if (prev.get('from') === currentPeriodStartISO) return prev
        const n = new URLSearchParams(prev)
        n.set('from', currentPeriodStartISO)
        return n
      },
      { replace: true },
    )
  }, [currentPeriodStartISO, setSearchParams])

  // Fetch driver earnings for current period
  const startISO = currentPeriodStartISO
  const endISO = toISODate(currentPeriod.endDate)
  const { data: myEarnings } = useMyEarnings(startISO, endISO)

  // Reset visible count when period or filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [periodStart, filter])

  const handlePrevPeriod = useCallback(() => {
    setPeriodStart(getSalaryPeriodDates(dayBefore(currentPeriod.startDate), { fromDay: config?.fromDay ?? 1, toDay: config?.toDay ?? 31 }).startDate)
  }, [currentPeriod.startDate, config?.fromDay, config?.toDay, setPeriodStart])

  const handleNextPeriod = useCallback(() => {
    setPeriodStart(getSalaryPeriodDates(dayAfter(currentPeriod.endDate), { fromDay: config?.fromDay ?? 1, toDay: config?.toDay ?? 31 }).startDate)
  }, [currentPeriod.endDate, config?.fromDay, config?.toDay, setPeriodStart])

  // Trips in the current pay period — used by the monthly stat card (always
  // reflects the period total regardless of the active list filter).
  // Uses tripDate (actual execution date) rather than createdAt (seed date).
  const periodJobs = useMemo(() => {
    const startDate = toISODate(currentPeriod.startDate)
    const endDate = toISODate(currentPeriod.endDate)
    return deliveredTrips.filter(w => {
      const d = (w.tripDate ?? w.createdAt.slice(0, 10))
      return d >= startDate && d <= endDate
    })
  }, [deliveredTrips, currentPeriod])

  // Trips that match BOTH the period and the active list filter — used by the list.
  const filteredJobs = useMemo(() => {
    const byFilter = filter === 'pending'
      ? periodJobs.filter(w => !w.bookedTripId)
      : periodJobs
    return [...byFilter].sort((a, b) => {
      const da = a.tripDate ?? a.createdAt.slice(0, 10)
      const db = b.tripDate ?? b.createdAt.slice(0, 10)
      return db.localeCompare(da)
    })
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
  const totalEarnings = useMemo(() =>
    periodJobs.reduce((sum, w) => sum + w.driverSalary, 0),
    [periodJobs],
  )

  const matchedCount = useMemo(() =>
    periodJobs.filter(w => w.bookedTripId).length,
    [periodJobs],
  )
  const pendingCount = useMemo(() =>
    periodJobs.filter(w => !w.bookedTripId).length,
    [periodJobs],
  )

  // Use on-the-fly earnings from backend if available, otherwise fallback to local calc
  const earningsValue = myEarnings?.totalEarnings ?? totalEarnings
  const displayMonth = currentPeriod.startDate.getMonth() + 1
  const displayYear = currentPeriod.startDate.getFullYear()

  return (
    <div className="space-y-4">
      {/* Month navigator — standalone row, NOT part of the stat card */}
      <div className="flex items-center justify-center gap-2">
        <MonthNavigator
          year={displayYear}
          month={displayMonth}
          onPrev={handlePrevPeriod}
          onNext={handleNextPeriod}
          periodStart={currentPeriod.startDate}
          periodEnd={currentPeriod.endDate}
        />
      </div>

      {/* Stat card: trips breakdown + salary */}
      <div
        className="rounded-xl overflow-hidden flex relative"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--theme-brand-primary) 5%, var(--theme-bg-secondary)) 0%, var(--theme-bg-secondary) 55%)',
          border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 14%, var(--theme-border-default))',
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

        {/* Left: trip breakdown — label + two sub-columns */}
        <div className="flex-1 min-w-0 flex flex-col justify-center px-4 py-3.5 gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
            Số chuyến
          </p>
          <div className="flex items-start">
            {/* Đã ghép */}
            <div className="flex-1 flex flex-col gap-0.5">
              <p className="text-[11px] font-medium" style={{ color: 'var(--theme-success, #16a34a)' }}>Đã ghép</p>
              <p className="text-xl font-bold tabular-nums leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{matchedCount}</p>
            </div>
            {/* Inner divider */}
            <div className="w-px self-stretch mx-3" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 14%, var(--theme-border-default))' }} />
            {/* Chưa ghép */}
            <div className="flex-1 flex flex-col gap-0.5">
              <p className="text-[11px] font-medium" style={{ color: 'var(--theme-warning, #d97706)' }}>Chưa ghép</p>
              <p className="text-xl font-bold tabular-nums leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{pendingCount}</p>
            </div>
          </div>
        </div>

        {/* Right: salary */}
        <div className="flex-1 min-w-0 flex items-center gap-2.5 px-4 py-3.5">
          <img src="/icons/money.png" alt="" aria-hidden className="shrink-0 w-9 h-9 object-contain" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
              Lương
            </p>
            <p className="text-[15px] font-bold tabular-nums leading-tight whitespace-nowrap" style={{ color: 'var(--theme-brand-primary)' }}>
              <AnimatedNumber value={earningsValue} format="currency" duration={700} />
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
                {tab === 'all' ? 'Tất cả' : 'Chờ ghép'}
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
                <DeliveredTripCard
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

      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => navigate('/driver/delivered-trips/new')} label="Tạo chuyến" />

      <div className="h-20" />
    </div>
  )
}
