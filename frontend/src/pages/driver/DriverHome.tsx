import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MonthNavigator } from '@/components/shared/navigation/MonthNavigator'
import { DeliveredTripCard } from '@/components/shared/cards/DeliveredTripCard'
import { FloatingActionButton } from '@/components/shared/feedback/FloatingActionButton'
import { useMyEarnings, useSalaryConfig, useDeliveredTrips, useDeliveredTripsInfinite } from '@/hooks/use-queries'
import { useDebounce } from '@/hooks/use-debounce'
import { getSalaryPeriodDates, dayBefore, dayAfter, toISODate } from '@/lib/salaryPeriod'
import { AnimatedNumber } from '@/components/shared/data-display/AnimatedNumber'

type FilterTab = 'all' | 'pending'

export function DriverHome() {
  return <MobileDriverHome />
}

function MobileDriverHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Search
  const [searchRaw, setSearchRaw] = useState('')
  const debouncedSearch = useDebounce(searchRaw, 300)

  // Filter persisted in URL (?filter=pending). Survives navigate(-1) back from trip detail.
  const filter = (searchParams.get('filter') as FilterTab | null) ?? 'all'
  const setFilter = useCallback((tab: FilterTab) => {
    setSearchParams(
      prev => { const n = new URLSearchParams(prev); if (tab === 'all') n.delete('filter'); else n.set('filter', tab); return n },
      { replace: true },
    )
  }, [setSearchParams])

  // Salary period config + navigation
  const { data: config } = useSalaryConfig()
  const now = useMemo(() => new Date(), [])
  const defaultPeriod = useMemo(() => {
    if (!config) return getSalaryPeriodDates(now, { fromDay: 1, toDay: 31 })
    // Use the salary period that contains today (not the calendar month).
    // e.g. today=May 30, fromDay=26, toDay=25 → period = May 26→Jun 25 (Tháng 06)
    return getSalaryPeriodDates(now, config)
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

  // When config first loads, reset periodStart to the correct default.
  // Without this, a stale URL param (?from=2026-05-21) persists even after
  // config reveals the correct period should be April 21 → May 20.
  const configLoaded = useRef(false)
  useEffect(() => {
    if (config && !configLoaded.current) {
      configLoaded.current = true
      _setPeriodStartState(defaultPeriod.startDate)
    }
  }, [config, defaultPeriod.startDate])

  // Recompute end date from start + config
  const currentPeriod = useMemo(
    () => getSalaryPeriodDates(periodStart, { fromDay: config?.fromDay ?? 1, toDay: config?.toDay ?? 31 }),
    [periodStart, config?.fromDay, config?.toDay],
  )

  // Sync URL with current period start (covers config-load correction and navigation)
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

  const startISO = currentPeriodStartISO
  const endISO = toISODate(currentPeriod.endDate)
  const driverId = Number(user!.id)

  // ── Stats: lightweight queries (pageSize=1) to get accurate totals from pagination ──
  const { data: allTripsPage } = useDeliveredTrips({
    driverId, dateFrom: startISO, dateTo: endISO, pageSize: 1,
  })
  const { data: matchedTripsPage } = useDeliveredTrips({
    driverId, dateFrom: startISO, dateTo: endISO, matched: true, pageSize: 1,
  })
  const totalCount = allTripsPage?.total ?? 0
  const matchedCount = matchedTripsPage?.total ?? 0
  const pendingCount = totalCount - matchedCount

  // ── List: server-side infinite query with search + matched filter ──
  const matchedFilter = filter === 'pending' ? false : undefined
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingTrips,
  } = useDeliveredTripsInfinite({
    driverId,
    dateFrom: startISO,
    dateTo: endISO,
    search: debouncedSearch || undefined,
    matched: matchedFilter,
  })

  // Flatten infinite pages into a single list
  const deliveredTrips = useMemo(
    () => infiniteData?.pages.flatMap(p => p.items) ?? [],
    [infiniteData],
  )

  // Fetch driver earnings for current period
  const { data: myEarnings } = useMyEarnings(startISO, endISO)

  const handlePrevPeriod = useCallback(() => {
    setPeriodStart(getSalaryPeriodDates(dayBefore(currentPeriod.startDate), { fromDay: config?.fromDay ?? 1, toDay: config?.toDay ?? 31 }).startDate)
  }, [currentPeriod.startDate, config?.fromDay, config?.toDay, setPeriodStart])

  const handleNextPeriod = useCallback(() => {
    setPeriodStart(getSalaryPeriodDates(dayAfter(currentPeriod.endDate), { fromDay: config?.fromDay ?? 1, toDay: config?.toDay ?? 31 }).startDate)
  }, [currentPeriod.endDate, config?.fromDay, config?.toDay, setPeriodStart])

  // Use on-the-fly earnings from backend if available, otherwise fallback to local calc
  const earningsValue = myEarnings?.totalEarnings ?? 0
  const displayMonth = currentPeriod.endDate.getMonth() + 1
  const displayYear = currentPeriod.endDate.getFullYear()

  // ── Infinite scroll observer ──
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasNextPage) fetchNextPage() },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage])

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
        className="flex overflow-hidden relative rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--theme-brand-primary) 5%, var(--theme-bg-secondary)) 0%, var(--theme-bg-secondary) 55%)',
          padding: 0,
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

      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--theme-text-muted)' }} />
        <input
          type="text"
          placeholder="Tìm số cont, mã KH, địa điểm, tác nghiệp..."
          value={searchRaw}
          onChange={e => setSearchRaw(e.target.value)}
          className="w-full h-10 pl-9 pr-8 rounded-lg border text-sm outline-none focus:ring-2"
          style={{
            background: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border-default)',
            color: 'var(--theme-text-primary)',
            // @ts-expect-error CSS variable
            '--tw-ring-color': 'var(--theme-brand-secondary)',
          }}
        />
        {searchRaw && (
          <button
            onClick={() => setSearchRaw('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            <X size={14} />
          </button>
        )}
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
                    ? { background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }
                    : { background: 'transparent', color: 'var(--theme-text-muted)' }
                }
              >
                {tab === 'all' ? 'Tất cả' : 'Chờ ghép'}
              </button>
            ))}
          </div>
        </div>

        {loadingTrips && deliveredTrips.length === 0 ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : deliveredTrips.length === 0 ? (
          <div
            className="rounded-lg p-10 flex flex-col items-center justify-center text-center gap-3"
            style={{ background: 'var(--theme-bg-secondary)' }}
          >
            <img src="/icons/calkey.png" alt="" aria-hidden className="w-32 h-32 object-contain" />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                {debouncedSearch ? 'Không tìm thấy chuyến nào' : 'Chưa có chuyến nào'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                {debouncedSearch ? 'Thử tìm kiếm với từ khóa khác' : 'Nhấn + để tạo chuyến mới'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {deliveredTrips.map(job => (
                <DeliveredTripCard
                  key={job.id}
                  variant="driver"
                  data={job}
                  onClick={() => navigate(`/driver/job/${job.id}`)}
                />
              ))}
            </div>

            <div ref={sentinelRef} className="h-1" />

            {isFetchingNextPage && (
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
