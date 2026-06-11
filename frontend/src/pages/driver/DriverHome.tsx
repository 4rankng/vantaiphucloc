import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DayNavigator } from '@/components/shared/navigation/DayNavigator'
import { DeliveredTripCard } from '@/components/shared/cards/DeliveredTripCard'
import { FloatingActionButton } from '@/components/shared/feedback/FloatingActionButton'
import { useMyEarnings, useSalaryConfig, useDeliveredTripsInfinite, useContTypeStats } from '@/hooks/use-queries'
import { CONT_TYPES } from '@/data/domain'
import { useDebounce } from '@/hooks/use-debounce'
import { toISODate, getSalaryPeriodDates } from '@/lib/salaryPeriod'

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

  // ── Daily earnings ──
  const { data: myEarnings } = useMyEarnings(startISO, endISO)

  const matchedSalary = myEarnings?.totalSalary ?? 0
  const unmatchedSalary = myEarnings?.unmatchedSalary ?? 0

  // ── Monthly earnings ──
  const { data: salaryConfig } = useSalaryConfig()
  const monthPeriod = useMemo(() => {
    const fromDay = salaryConfig?.fromDay ?? 26
    const toDay = salaryConfig?.toDay ?? 25
    return getSalaryPeriodDates(selectedDate, { fromDay, toDay })
  }, [selectedDate, salaryConfig])
  const monthStartISO = toISODate(monthPeriod.startDate)
  const monthEndISO = toISODate(monthPeriod.endDate)
  const { data: monthlyEarnings } = useMyEarnings(monthStartISO, monthEndISO)

  const monthlyMatched = monthlyEarnings?.totalSalary ?? 0
  const monthlyUnmatched = monthlyEarnings?.unmatchedSalary ?? 0
  const monthBadge = `T${monthPeriod.endDate.getMonth() + 1}`
  const dateBadge = `${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}`

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

      {/* Monthly earnings */}
      <div
        data-section="monthly-salary"
        className="rounded-xl overflow-hidden grid"
        style={{ gridTemplateColumns: '80px 1fr', background: 'var(--theme-bg-secondary)' }}
      >
        {/* Month */}
        <div className="flex items-center justify-center" style={{ borderRight: '1px solid var(--theme-border-default)' }}>
          <span className="text-base font-bold leading-none" style={{ color: 'var(--theme-text-muted)' }}>{monthBadge}</span>
        </div>
        {/* Rows */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>Đã ghép</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>{monthlyMatched.toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5" style={{ borderTop: '1px solid var(--theme-border-default)' }}>
            <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>Chưa ghép</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{monthlyUnmatched.toLocaleString('vi-VN')}</span>
          </div>
        </div>
      </div>

      {/* Daily earnings */}
      <div
        data-section="salary"
        className="rounded-xl overflow-hidden grid"
        style={{ gridTemplateColumns: '80px 1fr', background: 'var(--theme-bg-secondary)' }}
      >
        {/* Date */}
        <div className="flex items-center justify-center" style={{ borderRight: '1px solid var(--theme-border-default)' }}>
          <span className="text-base font-bold tabular-nums leading-none" style={{ color: 'var(--theme-text-muted)' }}>{dateBadge}</span>
        </div>
        {/* Rows */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>Đã ghép</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>{matchedSalary.toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5" style={{ borderTop: '1px solid var(--theme-border-default)' }}>
            <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>Chưa ghép</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{unmatchedSalary.toLocaleString('vi-VN')}</span>
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
