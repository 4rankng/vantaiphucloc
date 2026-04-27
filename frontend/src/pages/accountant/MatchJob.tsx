import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/hooks/use-app-store'
import { apiClient } from '@/services/api'
import { createTripOrder } from '@/services/sandbox/sandboxClient'
import { ContBadge } from '@/components/shared/ContBadge'
import { formatCurrencyFull, type WorkOrder, type TripOrder, type WorkType } from '@/data/mockData'
import { Building2, Route, Truck, Check, ChevronDown, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'

// ─── Compact field row ────────────────────────────────────────────────────────
function Field({ label, value, icon: Icon }: { label: string; value?: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icon && (
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--theme-bg-tertiary)' }}>
          <Icon className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
        <p className="text-xs font-medium leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{value || '-'}</p>
      </div>
    </div>
  )
}

// ─── Picker dropdown ──────────────────────────────────────────────────────────
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
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all touch-manipulation"
        style={{
          background: selected ? 'var(--theme-bg-secondary)' : 'var(--theme-bg-tertiary)',
          border: open ? '2px solid var(--theme-brand-primary)' : '1px solid var(--theme-border-default)',
        }}
      >
        {selected ? renderLabel(selected) : (
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{placeholder}</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden max-h-60 overflow-y-auto"
          style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
          {items.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--theme-text-muted)' }}>Không có dữ liệu</p>
          ) : items.map(item => (
            <button key={item.id}
              onClick={() => { onSelect(item.id); setOpen(false) }}
              className="w-full text-left px-3 py-2.5 transition-colors touch-manipulation"
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

  // Selections
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

  // Count matching fields for comparison
  const getMatchScore = () => {
    if (!selectedJob || !selectedTrip) return { matches: 0, total: 4 }
    let m = 0
    if (selectedJob.clientName === selectedTrip.clientName) m++
    if (selectedJob.route === selectedTrip.route) m++
    if (selectedJob.containers[0]?.workType === selectedTrip.workType) m++
    if (selectedJob.containers[0]?.containerNumber === selectedTrip.containerNumber) m++
    return { matches: m, total: 4 }
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
              <div className="flex items-center gap-1.5 min-w-0">
                <ContBadge type={job.containers[0]?.workType ?? 'E20'} />
                <span className="text-[11px] font-mono font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
                  {job.containers.map(c => c.containerNumber).join(' · ') || job.id}
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
              <div className="flex items-center gap-1.5 min-w-0">
                <ContBadge type={trip.workType} />
                <span className="text-[11px] font-mono font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
                  {trip.containerNumber}
                </span>
              </div>
            )}
          />
        </div>
      </div>

      {/* ── MIDDLE: Side-by-side comparison cards ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Left card: Chuyến đã chạy detail */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            <div className="px-3 py-1.5" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              <p className="text-[10px] font-bold">Đã chạy</p>
            </div>
            {selectedJob ? (
              <div className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {selectedJob.containers.map(c => (
                    <ContBadge key={c.containerNumber} type={c.workType} />
                  ))}
                </div>
                <div className="text-[11px] font-mono font-semibold mb-2" style={{ color: 'var(--theme-text-primary)' }}>
                  {selectedJob.containers.map(c => c.containerNumber).join(' · ')}
                </div>
                <div className="space-y-0" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
                  <Field icon={Truck} label="Biển số" value={selectedJob.tractorPlate} />
                  <Field icon={Building2} label="Khách hàng" value={selectedJob.clientName} />
                  <Field icon={Route} label="Cung đường" value={selectedJob.route} />
                  <Field icon={Wallet} label="Lương + Phụ cấp" value={`${formatCurrencyFull(selectedJob.driverSalary)} + ${formatCurrencyFull(selectedJob.allowance)}`} />
                </div>
              </div>
            ) : (
              <div className="px-3 py-6 text-center">
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến đã chạy</p>
              </div>
            )}
          </div>

          {/* Right card: Chuyến yêu cầu detail */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            <div className="px-3 py-1.5" style={{ background: 'var(--theme-status-warning-light)' }}>
              <p className="text-[10px] font-bold" style={{ color: 'var(--theme-status-warning)' }}>Yêu cầu</p>
            </div>
            {selectedTrip ? (
              <div className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ContBadge type={selectedTrip.workType} />
                </div>
                <div className="text-[11px] font-mono font-semibold mb-2" style={{ color: 'var(--theme-text-primary)' }}>
                  {selectedTrip.containerNumber}
                </div>
                <div className="space-y-0" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
                  {/* No tài xế — this is from khách hàng */}
                  <Field icon={Building2} label="Khách hàng" value={selectedTrip.clientName} />
                  <Field icon={Route} label="Cung đường" value={selectedTrip.route} />
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
              background: score.matches >= 3 ? 'var(--theme-status-success-light)' : score.matches >= 2 ? 'var(--theme-status-warning-light)' : 'var(--theme-bg-tertiary)',
            }}>
            <p className="text-[11px] font-semibold"
              style={{ color: score.matches >= 3 ? 'var(--theme-status-success)' : score.matches >= 2 ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)' }}>
              {score.matches >= 3 ? '✓ Khớp tốt' : score.matches >= 2 ? 'Khớp một phần' : 'Kiểm tra lại'}
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
