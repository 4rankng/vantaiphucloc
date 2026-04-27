import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/hooks/use-app-store'
import { apiClient } from '@/services/api'
import { createTripOrder } from '@/services/sandbox/sandboxClient'
import { ContBadge } from '@/components/shared/ContBadge'
import { formatCurrencyFull, type WorkOrder, type TripOrder } from '@/data/mockData'
import { Building2, Route, Check, ChevronDown, Wallet, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'

// ─── Compact field row with optional match tick ───────────────────────────────
function Field({ label, value, icon: Icon, matched }: {
  label: string; value?: string; icon?: React.ElementType; matched?: boolean
}) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {matched ? (
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-success)' }} />
      ) : Icon ? (
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--theme-bg-tertiary)' }}>
          <Icon className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
        <p className="text-xs leading-tight" style={{
          color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-primary)',
          fontWeight: matched ? 600 : 500,
        }}>{value || '-'}</p>
      </div>
    </div>
  )
}

// ─── Container row (type + number as one unit, with match tick) ───────────────
function ContRow({ type, number, matched }: { type: string; number: string; matched?: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {matched ? (
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-success)' }} />
      ) : (
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--theme-bg-tertiary)' }}>
          <span className="text-[8px] font-bold" style={{ color: 'var(--theme-text-muted)' }}>□</span>
        </div>
      )}
      <div className="min-w-0 flex-1 flex items-center gap-1.5">
        <ContBadge type={type as TripOrder['workType']} />
        <span className="text-xs font-mono font-medium" style={{
          color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-primary)',
          fontWeight: matched ? 600 : 500,
        }}>{number || '-'}</span>
      </div>
    </div>
  )
}

