import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Plus, Search, X, CircleCheck } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DayNavigator } from '@/components/shared/navigation/DayNavigator'
import { DeliveredTripCard } from '@/components/shared/cards/DeliveredTripCard'
import { FloatingActionButton } from '@/components/shared/feedback/FloatingActionButton'
import { useMyEarnings, useDeliveredTripsInfinite, useContTypeStats } from '@/hooks/use-queries'
import { CONT_TYPES } from '@/data/domain'
import { useDebounce } from '@/hooks/use-debounce'
import { toISODate } from '@/lib/salaryPeriod'

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

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const dateParam = searchParams.get('date')
  const [selectedDate, setSelectedDateState] = useState<Date>(() => {
    if (dateParam) {
      const [y, m, d] = dateParam.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    return today
  })
  // Sync selectedDate with URL date param on browser navigation (back/forward)
  useEffect(() => {
    const dp = searchParams.get('date')
    if (dp) {
      const [y, m, d] = dp.split('-').map(Number)
      const urlDate = new Date(y, m - 1, d)
      urlDate.setHours(0, 0, 0, 0)
      const current = new Date(selectedDate)
      current.setHours(0, 0, 0, 0)
      if (urlDate.getTime() !== current.getTime()) {
        setSelectedDateState(urlDate)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateState(date)
    setSearchParams(
      prev => { const n = new URLSearchParams(prev); n.set('date', toISODate(date)); return n },
      { replace: true },
    )
  }, [setSearchParams])

  const startISO = toISODate(selectedDate)
  const endISO = startISO
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

  const { data: myEarnings } = useMyEarnings(startISO, endISO)

  const matchedSalary = myEarnings?.totalSalary ?? 0
  const unmatchedSalary = myEarnings?.unmatchedSalary ?? 0

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
      <div data-section="day" className="flex items-center justify-center">
        <DayNavigator
          date={selectedDate}
          onChange={setSelectedDate}
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
        <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-3">
          <CircleCheck data-salary-icon size={24} className="shrink-0" style={{ color: 'var(--theme-success, #16a34a)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
              Đã ghép
            </p>
            <p className="type-display tabular-nums leading-tight whitespace-nowrap" style={{ color: 'var(--theme-success, #16a34a)' }}>
              {matchedSalary.toLocaleString('vi-VN')}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--theme-border-light)' }} />

        {/* Right: salary from unmatched trips */}
        <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-3">
          <CircleCheck data-salary-icon size={24} className="shrink-0" style={{ color: 'var(--theme-warning, #d97706)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
              Chưa ghép
            </p>
            <p className="type-display tabular-nums leading-tight whitespace-nowrap" style={{ color: 'var(--theme-warning, #d97706)' }}>
              {unmatchedSalary.toLocaleString('vi-VN')}
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
  return (
    <span className="type-display tabular-nums leading-tight" style={{ color: 'var(--theme-text-primary)' }}>
      {value}
    </span>
  )
}

function EmptyState({ searchActive }: { searchActive: boolean }) {
  return (
    <div
      className="rounded-lg p-10 flex flex-col items-center justify-center text-center gap-3"
      style={{ background: 'var(--theme-bg-secondary)' }}
    >
      <img
        src="/icons/calkey.png"
        alt=""
        aria-hidden
        className="w-32 h-32 object-contain"
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
