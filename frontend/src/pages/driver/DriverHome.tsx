import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder } from '@/data/domain'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { WorkOrderCard } from '@/components/shared/WorkOrderCard'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { useMySalaryPeriods } from '@/hooks/use-queries'

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

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

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

  // Reset visible count when month or filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [year, month, filter])

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
    const byMonth = workOrders.filter(w => w.createdAt >= start && w.createdAt <= end)
    const byFilter = filter === 'pending'
      ? byMonth.filter(w => w.status === 'PENDING')
      : byMonth
    return [...byFilter].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [workOrders, year, month, filter])

  const visibleJobs = useMemo(
    () => filteredJobs.slice(0, visibleCount),
    [filteredJobs, visibleCount],
  )

  const hasMore = visibleCount < filteredJobs.length

  // Infinite scroll — load more when sentinel enters viewport
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
        {/* Left: month navigator — 55% */}
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

        {/* Right: earnings stat — 45%, no button */}
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

      {/* ── Chuyến đã đi ── */}
      <div className="space-y-2.5">
        {/* Header + filter pills */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Chuyến đã đi
          </p>

          {/* Filter tabs */}
          <div
            className="flex rounded-full p-0.5 gap-0.5"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            {(['all', 'pending'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className="text-xs px-3 py-1 rounded-full font-medium transition-all touch-manipulation"
                style={
                  filter === tab
                    ? {
                        background: 'var(--theme-brand-primary)',
                        color: '#fff',
                      }
                    : {
                        background: 'transparent',
                        color: 'var(--theme-text-muted)',
                      }
                }
              >
                {tab === 'all' ? 'Tất cả' : 'Chờ đối soát'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
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

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {/* Loading more indicator */}
            {hasMore && (
              <div className="flex justify-center py-2">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--theme-brand-primary)', borderTopColor: 'transparent' }} />
              </div>
            )}
          </>
        )}
      </div>

      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => navigate('/driver/work-orders/new')} label="Tạo chuyến" />
    </div>
  )
}
