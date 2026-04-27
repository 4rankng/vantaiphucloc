import { useEffect, useState, useMemo, useRef } from 'react'
import { useAppStore } from '@/hooks/use-app-store'
import { apiClient } from '@/services/api'
import { createTripOrder } from '@/services/sandbox/sandboxClient'
import { ContBadge } from '@/components/shared/ContBadge'
import { type WorkOrder, type TripOrder } from '@/data/mockData'
import { Check, ChevronDown, CheckCircle2, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'

// ─── Full-screen picker modal ─────────────────────────────────────────────────
function PickModal<T extends { id: string }>({
  open,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  renderLabel,
}: {
  open: boolean
  title: string
  items: T[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
  renderLabel: (item: T) => React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'var(--theme-bg-primary)' }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{title}</p>
        <button onClick={onClose} className="text-xs font-medium px-3 py-1.5 rounded-lg touch-manipulation"
          style={{ color: 'var(--theme-brand-primary)' }}>
          Đóng
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>Không có dữ liệu</p>
        ) : items.map(item => {
          const isSelected = item.id === selectedId
          return (
            <button key={item.id}
              onClick={() => { onSelect(item.id); onClose() }}
              className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 touch-manipulation"
              style={{
                background: isSelected ? 'var(--theme-brand-primary-light)' : 'transparent',
                borderBottom: '1px solid var(--theme-border-light)',
              }}>
              <div className="flex-1 min-w-0">{renderLabel(item)}</div>
              {isSelected && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Comparison row: label + left value + right value + match indicator ───────
function CompareRow({ label, left, right, matched }: {
  label: string; left: string; right: string; matched?: boolean
}) {
  return (
    <div className="rounded-xl p-3" style={{
      background: matched ? 'var(--theme-status-success-light)' : 'var(--theme-bg-secondary)',
      border: matched ? '1px solid var(--theme-status-success)' : '1px solid var(--theme-border-default)',
    }}>
      <div className="flex items-center gap-1.5 mb-2">
        {matched && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />}
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{
          color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)',
        }}>{label}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
        {/* Left value */}
        <div className="min-w-0">
          <p className="text-[9px] font-medium" style={{ color: 'var(--theme-brand-primary)' }}>Đã chạy</p>
          <p className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>{left || '-'}</p>
        </div>
        {/* Divider */}
        <div className="flex items-center pt-2.5">
          <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }} />
        </div>
        {/* Right value */}
        <div className="min-w-0">
          <p className="text-[9px] font-medium" style={{ color: 'var(--theme-status-warning)' }}>Yêu cầu</p>
          <p className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>{right || '-'}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Container comparison row ─────────────────────────────────────────────────
function ContCompareRow({ left, right, matched }: {
  left: { type: string; number: string }[]
  right: { type: string; number: string }
  matched?: boolean
}) {
  return (
    <div className="rounded-xl p-3" style={{
      background: matched ? 'var(--theme-status-success-light)' : 'var(--theme-bg-secondary)',
      border: matched ? '1px solid var(--theme-status-success)' : '1px solid var(--theme-border-default)',
    }}>
      <div className="flex items-center gap-1.5 mb-2">
        {matched && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />}
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{
          color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)',
        }}>Container</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
        {/* Left: job containers */}
        <div className="min-w-0">
          <p className="text-[9px] font-medium" style={{ color: 'var(--theme-brand-primary)' }}>Đã chạy</p>
          {left.map((c, i) => (
            <div key={i} className="flex items-center gap-1 mt-0.5">
              <ContBadge type={c.type as TripOrder['workType']} />
              <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--theme-text-primary)' }}>{c.number}</span>
            </div>
          ))}
        </div>
        {/* Divider */}
        <div className="flex items-center pt-3">
          <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }} />
        </div>
        {/* Right: trip container */}
        <div className="min-w-0">
          <p className="text-[9px] font-medium" style={{ color: 'var(--theme-status-warning)' }}>Yêu cầu</p>
          <div className="flex items-center gap-1 mt-0.5">
            <ContBadge type={right.type as TripOrder['workType']} />
            <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--theme-text-primary)' }}>{right.number}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MatchJob({ jobId: initialJobId }: { jobId: string }) {
  const { goBack } = useAppStore()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [trips, setTrips] = useState<TripOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedJobId, setSelectedJobId] = useState(initialJobId)
  const [selectedTripId, setSelectedTripId] = useState('')

  const [pickMode, setPickMode] = useState<'job' | 'trip' | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getWorkOrders(), apiClient.getTripOrders()])
      .then(([w, t]) => {
        if (!cancelled) {
          if (w.success) setWorkOrders(w.data)
          if (t.success) setTrips(t.data)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatchedJobs = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])
  const draftTrips = useMemo(() => trips.filter(t => t.status === 'DRAFT'), [trips])

  const selectedJob = useMemo(() => workOrders.find(w => w.id === selectedJobId), [workOrders, selectedJobId])
  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId])

  const handleMatch = async () => {
    if (!selectedJob || !selectedTrip || submitting) return
    setSubmitting(true)
    try {
      await createTripOrder({
        tripDate: selectedTrip.tripDate,
        clientId: selectedTrip.clientId,
        clientName: selectedTrip.clientName,
        workType: selectedTrip.workType,
        route: selectedTrip.route,
        tractorPlate: selectedJob.tractorPlate,
        driverId: selectedJob.driverId,
        driverName: selectedJob.driverName,
        containerNumber: selectedTrip.containerNumber,
        pricingId: selectedTrip.pricingId,
        unitPrice: selectedTrip.unitPrice,
        driverSalary: selectedTrip.driverSalary,
        allowance: selectedTrip.allowance,
        revenue: selectedTrip.unitPrice,
        matchedWorkOrderIds: [selectedJobId],
      })
      goBack()
    } catch {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  // Match checks
  const contMatched = selectedJob && selectedTrip
    ? selectedJob.containers.some(c => c.workType === selectedTrip.workType && c.containerNumber === selectedTrip.containerNumber)
    : false
  const clientMatched = selectedJob && selectedTrip ? selectedJob.clientName === selectedTrip.clientName : false
  const routeMatched = selectedJob && selectedTrip ? selectedJob.route === selectedTrip.route : false
  const allMatched = contMatched && clientMatched && routeMatched
  const matchCount = [contMatched, clientMatched, routeMatched].filter(Boolean).length

  return (
    <>
      <div className="flex flex-col h-[calc(100dvh-56px)]">
        {/* ── TOP: Two selector buttons stacked ── */}
        <div className="px-4 pt-3 pb-2 space-y-2 shrink-0">
          {/* Chuyến đã chạy */}
          <button onClick={() => setPickMode('job')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-brand-primary)' }}>Chuyến đã chạy</p>
              {selectedJob ? (
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {selectedJob.containers.map(c => (
                    <ContBadge key={c.containerNumber} type={c.workType} />
                  ))}
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {selectedJob.containers.map(c => c.containerNumber).join(' · ')}
                  </span>
                </div>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến đã chạy</p>
              )}
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
          </button>

          {/* Chuyến yêu cầu */}
          <button onClick={() => setPickMode('trip')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-status-warning)' }}>Chuyến yêu cầu</p>
              {selectedTrip ? (
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <ContBadge type={selectedTrip.workType} />
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{selectedTrip.containerNumber}</span>
                </div>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến yêu cầu</p>
              )}
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        {/* ── MIDDLE: Row-by-row comparison (only when both selected) ── */}
        {selectedJob && selectedTrip ? (
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
            <ContCompareRow
              left={selectedJob.containers.map(c => ({ type: c.workType, number: c.containerNumber }))}
              right={{ type: selectedTrip.workType, number: selectedTrip.containerNumber }}
              matched={contMatched}
            />
            <CompareRow label="Khách hàng" left={selectedJob.clientName} right={selectedTrip.clientName} matched={clientMatched} />
            <CompareRow label="Cung đường" left={selectedJob.route} right={selectedTrip.route} matched={routeMatched} />

            {/* Match summary */}
            <div className="rounded-xl p-3 text-center" style={{
              background: allMatched ? 'var(--theme-status-success-light)' : 'var(--theme-bg-tertiary)',
            }}>
              <p className="text-xs font-bold" style={{
                color: allMatched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)',
              }}>
                {allMatched ? '✓ Khớp hoàn toàn' : `${matchCount}/3 trường hợp khớp`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>
              Chọn cả hai chuyến để so sánh
            </p>
          </div>
        )}

        {/* ── BOTTOM: Khớp button (sticky) ── */}
        {selectedJob && selectedTrip && (
          <div className="px-4 pb-4 pt-2 shrink-0" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
            <Button onClick={handleMatch} disabled={submitting}
              className="w-full h-12 font-bold rounded-xl text-sm"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              <Check className="w-4 h-4 mr-1.5" /> {submitting ? 'Đang khớp...' : 'Khớp chuyến'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Picker modals (full screen) ── */}
      <PickModal
        open={pickMode === 'job'}
        title="Chọn chuyến đã chạy"
        items={unmatchedJobs}
        selectedId={selectedJobId}
        onSelect={setSelectedJobId}
        onClose={() => setPickMode(null)}
        renderLabel={job => (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {job.containers.map(c => (
                <ContBadge key={c.containerNumber} type={c.workType} />
              ))}
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {job.containers.map(c => c.containerNumber).join(' · ')}
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>
              {job.driverName} · {job.clientName}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
              {job.route}
            </p>
          </div>
        )}
      />

      <PickModal
        open={pickMode === 'trip'}
        title="Chọn chuyến yêu cầu"
        items={draftTrips}
        selectedId={selectedTripId}
        onSelect={setSelectedTripId}
        onClose={() => setPickMode(null)}
        renderLabel={trip => (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <ContBadge type={trip.workType} />
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {trip.containerNumber}
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>
              {trip.clientName}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
              {trip.route}
            </p>
          </div>
        )}
      />
    </>
  )
}
