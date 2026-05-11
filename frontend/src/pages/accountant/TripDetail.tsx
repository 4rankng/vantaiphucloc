import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useTripOrders, useWorkOrders, useUpdateTripOrder, useReconcile, useToggleTripConfirmation, useUnmatch, useClients, useLocations } from '@/hooks/use-queries'
import { ContBadge } from '@/components/shared/ContBadge'
import { ConfirmationCheckbox } from '@/components/shared/ConfirmationCheckbox'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatCurrencyFull, WORK_TYPES, type WorkType } from '@/data/domain'
import { RouteDisplay } from '@/components/shared/RouteDisplay'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { LocationSelect } from '@/components/shared/LocationSelect/LocationSelect'
import { Building2, Route, UserCircle, Wallet, Link2, Pencil, Lock, Unlink, Trash2, ChevronLeft, Plus, DollarSign } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { useParams, useNavigate } from 'react-router-dom'

// ─── Shared content — works both as page and inside a dialog ──────────────

interface TripDetailContentProps {
  tripId: number
  /** When provided, hides the back breadcrumb and shows as dialog-friendly layout */
  onClose?: () => void
}

export function TripDetailContent({ tripId, onClose }: TripDetailContentProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = user?.role === 'accountant' || user?.role === 'superadmin'
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders()
  const { data: jobs = [], isLoading: loadingJobs } = useWorkOrders()
  const { data: clients = [] } = useClients()
  const { data: locations = [] } = useLocations()
  const [editTrip, setEditTrip] = useState(false)
  const [editClientId, setEditClientId] = useState('')
  const [editPickup, setEditPickup] = useState('')
  const [editDropoff, setEditDropoff] = useState('')
  const [editDriverSalary, setEditDriverSalary] = useState(0)
  const [editAllowance, setEditAllowance] = useState(0)
  const [editContainers, setEditContainers] = useState<{ workType: WorkType; containerNumber: string }[]>([])
  const [showMatchDialog, setShowMatchDialog] = useState(false)
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false)
  const [showConfirmChot, setShowConfirmChot] = useState(false)
  const [unmatchReason, setUnmatchReason] = useState('')
  const { mutateAsync: unmatch, isPending: unmatching } = useUnmatch()
  const toast = useToast()
  const updateTripOrder = useUpdateTripOrder()
  const reconcile = useReconcile()
  const { mutate: toggleConfirmation, isPending: toggling } = useToggleTripConfirmation()
  const qc = useQueryClient()

  const loading = loadingTrips || loadingJobs
  const trip = useMemo(() => trips.find(t => t.id === tripId) ?? null, [trips, tripId])

  const matchedJobs = useMemo(() => {
    if (!trip) return []
    return jobs.filter(j => trip.matchedWorkOrderIds.includes(j.id))
  }, [trip, jobs])

  const unmatchedJobs = useMemo(() => {
    return jobs.filter(j => j.status === 'PENDING' && !trip?.matchedWorkOrderIds.includes(j.id))
  }, [jobs, trip])

  const clientOptions = useMemo(() => clients.map(x => ({ value: String(x.id), label: x.name })), [clients])

  if (loading) {
    return <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-24 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  if (!trip) {
    return (
      <div className="space-y-4">
        {onClose ? (
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không tìm thấy chuyến</p>
        ) : (
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            <ChevronLeft size={14} /> Quay lại
          </button>
        )}
        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không tìm thấy chuyến</p>
      </div>
    )
  }

  const handleOpenEdit = () => {
    setEditClientId(String(trip.partner.id))
    setEditPickup(trip.pickupLocation?.name ?? '')
    setEditDropoff(trip.dropoffLocation?.name ?? '')
    setEditDriverSalary(trip.driverSalary)
    setEditAllowance(trip.allowance)
    setEditContainers(
      trip.containers.length > 0
        ? trip.containers.map(c => ({ workType: c.workType, containerNumber: c.containerNumber }))
        : [{ workType: 'E20' as WorkType, containerNumber: '' }],
    )
    setEditTrip(true)
  }

  const handleSaveEdit = () => {
    if (!trip) return
    const pickupId = locations.find(l => l.name === editPickup)?.id
    const dropoffId = locations.find(l => l.name === editDropoff)?.id
    if (!pickupId || !dropoffId) {
      toast.error('Vui lòng chọn điểm lấy/trả từ danh sách')
      return
    }
    updateTripOrder.mutate(
      {
        id: trip.id,
        data: {
          clientId: Number(editClientId),
          route: `${editPickup} - ${editDropoff}`,
          pickupLocationId: pickupId,
          dropoffLocationId: dropoffId,
          driverSalary: editDriverSalary,
          allowance: editAllowance,
          containers: editContainers.map(c => ({ containerNumber: c.containerNumber, workType: c.workType })),
        },
      },
      {
        onSuccess: () => {
          toast.success('Đã lưu')
          setEditTrip(false)
        },
        onError: () => toast.error('Lỗi', 'Không thể cập nhật'),
      },
    )
  }

  const handleMatch = (jobId: number) => {
    if (!trip) return
    reconcile.mutate(
      { workOrderId: jobId, tripOrderId: trip.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['trip-orders'] })
          qc.invalidateQueries({ queryKey: ['work-orders'] })
          toast.success('Đã khớp')
        },
        onError: () => { toast.error('Lỗi', 'Không thể khớp') },
      },
    )
    setShowMatchDialog(false)
  }

  const handleToggleConfirmation = () => {
    if (!trip) return
    if (trip.status !== 'MATCHED') {
      setShowConfirmChot(true)
      return
    }
    doToggleConfirmation()
  }

  const doToggleConfirmation = () => {
    if (!trip) return
    toggleConfirmation(trip.id, {
      onSuccess: () => {
        toast.success('Thành công', trip.status === 'MATCHED' ? 'Đã bỏ chốt chuyến' : 'Đã khớp chuyến')
      },
      onError: () => {
        toast.error('Lỗi', 'Không thể thay đổi trạng thái chốt')
      },
    })
  }

  const handleUnmatch = async () => {
    if (!trip || !unmatchReason.trim()) return
    try {
      await unmatch({ tripOrderId: trip.id, reason: unmatchReason.trim() })
      toast.success('Đã bỏ match')
      setShowUnmatchDialog(false)
      setUnmatchReason('')
    } catch {
      toast.error('Lỗi', 'Không thể bỏ match')
    }
  }

  const statusVariant = trip.status === 'DRAFT' ? 'draft'
    : trip.status === 'PENDING' ? 'warning'
    : trip.status === 'MATCHED' ? 'success'
    : 'error'
  const statusLabel = trip.status === 'DRAFT' ? 'Nháp'
    : trip.status === 'PENDING' ? 'Chờ ghép'
    : trip.status === 'MATCHED' ? 'Đã khớp'
    : 'Đã huỷ'

  return (
    <div className="space-y-6">
      {/* Header — title and actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!onClose && (
            <>
              <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                <ChevronLeft size={14} /> Đơn hàng
              </button>
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>·</span>
            </>
          )}
          <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {trip.code ?? `#${trip.id}`}
          </span>
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{trip.partner.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && trip.status !== 'MATCHED' && (
            <button onClick={handleOpenEdit} className="btn-secondary" aria-label="Sửa">
              <Pencil size={16} />
            </button>
          )}
          {canEdit && trip.status !== 'COMPLETED' && (
            <button onClick={() => setShowMatchDialog(true)} className="btn-primary">
              <Link2 size={16} />
              <span className="hidden sm:inline">Khớp chuyến</span>
            </button>
          )}
        </div>
      </div>

      {/* Trip info */}
      <div className="space-y-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`chip chip-${statusVariant}`}>{statusLabel}</span>
            </div>
            {!onClose && canEdit && (
              <ConfirmationCheckbox
                isConfirmed={trip.status === 'MATCHED'}
                onToggle={handleToggleConfirmation}
                disabled={toggling || trip.status === 'CANCELLED'}
                label="Chốt chuyến"
              />
            )}
          </div>
          {trip.status === 'MATCHED' && (
            <div className="rounded-lg p-3 flex items-start gap-2 mb-4" style={{ background: 'var(--theme-status-success-light)' }}>
              <Lock size={14} style={{ color: 'var(--theme-status-success)' }} className="mt-0.5 shrink-0" />
              <p className="typo-meta" style={{ color: 'var(--theme-status-success-text)' }}>
                Đơn hàng đã chốt với khách — nhấn lại để bỏ chốt nếu cần điều chỉnh
              </p>
            </div>
          )}
          <div className="divider-h mb-4" />
          <dl className="space-y-3">
            <div className="flex items-start justify-between">
              <dt className="typo-form-label flex items-center gap-2"><Building2 size={14} />Khách hàng</dt>
              <dd className="typo-body text-right">{trip.partner.name}</dd>
            </div>
            <div className="flex items-start justify-between">
              <dt className="typo-form-label flex items-center gap-2"><Route size={14} />Cung đường</dt>
              <dd className="typo-body text-right">
                <RouteDisplay
                  route={trip.route}
                  pickupLocation={trip.pickupLocation?.name}
                  dropoffLocation={trip.dropoffLocation?.name}
                />
              </dd>
            </div>
            <div className="flex items-start justify-between">
              <dt className="typo-form-label flex items-center gap-2"><DollarSign size={14} />Doanh thu</dt>
              <dd className="typo-mono text-right">
                {trip.unitPrice > 0 ? formatCurrencyFull(trip.unitPrice) : <span style={{ color: 'var(--theme-text-muted)' }}>—</span>}
              </dd>
            </div>
            <div className="flex items-start justify-between">
              <dt className="typo-form-label flex items-center gap-2"><Wallet size={14} />Lương + Phụ cấp</dt>
              <dd className="typo-mono text-right">{formatCurrencyFull(trip.driverSalary)} + {formatCurrencyFull(trip.allowance)}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-4">
          <h3 className="typo-h3 mb-3">Container</h3>
          <div className="space-y-2">
            {trip.containers.length > 0 ? trip.containers.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <ContBadge type={c.workType} />
                <span className="typo-mono">{c.containerNumber}</span>
              </div>
            )) : (
              <div className="flex items-center gap-3">
                <span className="typo-meta" style={{ color: 'var(--theme-text-muted)' }}>—</span>
              </div>
            )}
          </div>
        </div>

        {matchedJobs.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="typo-h3">Đã khớp ({matchedJobs.length})</h3>
              {canEdit && trip.status !== 'MATCHED' && (
                <button
                  onClick={() => setShowUnmatchDialog(true)}
                  className="btn-ghost text-xs"
                  style={{ color: 'var(--theme-status-error)' }}
                >
                  <Unlink size={14} />
                  Bỏ match
                </button>
              )}
            </div>
            <div className="divider-h mb-4" />
            <div className="space-y-3">
              {matchedJobs.map(job => (
                <div key={job.id} className="p-3 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)', borderLeft: '2px solid var(--theme-status-success)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <ContBadge type={job.containers[0]?.workType ?? 'E20'} />
                      <span className="typo-mono font-semibold">{job.code}</span>
                    </div>
                    <span className="typo-mono" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyFull(job.driverSalary)}</span>
                  </div>
                  <p className="typo-meta">{job.driver.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Trip Dialog */}
      <Dialog open={editTrip} onOpenChange={setEditTrip}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sửa chuyến</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65dvh] overflow-y-auto pr-1">
            {/* Client */}
            <div className="space-y-2">
              <Label className="typo-form-label">Khách hàng</Label>
              <InlineSelect
                options={clientOptions}
                value={editClientId}
                onChange={setEditClientId}
                placeholder="Chọn khách hàng"
              />
            </div>

            {/* Route */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="typo-form-label">Điểm lấy</Label>
                <LocationSelect value={editPickup} onChange={val => { setEditPickup(val); setEditDropoff('') }} placeholder="Chọn điểm lấy" />
              </div>
              <div className="space-y-2">
                <Label className="typo-form-label">Điểm trả</Label>
                <LocationSelect value={editDropoff} onChange={setEditDropoff} placeholder="Chọn điểm trả" />
              </div>
            </div>

            {/* Containers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="typo-form-label">Container</Label>
                <button
                  onClick={() => setEditContainers(prev => [...prev, { workType: 'E20', containerNumber: '' }])}
                  className="flex items-center gap-1 text-xs font-semibold h-7 px-2 rounded-md transition-colors"
                  style={{ color: 'var(--theme-brand-primary)', background: 'var(--theme-brand-primary-light)' }}
                >
                  <Plus size={14} /> Thêm
                </button>
              </div>
              <div className="space-y-2">
                {editContainers.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <span className="text-xs font-medium w-5 text-center" style={{ color: 'var(--theme-text-muted)' }}>#{i + 1}</span>
                    <div className="flex gap-1">
                      {WORK_TYPES.map(w => (
                        <button key={w} onClick={() => setEditContainers(prev => prev.map((x, j) => j === i ? { ...x, workType: w } : x))}
                          className="h-7 px-2 rounded text-xs font-bold transition-colors"
                          style={{
                            background: c.workType === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                            color: c.workType === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                            border: c.workType === w ? 'none' : '1px solid var(--theme-border-default)',
                          }}>
                          {w}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={c.containerNumber}
                      onChange={e => setEditContainers(prev => prev.map((x, j) => j === i ? { ...x, containerNumber: e.target.value.replace(/-/g, '').toUpperCase() } : x))}
                      placeholder="Số container"
                      className="text-sm font-mono h-8 flex-1"
                    />
                    {editContainers.length > 1 && (
                      <button onClick={() => setEditContainers(prev => prev.filter((_, j) => j !== i))} className="shrink-0" style={{ color: 'var(--theme-status-error)' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Salary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="typo-form-label">Lương tài xế</Label>
                <Input type="number" value={editDriverSalary || ''} onChange={e => setEditDriverSalary(Number(e.target.value))} placeholder="0" className="text-sm font-mono h-9" />
              </div>
              <div className="space-y-2">
                <Label className="typo-form-label">Phụ cấp</Label>
                <Input type="number" value={editAllowance || ''} onChange={e => setEditAllowance(Number(e.target.value))} placeholder="0" className="text-sm font-mono h-9" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTrip(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleSaveEdit} disabled={!editClientId || !editPickup || !editDropoff} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Job Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chọn chuyến để khớp</DialogTitle>
          </DialogHeader>
          {unmatchedJobs.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có chuyến nào chưa khớp</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[50dvh] overflow-y-auto">
              {unmatchedJobs.map(job => (
                <button key={job.id}
                  onClick={() => handleMatch(job.id)}
                  className="w-full text-left rounded-xl p-3 transition-all active:scale-[0.98] touch-manipulation"
                  style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)' }}>
                  <div className="flex items-center gap-2">
                    <ContBadge type={job.containers[0]?.workType ?? 'E20'} />
                    <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                      {job.code}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                    {job.driver.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {job.partner.name} · {job.pickupLocation?.name ?? ''} → {job.dropoffLocation?.name ?? ''}
                  </p>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMatchDialog(false)} className="flex-1">Huỷ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unmatch Dialog */}
      <Dialog open={showUnmatchDialog} onOpenChange={open => { setShowUnmatchDialog(open); if (!open) setUnmatchReason('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bỏ match</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Tách tất cả số cont đã khớp với đơn hàng này. Hành động này không thể hoàn tác.
          </p>
          <div className="space-y-2">
            <Label className="typo-form-label">Lý do *</Label>
            <Input
              value={unmatchReason}
              onChange={e => setUnmatchReason(e.target.value)}
              placeholder="Nhập lý do bỏ match..."
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnmatchDialog(false)} className="flex-1">Huỷ</Button>
            <Button
              onClick={handleUnmatch}
              disabled={!unmatchReason.trim() || unmatching}
              className="flex-1"
              style={{ background: 'var(--theme-status-error)', color: 'white' }}
            >
              {unmatching ? 'Đang xử lý...' : 'Bỏ match'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm chốt chuyến */}
      <ConfirmDialog
        open={showConfirmChot}
        onClose={() => setShowConfirmChot(false)}
        onConfirm={() => { setShowConfirmChot(false); doToggleConfirmation() }}
        title="Chốt chuyến?"
        description={`Xác nhận chốt đơn hàng với ${trip?.partner.name ?? 'khách hàng'}? Đơn đã chốt sẽ khoá chỉnh sửa.`}
        confirmLabel="Chốt chuyến"
      />

      {/* Đóng button — dialog mode only */}
      {onClose && (
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">
            Đóng
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page wrapper — for deep-linked route /accountant/trip/:tripId ──────────

export function TripDetail() {
  const { tripId: tripIdStr } = useParams<{ tripId: string }>()
  const tripId = Number(tripIdStr)

  return <TripDetailContent tripId={tripId} />
}