// ─── Picker dropdown (full width overlay, no truncation) ──────────────────────
function Picker<T extends { id: string }>({
  items,
  selectedId,
  onSelect,
  placeholder,
  renderLabel,
}: {
  items: T[]
  selectedId: string
  onSelect: (id: string) => void
  placeholder: string
  renderLabel: (item: T) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const selected = items.find(i => i.id === selectedId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-all touch-manipulation"
        style={{
          background: selected ? 'var(--theme-bg-secondary)' : 'var(--theme-bg-tertiary)',
          border: open ? '2px solid var(--theme-brand-primary)' : '1px solid var(--theme-border-default)',
        }}
      >
        <span className="min-w-0 flex-1 text-left" style={{ overflow: 'visible' }}>
          {selected ? renderLabel(selected) : (
            <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{placeholder}</span>
          )}
        </span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
      </button>

      {open && (
        <div
          className="fixed z-[100] rounded-xl overflow-hidden max-h-[50dvh] overflow-y-auto"
          style={{
            background: 'var(--theme-bg-secondary)',
            boxShadow: 'var(--theme-shadow-card)',
            border: '1px solid var(--theme-border-default)',
            // Position below the trigger but extend beyond parent grid
            left: 'max(8px, 50vw - 45vw)',
            right: 'max(8px, 50vw - 45vw)',
            top: 'auto',
            width: '90vw',
            maxWidth: '500px',
          }}
        >
          {items.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--theme-text-muted)' }}>Không có dữ liệu</p>
          ) : items.map(item => (
            <button key={item.id}
              onClick={() => { onSelect(item.id); setOpen(false) }}
              className="w-full text-left px-4 py-3 transition-colors touch-manipulation"
              style={{
                background: item.id === selectedId ? 'var(--theme-brand-primary-light)' : 'transparent',
                borderBottom: '1px solid var(--theme-border-light)',
              }}>
              {renderLabel(item)}
            </button>
          ))}
        </div>
      )}
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

  // Match score: cont sets + khách hàng + cung đường
  const getMatchScore = () => {
    if (!selectedJob || !selectedTrip) return { matches: 0, total: 0 }
    let m = 0
    let total = 0
    // Container sets: each (type + number) pair from job compared to trip's single container
    // Job can have multiple containers, trip has one — count how many job containers match trip
    const jobConts = selectedJob.containers
    const tripCont = { type: selectedTrip.workType, number: selectedTrip.containerNumber }
    // Check if trip's container matches any job container
    total += Math.max(jobConts.length, 1) // count container sets
    const contMatch = jobConts.some(c => c.workType === tripCont.type && c.containerNumber === tripCont.number)
    if (contMatch) m += 1
    // Khách hàng
    total += 1
    if (selectedJob.clientName === selectedTrip.clientName) m += 1
    // Cung đường
    total += 1
    if (selectedJob.route === selectedTrip.route) m += 1
    return { matches: m, total }
  }

  // Check if a specific container from job matches trip
  const contMatched = (type: string, number: string) => {
    if (!selectedTrip) return false
    return type === selectedTrip.workType && number === selectedTrip.containerNumber
  }

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

  const score = getMatchScore()

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)]">
      {/* ── TOP: Two pickers side by side ── */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3 pb-2 shrink-0">
        {/* Left: Chuyến đã chạy */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5 px-0.5" style={{ color: 'var(--theme-brand-primary)' }}>
            Chuyến đã chạy
          </p>
          <Picker
            items={unmatchedJobs}
            selectedId={selectedJobId}
            onSelect={setSelectedJobId}
            placeholder="Chọn chuyến"
            renderLabel={job => (
              <div className="flex flex-wrap items-center gap-1.5">
                {job.containers.map(c => (
                  <ContBadge key={c.containerNumber} type={c.workType} />
                ))}
                <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  {job.containers.map(c => c.containerNumber).join(' · ')}
                </span>
              </div>
            )}
          />
        </div>

        {/* Right: Chuyến yêu cầu */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5 px-0.5" style={{ color: 'var(--theme-status-warning)' }}>
            Chuyến yêu cầu
          </p>
          <Picker
            items={draftTrips}
            selectedId={selectedTripId}
            onSelect={setSelectedTripId}
            placeholder="Chọn chuyến"
            renderLabel={trip => (
              <div className="flex flex-wrap items-center gap-1.5">
                <ContBadge type={trip.workType} />
                <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  {trip.containerNumber}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
                  — {trip.clientName}
                </span>
              </div>
            )}
          />
        </div>
      </div>

      {/* ── MIDDLE: Side-by-side comparison cards ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Left card: Chuyến đã chạy */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            <div className="px-3 py-1.5" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              <p className="text-[10px] font-bold">Đã chạy</p>
            </div>
            {selectedJob ? (
              <div className="px-3 py-2">
                <div className="space-y-0" style={{ borderBottom: '1px solid var(--theme-border-light)', paddingBottom: 4, marginBottom: 4 }}>
                  {selectedJob.containers.map(c => (
                    <ContRow key={c.containerNumber} type={c.workType} number={c.containerNumber}
                      matched={selectedTrip && contMatched(c.workType, c.containerNumber)} />
                  ))}
                </div>
                <div className="space-y-0">
                  <Field icon={Building2} label="Khách hàng" value={selectedJob.clientName}
                    matched={selectedTrip && selectedJob.clientName === selectedTrip.clientName} />
                  <Field icon={Route} label="Cung đường" value={selectedJob.route}
                    matched={selectedTrip && selectedJob.route === selectedTrip.route} />
                  <Field icon={Wallet} label="Lương + Phụ cấp" value={`${formatCurrencyFull(selectedJob.driverSalary)} + ${formatCurrencyFull(selectedJob.allowance)}`} />
                </div>
              </div>
            ) : (
              <div className="px-3 py-6 text-center">
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến đã chạy</p>
              </div>
            )}
          </div>

          {/* Right card: Chuyến yêu cầu */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            <div className="px-3 py-1.5" style={{ background: 'var(--theme-status-warning-light)' }}>
              <p className="text-[10px] font-bold" style={{ color: 'var(--theme-status-warning)' }}>Yêu cầu</p>
            </div>
            {selectedTrip ? (
              <div className="px-3 py-2">
                <div className="space-y-0" style={{ borderBottom: '1px solid var(--theme-border-light)', paddingBottom: 4, marginBottom: 4 }}>
                  <ContRow type={selectedTrip.workType} number={selectedTrip.containerNumber}
                    matched={selectedJob && selectedJob.containers.some(c => c.workType === selectedTrip.workType && c.containerNumber === selectedTrip.containerNumber)} />
                </div>
                <div className="space-y-0">
                  <Field icon={Building2} label="Khách hàng" value={selectedTrip.clientName}
                    matched={selectedJob && selectedTrip.clientName === selectedJob.clientName} />
                  <Field icon={Route} label="Cung đường" value={selectedTrip.route}
                    matched={selectedJob && selectedTrip.route === selectedJob.route} />
                  <Field icon={Wallet} label="Lương + Phụ cấp" value={`${formatCurrencyFull(selectedTrip.driverSalary)} + ${formatCurrencyFull(selectedTrip.allowance)}`} />
                </div>
              </div>
            ) : (
              <div className="px-3 py-6 text-center">
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến yêu cầu</p>
              </div>
            )}
          </div>
        </div>

        {/* Match score hint */}
        {selectedJob && selectedTrip && (
          <div className="mt-3 rounded-xl p-2.5 text-center"
            style={{
              background: score.matches === score.total ? 'var(--theme-status-success-light)' : score.matches > 0 ? 'var(--theme-status-warning-light)' : 'var(--theme-bg-tertiary)',
            }}>
            <p className="text-[11px] font-semibold"
              style={{ color: score.matches === score.total ? 'var(--theme-status-success)' : score.matches > 0 ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)' }}>
              {score.matches === score.total ? '✓ Khớp hoàn toàn' : score.matches > 0 ? 'Khớp một phần' : 'Kiểm tra lại'}
              {' '}({score.matches}/{score.total})
            </p>
          </div>
        )}
      </div>

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
  )
}
