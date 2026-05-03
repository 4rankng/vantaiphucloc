import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTripOrders, useWorkOrders, useUpdateTripOrder, useReconcile, useToggleTripConfirmation } from '@/hooks/use-queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { ContBadge } from '@/components/shared/ContBadge'
import { ConfirmationCheckbox } from '@/components/shared/ConfirmationCheckbox'
import { formatCurrencyFull, WORK_TYPES, type WorkType } from '@/data/domain'
import { Building2, Route, UserCircle, Wallet, Link2, Pencil, Lock, Unlink, Trash2, ChevronLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { useParams, useNavigate } from 'react-router-dom'

export function TripDetail() {
  const { tripId: tripIdStr } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const tripId = Number(tripIdStr)
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders()
  const { data: jobs = [], isLoading: loadingJobs } = useWorkOrders()
  const [editTrip, setEditTrip] = useState(false)
  const [editClientName, setEditClientName] = useState('')
  const [editRoute, setEditRoute] = useState('')
  const [editWorkType, setEditWorkType] = useState<WorkType>('E20')
  const [showMatchDialog, setShowMatchDialog] = useState(false)
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false)
  const [unmatchReason, setUnmatchReason] = useState('')
  const [unmatching, setUnmatching] = useState(false)
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

  if (loading) {
    return <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-24 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  if (!trip) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Không tìm thấy chuyến"
          breadcrumbs={
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              <ChevronLeft size={14} /> Quay lại
            </button>
          }
        />
      </div>
    )
  }

  const handleOpenEdit = () => {
    setEditClientName(trip.clientName)
    setEditRoute(trip.route)
    setEditWorkType(trip.workType)
    setEditTrip(true)
  }

  const handleSaveEdit = () => {
    if (!trip) return
    updateTripOrder.mutate(
      { id: trip.id, data: { clientName: editClientName, route: editRoute, workType: editWorkType } },
      {
        onSuccess: (res) => {
          if (res.success) toast.success('Đã lưu')
          else toast.error('Lỗi', 'Không thể cập nhật')
          setEditTrip(false)
        },
      },
    )
  }

  const handleMatch = (jobId: number) => {
    if (!trip) return
    reconcile.mutate(
      { workOrderId: jobId, tripOrderId: trip.id },
      {
        onSuccess: (res) => {
          if (res.success) {
            qc.invalidateQueries({ queryKey: ['trip-orders'] })
            qc.invalidateQueries({ queryKey: ['work-orders'] })
            toast.success('Đã khớp')
          } else {
            toast.error('Lỗi', res.message ?? 'Không thể khớp')
          }
        },
        onError: () => { toast.error('Lỗi', 'Không thể khớp') },
      },
    )
    setShowMatchDialog(false)
  }

  const handleToggleConfirmation = () => {
    if (!trip) return

    toggleConfirmation(trip.id, {
      onSuccess: () => {
        toast.success('Thành công', trip.isConfirmed ? 'Đã bỏ chốt chuyến' : 'Đã chốt chuyến')
      },
      onError: () => {
        toast.error('Lỗi', 'Không thể thay đổi trạng thái chốt')
      },
    })
  }

  const handleUnmatch = async () => {
    if (!trip || !unmatchReason.trim()) return
    setUnmatching(true)
    try {
      const { apiClient } = await import('@/services/api')
      const res = await apiClient.unmatch(trip.id, unmatchReason.trim())
      if (res.success) {
        toast.success('Đã bỏ match')
        qc.invalidateQueries({ queryKey: ['trip-orders'] })
        qc.invalidateQueries({ queryKey: ['work-orders'] })
        setShowUnmatchDialog(false)
        setUnmatchReason('')
      } else {
        toast.error('Lỗi', res.message ?? 'Không thể bỏ match')
      }
    } catch {
      toast.error('Lỗi', 'Không thể bỏ match')
    } finally {
      setUnmatching(false)
    }
  }

  const statusVariant = trip.status === 'DRAFT' ? 'draft' : trip.status === 'PENDING' ? 'warning' : trip.status === 'COMPLETED' ? 'success' : 'error'
  const statusLabel = trip.status === 'DRAFT' ? 'Nháp' : trip.status === 'PENDING' ? 'Chờ đối soát' : trip.status === 'COMPLETED' ? 'Đã khớp' : 'Đã huỷ'

  return (
    <div className="space-y-6">
      {/* Page header with title, breadcrumbs, and actions */}
      <PageHeader
        title={`#${trip.id}`}
        subtitle={trip.clientName}
        breadcrumbs={
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            <ChevronLeft size={14} /> Đơn hàng
          </button>
        }
        actions={
          <div className="flex items-center gap-2">
            {!trip.isConfirmed && (
              <button onClick={handleOpenEdit} className="btn-secondary" aria-label="Sửa">
                <Pencil size={16} />
              </button>
            )}
            {trip.status !== 'COMPLETED' && (
              <button onClick={() => setShowMatchDialog(true)} className="btn-primary">
                <Link2 size={16} />
                <span className="hidden sm:inline">Khớp cont</span>
              </button>
            )}
          </div>
        }
      />

      {/* Main content — two column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — trip info (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header card with status and confirmation */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`chip chip-${statusVariant}`}>{statusLabel}</span>
                {trip.isConfirmed && (
                  <span className="chip chip-success">
                    <Lock size={12} />
                    Đã chốt
                  </span>
                )}
              </div>
              <ConfirmationCheckbox
                isConfirmed={trip.isConfirmed}
                onToggle={handleToggleConfirmation}
                disabled={toggling || trip.status === 'CANCELLED'}
                label="Chốt chuyến"
              />
            </div>
            {trip.isConfirmed && (
              <div className="rounded-lg p-3 flex items-start gap-2 mb-4" style={{ background: 'var(--theme-status-success-light)' }}>
                <Lock size={14} style={{ color: 'var(--theme-status-success)' }} className="mt-0.5 shrink-0" />
                <p className="typo-meta" style={{ color: 'var(--theme-status-success-text)' }}>
                  Lệnh đã chốt với khách — không thể thay đổi
                </p>
              </div>
            )}
            <div className="divider-h mb-4" />
            <dl className="space-y-3">
              <div className="flex items-start justify-between">
                <dt className="typo-form-label flex items-center gap-2"><Building2 size={14} />Khách hàng</dt>
                <dd className="typo-body text-right">{trip.clientName}</dd>
              </div>
              <div className="flex items-start justify-between">
                <dt className="typo-form-label flex items-center gap-2"><Route size={14} />Cung đường</dt>
                <dd className="typo-body text-right">{trip.route}</dd>
              </div>
              <div className="flex items-start justify-between">
                <dt className="typo-form-label flex items-center gap-2"><Wallet size={14} />Lương + Phụ cấp</dt>
                <dd className="typo-mono text-right">{formatCurrencyFull(trip.driverSalary)} + {formatCurrencyFull(trip.allowance)}</dd>
              </div>
            </dl>
          </div>

          {/* Container info */}
          <div className="card p-4">
            <h3 className="typo-h3 mb-3">Container</h3>
            <div className="flex items-center gap-3">
              <ContBadge type={trip.workType} />
              <span className="typo-mono">{trip.containerNumber}</span>
            </div>
          </div>

          {/* Matched jobs */}
          {matchedJobs.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="typo-h3">Đã khớp ({matchedJobs.length})</h3>
                {!trip.isConfirmed && (
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
                      <span className="typo-mono" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyFull(job.earning)}</span>
                    </div>
                    <p className="typo-meta">{job.driverName} · {job.tractorPlate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — secondary info (1/3 width) */}
        <div className="space-y-4">
          {/* Match suggestions card */}
          {(trip.status === 'DRAFT' || trip.status === 'PENDING') && (
            <div className="card p-4">
              <h3 className="typo-h3 mb-3">Khớp hàng</h3>
              <p className="typo-body-sm mb-4">Chọn số cont từ danh sách để khớp với đơn hàng này</p>
              <button onClick={() => setShowMatchDialog(true)} className="btn-primary w-full">
                <Link2 size={16} />
                Khớp cont
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Trip Dialog */}
      <Dialog open={editTrip} onOpenChange={setEditTrip}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa chuyến</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="typo-form-label">Loại container</Label>
              <div className="flex flex-wrap gap-1.5">
                {WORK_TYPES.map(w => (
                  <button key={w} onClick={() => setEditWorkType(w)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors touch-manipulation"
                    style={{
                      background: editWorkType === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                      color: editWorkType === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                    }}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Khách hàng</Label>
              <Input value={editClientName} onChange={e => setEditClientName(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Cung đường</Label>
              <Input value={editRoute} onChange={e => setEditRoute(e.target.value)} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTrip(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleSaveEdit} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Job Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chọn số cont để khớp</DialogTitle>
          </DialogHeader>
          {unmatchedJobs.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có số cont nào chưa khớp</p>
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
                    {job.driverName} · {job.tractorPlate}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {job.clientName} · {job.route}
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
    </div>
  )
}
