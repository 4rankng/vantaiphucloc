import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/hooks/use-app-store'
import { apiClient } from '@/services/api'
import { ContBadge } from '@/components/shared/ContBadge'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { WORK_TYPES, type WorkOrder, type TripOrder, type WorkType, type Client, type RoutePrice } from '@/data/domain'
import { Check, ChevronDown, CheckCircle2, ArrowLeftRight, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'

// ─── Full-screen picker modal ─────────────────────────────────────────────────
function PickModal<T extends { id: string }>({
  open, title, items, selectedId, onSelect, onClose, renderLabel,
}: {
  open: boolean; title: string; items: T[]; selectedId: string
  onSelect: (id: string) => void; onClose: () => void
  renderLabel: (item: T) => React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'var(--theme-bg-primary)' }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{title}</p>
        <button onClick={onClose} className="text-xs font-medium px-3 py-1.5 rounded-lg touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>Đóng</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>Không có dữ liệu</p>
        ) : items.map(item => {
          const isSelected = item.id === selectedId
          return (
            <button key={item.id} onClick={() => { onSelect(item.id); onClose() }}
              className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 touch-manipulation"
              style={{ background: isSelected ? 'var(--theme-brand-primary-light)' : 'transparent', borderBottom: '1px solid var(--theme-border-light)' }}>
              <div className="flex-1 min-w-0">{renderLabel(item)}</div>
              {isSelected && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Full-screen edit dialog ──────────────────────────────────────────────────
function EditDialog({ open, title, color, onClose, children }: {
  open: boolean; title: string; color: string; onClose: () => void; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'var(--theme-bg-primary)' }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
        <p className="text-sm font-bold" style={{ color }}>{title}</p>
        <button onClick={onClose} className="text-xs font-medium px-3 py-1.5 rounded-lg touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>
          Xong
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {children}
      </div>
    </div>
  )
}

// ─── Read-only comparison row (tappable left/right) ───────────────────────────
function CompareRow({ label, left, right, matched, onTapLeft, onTapRight }: {
  label: string; left: string; right: string; matched?: boolean
  onTapLeft?: () => void; onTapRight?: () => void
}) {
  return (
    <div className="rounded-xl p-3" style={{
      background: matched ? 'var(--theme-status-success-light)' : 'var(--theme-bg-secondary)',
      border: matched ? '1px solid var(--theme-status-success)' : '1px solid var(--theme-border-default)',
    }}>
      <div className="flex items-center gap-1.5 mb-2">
        {matched && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />}
        <p className="text-xs font-bold uppercase tracking-wide" style={{
          color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)',
        }}>{label}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <button onClick={onTapLeft} className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 transition-colors touch-manipulation active:opacity-70" style={{ background: 'transparent' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--theme-status-warning)' }}>Yêu cầu</p>
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{left || '-'}</p>
          </div>
        </button>
        <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" style={{ color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }} />
        <button onClick={onTapRight} className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 transition-colors touch-manipulation active:opacity-70" style={{ background: 'transparent' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--theme-brand-primary)' }}>Đã chạy</p>
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{right || '-'}</p>
          </div>
        </button>
      </div>
    </div>
  )
}

// ─── Container comparison row (tappable) ──────────────────────────────────────
function ContCompareRow({ left, right, matched, onTapLeft, onTapRight }: {
  left: { type: string; number: string }
  right: { type: string; number: string }[]
  matched?: boolean
  onTapLeft?: () => void; onTapRight?: () => void
}) {
  return (
    <div className="rounded-xl p-3" style={{
      background: matched ? 'var(--theme-status-success-light)' : 'var(--theme-bg-secondary)',
      border: matched ? '1px solid var(--theme-status-success)' : '1px solid var(--theme-border-default)',
    }}>
      <div className="flex items-center gap-1.5 mb-2">
        {matched && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />}
        <p className="text-xs font-bold uppercase tracking-wide" style={{
          color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)',
        }}>Container</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
        <button onClick={onTapLeft} className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 touch-manipulation active:opacity-70">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--theme-status-warning)' }}>Yêu cầu</p>
          <div className="flex items-center gap-1">
            <ContBadge type={left.type as TripOrder['workType']} />
            <span className="text-sm font-mono font-medium" style={{ color: 'var(--theme-text-primary)' }}>{left.number}</span>
          </div>
        </button>
        <div className="flex items-center pt-3">
          <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }} />
        </div>
        <button onClick={onTapRight} className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 touch-manipulation active:opacity-70">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--theme-brand-primary)' }}>Đã chạy</p>
          {right.map((c, i) => (
            <div key={i} className="flex items-center gap-1 mb-0.5">
              <ContBadge type={c.type as TripOrder['workType']} />
              <span className="text-sm font-mono font-medium" style={{ color: 'var(--theme-text-primary)' }}>{c.number}</span>
            </div>
          ))}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MatchTrip({ tripId: initialTripId }: { tripId: string }) {
  const { goBack } = useAppStore()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [trips, setTrips] = useState<TripOrder[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [routes, setRoutes] = useState<RoutePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedTripId, setSelectedTripId] = useState(initialTripId)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [pickMode, setPickMode] = useState<'trip' | 'job' | null>(null)

  // Edit dialog
  const [editDialog, setEditDialog] = useState<'cont-left' | 'cont-right' | 'client-left' | 'client-right' | 'route-left' | 'route-right' | null>(null)

  // Local editable copies
  const [editedTrip, setEditedTrip] = useState<{ clientName: string; route: string; contType: string; contNumber: string } | null>(null)
  const [editedJob, setEditedJob] = useState<{ clientName: string; route: string; containers: { type: string; number: string }[] } | null>(null)

  // Dialog-local state for container editing
  const [dialogContLeft, setDialogContLeft] = useState<{ type: string; number: string }>({ type: 'E20', number: '' })
  const [dialogContainers, setDialogContainers] = useState<{ type: string; number: string }[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getWorkOrders(), apiClient.getTripOrders(), apiClient.getClients(), apiClient.getRoutes()])
      .then(([w, t, c, r]) => {
        if (!cancelled) {
          if (w.success) setWorkOrders(w.data)
          if (t.success) setTrips(t.data)
          if (c.success) setClients(c.data)
          if (r.success) setRoutes(r.data)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatchedJobs = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])
  const draftTrips = useMemo(() => trips.filter(t => t.status === 'DRAFT'), [trips])

  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId])
  const selectedJob = useMemo(() => workOrders.find(w => w.id === selectedJobId), [workOrders, selectedJobId])

  // Init edited copies
  useEffect(() => {
    if (selectedTrip) {
      setEditedTrip({ clientName: selectedTrip.clientName, route: selectedTrip.route, contType: selectedTrip.workType, contNumber: selectedTrip.containerNumber })
    } else setEditedTrip(null)
  }, [selectedTrip])

  useEffect(() => {
    if (selectedJob) {
      setEditedJob({
        clientName: selectedJob.clientName,
        route: selectedJob.route,
        containers: selectedJob.containers.map(c => ({ type: c.workType, number: c.containerNumber })),
      })
    } else setEditedJob(null)
  }, [selectedJob])

  // Client/route options for SheetPicker
  const clientOptions = useMemo(() => clients.map(c => ({ value: c.name, label: c.name })), [clients])
  const routeOptions = useMemo(() => routes.map(r => ({ value: r.route, label: r.route })), [routes])

  // Open edit dialog with current values
  const openEdit = (mode: typeof editDialog) => {
    if (!mode) return
    if (mode === 'cont-left' && editedTrip) setDialogContLeft({ type: editedTrip.contType, number: editedTrip.contNumber })
    if (mode === 'cont-right' && editedJob) setDialogContainers([...editedJob.containers])
    setEditDialog(mode)
  }

  const saveDialog = () => {
    if (!editDialog) return
    if (editDialog === 'cont-left' && editedTrip) setEditedTrip({ ...editedTrip, contType: dialogContLeft.type, contNumber: dialogContLeft.number })
    if (editDialog === 'cont-right' && editedJob) setEditedJob({ ...editedJob, containers: [...dialogContainers] })
    setEditDialog(null)
  }

  // Validation
  const tripClient = editedTrip?.clientName ?? ''
  const jobClient = editedJob?.clientName ?? ''
  const tripRoute = editedTrip?.route ?? ''
  const jobRoute = editedJob?.route ?? ''
  const tripCont = editedTrip ? { type: editedTrip.contType, number: editedTrip.contNumber } : null
  const jobConts = editedJob?.containers ?? []

  const contMatched = tripCont ? jobConts.some(c => c.type === tripCont.type && c.number === tripCont.number) : false
  const clientMatched = jobClient === tripClient && jobClient !== ''
  const routeMatched = jobRoute === tripRoute && jobRoute !== ''
  const allMatched = contMatched && clientMatched && routeMatched
  const matchCount = [contMatched, clientMatched, routeMatched].filter(Boolean).length

  const handleMatch = async () => {
    if (!selectedTrip || !selectedJob || !editedTrip || !editedJob || submitting) return
    setSubmitting(true)
    try {
      await apiClient.updateTripOrder(selectedTripId, {
        clientName: editedTrip.clientName,
        route: editedTrip.route,
        workType: editedTrip.contType as WorkType,
        containerNumber: editedTrip.contNumber,
      })
      await apiClient.updateWorkOrder(selectedJobId, {
        clientName: editedJob.clientName,
        route: editedJob.route,
        containers: editedJob.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType, photoUrl: '' })),
      })
      await apiClient.createTripOrder({
        tripDate: selectedTrip.tripDate,
        clientId: selectedTrip.clientId,
        clientName: editedTrip.clientName,
        workType: editedTrip.contType as WorkType,
        route: editedTrip.route,
        tractorPlate: selectedJob.tractorPlate,
        driverId: selectedJob.driverId,
        driverName: selectedJob.driverName,
        containerNumber: editedTrip.contNumber,
        pricingId: selectedTrip.pricingId,
        unitPrice: selectedTrip.unitPrice,
        driverSalary: selectedTrip.driverSalary,
        allowance: selectedTrip.allowance,
        revenue: selectedTrip.unitPrice,
        matchedWorkOrderIds: [selectedJobId],
      })
      goBack()
    } catch { setSubmitting(false) }
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100dvh-56px)]">
        {/* ── TOP: Selector buttons ── */}
        <div className="px-4 pt-3 pb-2 space-y-2 shrink-0">
          <button onClick={() => setPickMode('trip')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-status-warning)' }}>Chuyến yêu cầu</p>
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

          <button onClick={() => setPickMode('job')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-brand-primary)' }}>Chuyến đã chạy</p>
              {selectedJob ? (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {selectedJob.containers.map(c => (
                    <span key={c.containerNumber} className="flex items-center gap-1">
                      <ContBadge type={c.workType} />
                      <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến đã chạy</p>
              )}
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        {/* ── MIDDLE: Comparison rows (tappable) ── */}
        {selectedTrip && selectedJob && editedTrip && editedJob ? (
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
            <ContCompareRow
              left={tripCont!} right={jobConts} matched={contMatched}
              onTapLeft={() => openEdit('cont-left')}
              onTapRight={() => openEdit('cont-right')}
            />
            <CompareRow label="Khách hàng" left={tripClient} right={jobClient} matched={clientMatched}
              onTapLeft={() => openEdit('client-left')}
              onTapRight={() => openEdit('client-right')}
            />
            <CompareRow label="Cung đường" left={tripRoute} right={jobRoute} matched={routeMatched}
              onTapLeft={() => openEdit('route-left')}
              onTapRight={() => openEdit('route-right')}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>Chọn cả hai chuyến để so sánh</p>
          </div>
        )}

        {/* ── BOTTOM ── */}
        {selectedTrip && selectedJob && (
          <div className="px-4 pb-4 pt-2 shrink-0" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
            <Button onClick={handleMatch} disabled={submitting}
              className="w-full h-12 font-bold rounded-xl text-sm"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              <Check className="w-4 h-4 mr-1.5" /> {submitting ? 'Đang khớp...' : 'Khớp chuyến'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Picker modals ── */}
      <PickModal open={pickMode === 'trip'} title="Chọn chuyến yêu cầu"
        items={draftTrips} selectedId={selectedTripId} onSelect={setSelectedTripId} onClose={() => setPickMode(null)}
        renderLabel={trip => (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <ContBadge type={trip.workType} />
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{trip.containerNumber}</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{trip.clientName}</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{trip.route}</p>
          </div>
        )}
      />
      <PickModal open={pickMode === 'job'} title="Chọn chuyến đã chạy"
        items={unmatchedJobs} selectedId={selectedJobId} onSelect={setSelectedJobId} onClose={() => setPickMode(null)}
        renderLabel={job => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {job.containers.map(c => (
                <span key={c.containerNumber} className="flex items-center gap-1">
                  <ContBadge type={c.workType} />
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                </span>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{job.driverName} · {job.clientName}</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.route}</p>
          </div>
        )}
      />

      {/* ── Edit dialogs ── */}
      {/* Container - left (yêu cầu / trip) */}
      <EditDialog open={editDialog === 'cont-left'} title="Sửa container · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        <div className="rounded-xl p-3 space-y-3"
          style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại công</Label>
            <div className="flex flex-wrap gap-1.5">
              {WORK_TYPES.map(w => (
                <button key={w} onClick={() => setDialogContLeft(prev => ({ ...prev, type: w }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold touch-manipulation"
                  style={{ background: dialogContLeft.type === w ? 'var(--theme-status-warning)' : 'var(--theme-bg-tertiary)', color: dialogContLeft.type === w ? '#fff' : 'var(--theme-text-primary)' }}>
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Số cont</Label>
            <Input value={dialogContLeft.number} onChange={e => setDialogContLeft(prev => ({ ...prev, number: e.target.value }))}
              className="text-sm font-mono h-10" autoFocus />
          </div>
        </div>
      </EditDialog>

      {/* Container - right (đã chạy / work order) */}
      <EditDialog open={editDialog === 'cont-right'} title="Sửa container · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        {dialogContainers.map((c, i) => (
          <div key={i} className="rounded-xl p-3 space-y-3"
            style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Container {i + 1}</span>
              {dialogContainers.length > 1 && (
                <button onClick={() => setDialogContainers(prev => prev.filter((_, j) => j !== i))}
                  className="touch-manipulation" style={{ color: 'var(--theme-status-error)' }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại công</Label>
              <div className="flex flex-wrap gap-1.5">
                {WORK_TYPES.map(w => (
                  <button key={w} onClick={() => setDialogContainers(prev => prev.map((c2, j) => j === i ? { ...c2, type: w } : c2))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold touch-manipulation"
                    style={{ background: c.type === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: c.type === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Số cont</Label>
              <Input value={c.number} onChange={e => setDialogContainers(prev => prev.map((c2, j) => j === i ? { ...c2, number: e.target.value } : c2))}
                className="text-sm font-mono h-10" autoFocus />
            </div>
          </div>
        ))}
        <button onClick={() => setDialogContainers(prev => [...prev, { type: 'E20', number: '' }])}
          className="w-full py-2.5 rounded-xl text-xs font-medium touch-manipulation"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)', border: '1px dashed var(--theme-border-default)' }}>
          + Thêm container
        </button>
      </EditDialog>

      {/* Khách hàng - left (yêu cầu / trip) */}
      <EditDialog open={editDialog === 'client-left'} title="Sửa khách hàng · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <InlineSelect
            placeholder="Chọn khách hàng..."
            value={editedTrip?.clientName ?? ''}
            options={clientOptions}
            onChange={v => setEditedTrip(prev => prev ? { ...prev, clientName: v } : null)}
          />
        </div>
      </EditDialog>

      {/* Khách hàng - right (đã chạy / job) */}
      <EditDialog open={editDialog === 'client-right'} title="Sửa khách hàng · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <InlineSelect
            placeholder="Chọn khách hàng..."
            value={editedJob?.clientName ?? ''}
            options={clientOptions}
            onChange={v => setEditedJob(prev => prev ? { ...prev, clientName: v } : null)}
          />
        </div>
      </EditDialog>

      {/* Cung đường - left (yêu cầu / trip) */}
      <EditDialog open={editDialog === 'route-left'} title="Sửa cung đường · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <InlineSelect
            placeholder="Chọn cung đường..."
            value={editedTrip?.route ?? ''}
            options={routeOptions}
            onChange={v => setEditedTrip(prev => prev ? { ...prev, route: v } : null)}
          />
        </div>
      </EditDialog>

      {/* Cung đường - right (đã chạy / job) */}
      <EditDialog open={editDialog === 'route-right'} title="Sửa cung đường · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <InlineSelect
            placeholder="Chọn cung đường..."
            value={editedJob?.route ?? ''}
            options={routeOptions}
            onChange={v => setEditedJob(prev => prev ? { ...prev, route: v } : null)}
          />
        </div>
      </EditDialog>
    </>
  )
}
