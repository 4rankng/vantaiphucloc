import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/hooks/use-app-store'
import { apiClient } from '@/services/api'
import { updateWorkOrder } from '@/services/sandbox/sandboxClient'
import { createTripOrder } from '@/services/sandbox/sandboxClient'
import { updateTripOrder } from '@/services/sandbox/sandboxClient'
import { ContBadge } from '@/components/shared/ContBadge'
import { WORK_TYPES, type WorkOrder, type TripOrder, type WorkType } from '@/data/mockData'
import { Check, ChevronDown, CheckCircle2, ArrowLeftRight, X } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'

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

// ─── Editable comparison row ──────────────────────────────────────────────────
function EditableRow({ label, left, right, matched, side, onEditLeft, onEditRight }: {
  label: string
  left: string; right: string
  matched?: boolean
  /** Which side is currently being edited */
  side: 'left' | 'right' | null
  onEditLeft: (val: string) => void
  onEditRight: (val: string) => void
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
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        {/* Left */}
        <div className="min-w-0">
          <p className="text-[9px] font-medium mb-0.5" style={{ color: 'var(--theme-brand-primary)' }}>Đã chạy</p>
          {side === 'left' ? (
            <Input value={left} onChange={e => onEditLeft(e.target.value)} className="text-xs h-8" autoFocus />
          ) : (
            <p className="text-xs font-medium cursor-pointer rounded px-1 -mx-1 hover:opacity-80" style={{ color: 'var(--theme-text-primary)' }}>{left || '-'}</p>
          )}
        </div>
        <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" style={{ color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }} />
        {/* Right */}
        <div className="min-w-0">
          <p className="text-[9px] font-medium mb-0.5" style={{ color: 'var(--theme-status-warning)' }}>Yêu cầu</p>
          {side === 'right' ? (
            <Input value={right} onChange={e => onEditRight(e.target.value)} className="text-xs h-8" autoFocus />
          ) : (
            <p className="text-xs font-medium cursor-pointer rounded px-1 -mx-1 hover:opacity-80" style={{ color: 'var(--theme-text-primary)' }}>{right || '-'}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Editable container row ───────────────────────────────────────────────────
function EditableContRow({ left, right, matched, editSide, onEditLeft, onEditRight }: {
  left: { type: string; number: string }[]
  right: { type: string; number: string }
  matched?: boolean
  editSide: 'left' | 'right' | null
  onEditLeft: (containers: { type: string; number: string }[]) => void
  onEditRight: (cont: { type: string; number: string }) => void
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
          <p className="text-[9px] font-medium mb-1" style={{ color: 'var(--theme-brand-primary)' }}>Đã chạy</p>
          {left.map((c, i) => (
            <div key={i} className="flex items-center gap-1 mb-1">
              {editSide === 'left' ? (
                <>
                  <div className="flex gap-0.5">
                    {WORK_TYPES.map(w => (
                      <button key={w} onClick={() => {
                        const updated = [...left]; updated[i] = { ...updated[i], type: w }; onEditLeft(updated)
                      }} className="px-1 py-0.5 rounded text-[8px] font-bold touch-manipulation"
                        style={{ background: c.type === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: c.type === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                        {w}
                      </button>
                    ))}
                  </div>
                  <Input value={c.number} onChange={e => {
                    const updated = [...left]; updated[i] = { ...updated[i], number: e.target.value }; onEditLeft(updated)
                  }} className="text-[10px] font-mono h-6 flex-1" />
                </>
              ) : (
                <>
                  <ContBadge type={c.type as TripOrder['workType']} />
                  <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--theme-text-primary)' }}>{c.number}</span>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center pt-3">
          <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }} />
        </div>
        {/* Right: trip container */}
        <div className="min-w-0">
          <p className="text-[9px] font-medium mb-1" style={{ color: 'var(--theme-status-warning)' }}>Yêu cầu</p>
          {editSide === 'right' ? (
            <div>
              <div className="flex gap-0.5 mb-1">
                {WORK_TYPES.map(w => (
                  <button key={w} onClick={() => onEditRight({ ...right, type: w })}
                    className="px-1 py-0.5 rounded text-[8px] font-bold touch-manipulation"
                    style={{ background: right.type === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: right.type === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                    {w}
                  </button>
                ))}
              </div>
              <Input value={right.number} onChange={e => onEditRight({ ...right, number: e.target.value })} className="text-[10px] font-mono h-6" />
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <ContBadge type={right.type as TripOrder['workType']} />
              <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--theme-text-primary)' }}>{right.number}</span>
            </div>
          )}
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

  // Edit state: local overrides for comparison
  const [editField, setEditField] = useState<string | null>(null) // 'cont' | 'client' | 'route'
  const [editSide, setEditSide] = useState<'left' | 'right' | null>(null)

  // Local editable copies
  const [editedJob, setEditedJob] = useState<{ clientName: string; route: string; containers: { type: string; number: string }[] } | null>(null)
  const [editedTrip, setEditedTrip] = useState<{ clientName: string; route: string; contType: string; contNumber: string } | null>(null)

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

  // Initialize edited copies when selection changes
  useEffect(() => {
    if (selectedJob) {
      setEditedJob({
        clientName: selectedJob.clientName,
        route: selectedJob.route,
        containers: selectedJob.containers.map(c => ({ type: c.workType, number: c.containerNumber })),
      })
    } else {
      setEditedJob(null)
    }
  }, [selectedJob])

  useEffect(() => {
    if (selectedTrip) {
      setEditedTrip({
        clientName: selectedTrip.clientName,
        route: selectedTrip.route,
        contType: selectedTrip.workType,
        contNumber: selectedTrip.containerNumber,
      })
    } else {
      setEditedTrip(null)
    }
  }, [selectedTrip])

  // Reset edit mode when selection changes
  useEffect(() => { setEditField(null); setEditSide(null) }, [selectedJobId, selectedTripId])

  // Validation on edited values
  const jobClient = editedJob?.clientName ?? ''
  const tripClient = editedTrip?.clientName ?? ''
  const jobRoute = editedJob?.route ?? ''
  const tripRoute = editedTrip?.route ?? ''
  const jobConts = editedJob?.containers ?? []
  const tripCont = editedTrip ? { type: editedTrip.contType, number: editedTrip.contNumber } : null

  const contMatched = tripCont ? jobConts.some(c => c.type === tripCont.type && c.number === tripCont.number) : false
  const clientMatched = jobClient === tripClient && jobClient !== ''
  const routeMatched = jobRoute === tripRoute && jobRoute !== ''
  const allMatched = contMatched && clientMatched && routeMatched
  const matchCount = [contMatched, clientMatched, routeMatched].filter(Boolean).length

  const startEdit = (field: string, side: 'left' | 'right') => {
    setEditField(field)
    setEditSide(side)
  }

  const handleMatch = async () => {
    if (!selectedJob || !selectedTrip || !editedJob || !editedTrip || submitting) return
    setSubmitting(true)
    try {
      // Save edits to work order
      await updateWorkOrder(selectedJobId, {
        clientName: editedJob.clientName,
        route: editedJob.route,
        containers: editedJob.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType, photoUrl: '' })),
      })
      // Save edits to trip
      await updateTripOrder(selectedTripId, {
        clientName: editedTrip.clientName,
        route: editedTrip.route,
        workType: editedTrip.contType as WorkType,
        containerNumber: editedTrip.contNumber,
      })
      // Create matched trip
      await createTripOrder({
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
    } catch {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100dvh-56px)]">
        {/* ── TOP: Two selector buttons ── */}
        <div className="px-4 pt-3 pb-2 space-y-2 shrink-0">
          <button onClick={() => setPickMode('job')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--theme-brand-primary)' }}>Chuyến đã chạy</p>
              {selectedJob ? (
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {selectedJob.containers.map(c => <ContBadge key={c.containerNumber} type={c.workType} />)}
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

        {/* ── MIDDLE: Row-by-row comparison with inline edit ── */}
        {selectedJob && selectedTrip && editedJob && editedTrip ? (
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
            {/* Container row */}
            <div onClick={() => startEdit('cont', editField === 'cont' && editSide === 'left' ? 'right' : editField === 'cont' && editSide === 'right' ? null : 'left')}>
              <EditableContRow
                left={jobConts}
                right={tripCont!}
                matched={contMatched}
                editSide={editField === 'cont' ? editSide : null}
                onEditLeft={containers => setEditedJob(prev => prev ? { ...prev, containers } : null)}
                onEditRight={cont => setEditedTrip(prev => prev ? { ...prev, contType: cont.type, contNumber: cont.number } : null)}
              />
            </div>

            {/* Khách hàng row */}
            <div onClick={() => startEdit('client', editField === 'client' && editSide === 'left' ? 'right' : editField === 'client' && editSide === 'right' ? null : 'left')}>
              <EditableRow
                label="Khách hàng"
                left={jobClient} right={tripClient}
                matched={clientMatched}
                side={editField === 'client' ? editSide : null}
                onEditLeft={val => setEditedJob(prev => prev ? { ...prev, clientName: val } : null)}
                onEditRight={val => setEditedTrip(prev => prev ? { ...prev, clientName: val } : null)}
              />
            </div>

            {/* Cung đường row */}
            <div onClick={() => startEdit('route', editField === 'route' && editSide === 'left' ? 'right' : editField === 'route' && editSide === 'right' ? null : 'left')}>
              <EditableRow
                label="Cung đường"
                left={jobRoute} right={tripRoute}
                matched={routeMatched}
                side={editField === 'route' ? editSide : null}
                onEditLeft={val => setEditedJob(prev => prev ? { ...prev, route: val } : null)}
                onEditRight={val => setEditedTrip(prev => prev ? { ...prev, route: val } : null)}
              />
            </div>

            {/* Edit hint */}
            {editField && (
              <p className="text-[10px] text-center" style={{ color: 'var(--theme-text-muted)' }}>
                Chạm vào hàng để chỉnh sửa · Chạm bên kia để đổi sang
              </p>
            )}

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
            <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>Chọn cả hai chuyến để so sánh</p>
          </div>
        )}

        {/* ── BOTTOM: Khớp button ── */}
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

      {/* ── Picker modals ── */}
      <PickModal open={pickMode === 'job'} title="Chọn chuyến đã chạy"
        items={unmatchedJobs} selectedId={selectedJobId} onSelect={setSelectedJobId} onClose={() => setPickMode(null)}
        renderLabel={job => (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {job.containers.map(c => <ContBadge key={c.containerNumber} type={c.workType} />)}
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {job.containers.map(c => c.containerNumber).join(' · ')}
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>{job.driverName} · {job.clientName}</p>
            <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{job.route}</p>
          </div>
        )}
      />
      <PickModal open={pickMode === 'trip'} title="Chọn chuyến yêu cầu"
        items={draftTrips} selectedId={selectedTripId} onSelect={setSelectedTripId} onClose={() => setPickMode(null)}
        renderLabel={trip => (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <ContBadge type={trip.workType} />
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{trip.containerNumber}</span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>{trip.clientName}</p>
            <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{trip.route}</p>
          </div>
        )}
      />
    </>
  )
}
