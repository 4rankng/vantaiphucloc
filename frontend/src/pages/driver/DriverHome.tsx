import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Plus, MapPin, Calendar } from 'lucide-react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder, type ContainerItem } from '@/data/mockData'

// ─── Cont type badge ──────────────────────────────────────────────────────────
function ContBadge({ type }: { type: string }) {
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
      style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
    >
      {type}
    </span>
  )
}

// ─── Job card ─────────────────────────────────────────────────────────────────
function JobCard({ job, onClick }: { job: WorkOrder; onClick: () => void }) {
  const date = new Date(job.createdAt)
  const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  const timeStr = date.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-3.5 transition-all active:scale-[0.98] touch-manipulation"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      {/* Container numbers + types */}
      <div className="space-y-1 mb-2">
        {job.containers.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <p className="text-sm font-bold font-mono" style={{ color: 'var(--theme-text-primary)' }}>
              {c.containerNumber}
            </p>
            <ContBadge type={c.workType} />
          </div>
        ))}
      </div>

      {/* Customer + Route */}
      <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
        {job.clientName}
      </p>
      <p className="text-[11px] truncate" style={{ color: 'var(--theme-text-muted)' }}>
        {job.route}
      </p>

      {/* Bottom: earning + date */}
      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        {job.earning > 0 ? (
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            +{formatCurrencyFull(job.earning)}
          </span>
        ) : (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}
          >
            Chờ đơn giá
          </span>
        )}
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>
          {dateStr}
        </span>
      </div>
    </button>
  )
}

// ─── FAB ──────────────────────────────────────────────────────────────────────
function Fab({ onClick }: { onClick: () => void }) {
  return createPortal(
    <button
      onClick={onClick}
      className="fixed bottom-6 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50 transition-transform active:scale-90 touch-manipulation"
      style={{
        background: 'var(--theme-brand-primary)',
        color: 'var(--theme-text-on-brand)',
        boxShadow: 'var(--theme-shadow-elevated)',
      }}
      aria-label="Tạo chuyến mới"
    >
      <Plus className="w-6 h-6" />
    </button>,
    document.body,
  )
}

// ─── Month navigator ──────────────────────────────────────────────────────────
function MonthNavigator({ year, month, onPrev, onNext }: {
  year: number; month: number; onPrev: () => void; onNext: () => void
}) {
  const monthName = new Date(year, month).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <button
        onClick={onPrev}
        className="w-9 h-9 flex items-center justify-center rounded-full touch-manipulation"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
      >
        <ChevronLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary)' }} />
      </button>
      <span className="text-sm font-bold capitalize min-w-[140px] text-center" style={{ color: 'var(--theme-text-primary)' }}>
        {monthName}
      </span>
      <button
        onClick={onNext}
        className="w-9 h-9 flex items-center justify-center rounded-full touch-manipulation"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
      >
        <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-primary)' }} />
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DriverHome() {
  const { driver, navigate } = useDriverStore()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  // Month navigator state — default current month
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders({ driverId: driver.id }).then(res => {
      if (!cancelled && res.success) setWorkOrders(res.data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [driver.id])

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Filter jobs by selected month
  const filteredJobs = useMemo(() => {
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    return workOrders.filter(w => w.createdAt >= start && w.createdAt <= end)
  }, [workOrders, year, month])

  const totalEarnings = useMemo(() =>
    filteredJobs.reduce((sum, w) => sum + w.earning, 0),
    [filteredJobs],
  )

  return (
    <div className="pb-20">
      {/* Stats row */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
          >
            <p className="text-[11px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
              Thu nhập
            </p>
            <p className="text-xl font-bold tabular-nums mt-1" style={{ color: 'var(--theme-text-primary)' }}>
              {formatCurrencyFull(totalEarnings)}
            </p>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
          >
            <p className="text-[11px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
              Số chuyến
            </p>
            <p className="text-xl font-bold tabular-nums mt-1" style={{ color: 'var(--theme-text-primary)' }}>
              {filteredJobs.length}
            </p>
          </div>
        </div>
      </div>

      {/* Month navigator */}
      <div className="px-4 mt-4">
        <MonthNavigator year={year} month={month} onPrev={handlePrevMonth} onNext={handleNextMonth} />
      </div>

      {/* Job list */}
      <div className="px-4 mt-4 space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          Lịch sử chuyến
        </p>

        {loading ? (
          <div className="animate-pulse space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có chuyến nào trong tháng này</p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onClick={() => navigate(`/driver/job/${job.id}`)}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <Fab onClick={() => navigate('/driver/work-orders/new')} />
    </div>
  )
}
