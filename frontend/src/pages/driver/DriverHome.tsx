import { useState, useMemo, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { Plus, Search, X, CircleCheck } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MonthNavigator } from '@/components/shared/navigation/MonthNavigator'
import { DeliveredTripCard } from '@/components/shared/cards/DeliveredTripCard'
import { FloatingActionButton } from '@/components/shared/feedback/FloatingActionButton'
import { useMyEarnings, useSalaryConfig, useDeliveredTripsInfinite, useContTypeStats } from '@/hooks/use-queries'
import { CONT_TYPES } from '@/data/domain'
import { useDebounce } from '@/hooks/use-debounce'
import { getSalaryPeriodDates, dayBefore, dayAfter, toISODate } from '@/lib/salaryPeriod'
import { AnimatedNumber } from '@/components/shared/data-display/AnimatedNumber'
import { animate, stagger, createScope, createTimeline, spring } from 'animejs'

type FilterTab = 'matched' | 'pending'

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
  const filter = (searchParams.get('filter') as FilterTab | null) ?? 'matched'
  const setFilter = useCallback((tab: FilterTab) => {
    setSearchParams(
      prev => { const n = new URLSearchParams(prev); if (tab === 'matched') n.delete('filter'); else n.set('filter', tab); return n },
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

  // ── Cont type stats ──
  const { data: contTypeStats } = useContTypeStats({
    driverId, dateFrom: startISO, dateTo: endISO,
  })

  // ── List: server-side infinite query with search + matched filter ──
  const matchedFilter = filter === 'pending' ? false : true
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

  const matchedSalary = myEarnings?.totalSalary ?? 0
  const unmatchedSalary = myEarnings?.unmatchedSalary ?? 0
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

  // ── Anime.js entrance animations ──
  const scopeRef = useRef<HTMLDivElement>(null)
  const animatedTripsCount = useRef(0)

  // Reset trip animation tracking when filters change (cards get remounted)
  useEffect(() => { animatedTripsCount.current = 0 }, [filter, debouncedSearch])

  // Page entrance: orchestrated timeline with spring physics
  useLayoutEffect(() => {
    if (!scopeRef.current) return
    const scope = createScope({
      root: scopeRef.current,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion)' },
    }).add((self) => {
      const { reduceMotion } = self.matches
      if (reduceMotion) return

      const tl = createTimeline({ defaults: { ease: 'out(3)' } })

      // Sections cascade in
      tl.add('[data-section]', {
        opacity: [0, 1],
        translateY: [20, 0],
        delay: stagger(60),
        duration: 500,
      }, 80)

      // Salary icons spring bounce (overlaps with sections)
      tl.add('[data-salary-icon]', {
        scale: [0, 1],
        duration: 600,
        ease: spring({ stiffness: 300, damping: 12 }),
      }, 180)

      // FAB spring entrance (after sections settle)
      tl.add('[data-fab]', {
        scale: [0, 1],
        opacity: [0, 1],
        duration: 800,
        ease: spring({ stiffness: 200, damping: 15 }),
      }, 500)
    })
    return () => scope.revert()
  }, [])

  // Trip cards: stagger entrance for newly loaded cards
  useEffect(() => {
    const root = scopeRef.current
    if (!root || deliveredTrips.length === 0) return

    const cards = root.querySelectorAll('[data-trip-card]')
    const prev = animatedTripsCount.current
    const newCards = prev > 0 ? Array.from(cards).slice(prev) : cards
    animatedTripsCount.current = deliveredTrips.length

    if (newCards.length === 0) return

    animate(newCards, {
      opacity: [0, 1],
      translateY: [14, 0],
      delay: stagger(35),
      duration: 400,
      ease: 'out(3)',
    })
  }, [deliveredTrips.length])

  return (
    <div ref={scopeRef} className="space-y-4">
      {/* Month navigator — standalone row, NOT part of the stat card */}
      <div data-section="month" className="flex items-center justify-center gap-2">
        <MonthNavigator
          year={displayYear}
          month={displayMonth}
          onPrev={handlePrevPeriod}
          onNext={handleNextPeriod}
          periodStart={currentPeriod.startDate}
          periodEnd={currentPeriod.endDate}
        />
      </div>

      {/* Stat card: matched salary + total earnings */}
      <div
        data-section="salary"
        className="flex overflow-hidden relative rounded-2xl stat-card-hover"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--theme-brand-primary) 5%, var(--theme-bg-secondary)) 0%, var(--theme-bg-secondary) 55%)',
          padding: 0,
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'default',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(9,9,11,0.08), 0 0 0 1px rgba(9,9,11,0.03)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
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

        {/* Left: salary from matched trips */}
        <div className="flex-1 min-w-0 flex items-center gap-2.5 px-4 py-3.5">
          <CircleCheck data-salary-icon size={28} className="shrink-0" style={{ color: 'var(--theme-success, #16a34a)' }} />
          <div className="flex-1 min-w-0">
            <p className="type-overline" style={{ color: 'var(--theme-text-muted)' }}>
              Lương đã ghép
            </p>
            <p className="type-display tabular-nums leading-tight whitespace-nowrap" style={{ color: 'var(--theme-success, #16a34a)' }}>
              <AnimatedNumber value={matchedSalary} format="currency" duration={700} />
            </p>
          </div>
        </div>

        {/* Right: salary from unmatched trips */}
        <div className="flex-1 min-w-0 flex items-center gap-2.5 px-4 py-3.5">
          <CircleCheck data-salary-icon size={28} className="shrink-0" style={{ color: 'var(--theme-warning, #d97706)' }} />
          <div className="flex-1 min-w-0">
            <p className="type-overline" style={{ color: 'var(--theme-text-muted)' }}>
              Lương chưa ghép
            </p>
            <p className="type-display tabular-nums leading-tight whitespace-nowrap" style={{ color: 'var(--theme-warning, #d97706)' }}>
              <AnimatedNumber value={unmatchedSalary} format="currency" duration={700} />
            </p>
          </div>
        </div>
      </div>

      {/* Container type stats — one card, 4 sections */}
      {contTypeStats && (
        <div
          data-section="cont-stats"
          className="flex items-stretch rounded-xl overflow-hidden"
          style={{ background: 'var(--theme-bg-secondary)' }}
        >
          {CONT_TYPES.map((ct, i) => (
            <div
              key={ct}
              className="flex-1 flex flex-col items-center justify-center py-2.5 cont-stat-hover"
              style={i > 0 ? { borderLeft: '1px solid var(--theme-border-default)' } : undefined}
            >
              <span className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{ct}</span>
              <ContStatNumber value={contTypeStats[ct] ?? 0} />
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div data-section="search" className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--theme-text-muted)' }} />
        <input
          type="text"
          placeholder="Tìm số cont, mã KH, địa điểm, tác nghiệp..."
          value={searchRaw}
          onChange={e => setSearchRaw(e.target.value)}
          className="w-full h-10 pl-9 pr-8 rounded-lg border text-sm outline-none focus:ring-2 search-input"
          style={{
            background: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border-default)',
            color: 'var(--theme-text-primary)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
            // @ts-expect-error CSS variable
            '--tw-ring-color': 'var(--theme-brand-secondary)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(5,150,105,0.12)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
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
      <div data-section="trips" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="type-h3" style={{ color: 'var(--theme-text-primary)' }}>
            Chuyến đã đi
          </p>

          <div
            className="flex rounded-full p-0.5 gap-0.5 shrink-0 relative"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            {(['matched', 'pending'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className="text-xs px-3 py-2 rounded-full font-medium transition-all touch-manipulation h-9 flex items-center shrink-0 relative z-10"
                style={
                  filter === tab
                    ? { background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', transform: 'scale(1.02)' }
                    : { background: 'transparent', color: 'var(--theme-text-muted)' }
                }
              >
                {tab === 'matched' ? 'Đã ghép' : 'Chưa ghép'}
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
          <EmptyState
            searchActive={!!debouncedSearch}
          />
        ) : (
          <>
            <div className="space-y-2.5">
              {deliveredTrips.map(job => (
                <div data-trip-card key={job.id}>
                  <DeliveredTripCard
                    variant="driver"
                    data={job}
                    onClick={() => navigate(`/driver/job/${job.id}`)}
                  />
                </div>
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

      <div data-fab>
        <FloatingActionButton
          icon={<Plus className="w-6 h-6" />}
          onClick={() => navigate('/driver/delivered-trips/new')}
          label="Tạo chuyến"
          pulse={deliveredTrips.length === 0 && !loadingTrips}
        />
      </div>

      <div className="h-20" />
    </div>
  )
}

function ContStatNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prevValue = useRef(value)

  useEffect(() => {
    if (!ref.current || value === prevValue.current) return
    const obj = { val: prevValue.current }
    const anim = animate(obj, {
      val: value,
      round: 1,
      duration: 600,
      ease: 'outExpo',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = String(obj.val)
      },
    })
    prevValue.current = value
    return () => anim.cancel()
  }, [value])

  return (
    <span ref={ref} className="type-display tabular-nums leading-tight" style={{ color: 'var(--theme-text-primary)' }}>
      {value}
    </span>
  )
}

function EmptyState({ searchActive }: { searchActive: boolean }) {
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!imgRef.current) return
    const anim = animate(imgRef.current, {
      translateY: [-8, 8],
      duration: 2500,
      loop: true,
      alternate: true,
      ease: 'inOutSine',
    })
    return () => anim.cancel()
  }, [])

  return (
    <div
      className="rounded-lg p-10 flex flex-col items-center justify-center text-center gap-3"
      style={{ background: 'var(--theme-bg-secondary)' }}
    >
      <img
        ref={imgRef}
        src="/icons/calkey.png"
        alt=""
        aria-hidden
        className="w-32 h-32 object-contain"
        style={{ willChange: 'transform' }}
      />
      <div>
        <p className="type-h3" style={{ color: 'var(--theme-text-primary)' }}>
          {searchActive ? 'Không tìm thấy chuyến nào' : 'Chưa có chuyến nào'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
          {searchActive ? 'Thử tìm kiếm với từ khóa khác' : 'Nhấn + để tạo chuyến mới'}
        </p>
      </div>
    </div>
  )
}
