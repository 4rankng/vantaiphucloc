import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTripOrders, useWorkOrders, useUpdateTripOrder, useReconcile, useToggleTripConfirmation } from '@/hooks/use-queries'
import { InfoRow } from '@/components/shared/InfoRow'
import { ContBadge } from '@/components/shared/ContBadge'
import { ConfirmationCheckbox } from '@/components/shared/ConfirmationCheckbox'
import { formatCurrencyFull, WORK_TYPES, type WorkType } from '@/data/domain'
import { Building2, Route, UserCircle, Wallet, Link2, Pencil, Lock, Unlink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { useParams } from 'react-router-dom'

export function TripDetail() {
  const { tripId: tripIdStr } = useParams<{ tripId: string }>()
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
    return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  if (!trip) {
    return <div className="p-4 text-center" style={{ color: 'var(--theme-text-muted)' }}>Không tìm thấy chuyến</div>
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

  return (
    <div className="space-y-4">
      {/* Trip info card */}
      <div className="rounded-2xl p-4 space-y-1"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>Lệnh điều hành</p>
          <div className="flex items-center gap-2">
            <ConfirmationCheckbox
              isConfirmed={trip.isConfirmed}
              onToggle={handleToggleConfirmation}
              disabled={toggling || trip.status === 'CANCELLED'}
              label="Đã chốt"
            />
            {trip.isConfirmed ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: 'var(--theme-status-success-light)' }}>
                <Lock className="w-3 h-3" style={{ color: 'var(--theme-status-success)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--theme-status-success)' }}>Đã khoá</span>
              </div>
            ) : (
              <button onClick={handleOpenEdit}
                className="h-7 w-7 flex items-center justify-center rounded-lg touch-manipulation"
                style={{ color: 'var(--theme-text-muted)' }}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: trip.status === 'DRAFT' ? 'var(--theme-bg-tertiary)'
                  : trip.status === 'PENDING' ? 'var(--theme-status-warning-light)'
                  : trip.status === 'COMPLETED' ? 'var(--theme-status-success-light)'
                  : 'var(--theme-status-error-light)',
                color: trip.status === 'DRAFT' ? 'var(--theme-text-muted)'
                  : trip.status === 'PENDING' ? 'var(--theme-status-warning)'
                  : trip.status === 'COMPLETED' ? 'var(--theme-status-success)'
                  : 'var(--theme-status-error)',
              }}>
              {trip.status === 'DRAFT' ? 'Nháp'
                : trip.status === 'PENDING' ? 'Chờ đối soát'
                : trip.status === 'COMPLETED' ? 'Đã khớp'
                : 'Đã huỷ'}
            </span>
          </div>
        </div>
        {trip.isConfirmed && (
          <div className="rounded-xl px-3 py-2 mb-2 flex items-center gap-2"
            style={{ background: 'var(--theme-status-success-light)' }}>
            <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--theme-status-success)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--theme-status-success)' }}>
              Lệnh đã chốt với khách — không thể thay đổi
            </p>
          </div>
        )}
        <InfoRow icon={Building2} label="Khách hàng" value={trip.clientName} noBorder />
        <InfoRow icon={Route} label="Cung đường" value={trip.route} noBorder />
        <InfoRow icon={UserCircle} label="Tài xế" value={`${trip.driverName} · ${trip.tractorPlate}`} noBorder />
        <InfoRow icon={Wallet} label="Lương + Phụ cấp" value={`${formatCurrencyFull(trip.driverSalary)} + ${formatCurrencyFull(trip.allowance)}`} noBorder />
      </div>

      {/* Cong info */}
      <div className="rounded-2xl p-3"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="flex items-center gap-2">
          <ContBadge type={trip.workType} />
          <span className="text-sm font-mono" style={{ color: 'var(--theme-text-primary)' }}>{trip.containerNumber}</span>
        </div>
      </div>

      {/* Matched jobs */}
      {matchedJobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-status-success)' }}>
              Đã match ({matchedJobs.length})
            </p>
            {!trip.isConfirmed && (
              <button
                onClick={() => setShowUnmatchDialog(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors touch-manipulation"
                style={{ color: 'var(--theme-status-error)', background: 'var(--theme-status-error-light)' }}
              >
                <Unlink className="w-3 h-3" /> Bỏ match
              </button>
            )}
          </div>
          <div className="space-y-2">
            {matchedJobs.map(job => (
              <div key={job.id} className="rounded-2xl p-3"
                style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', borderLeft: '3px solid var(--theme-status-success)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ContBadge type={job.containers[0]?.workType ?? 'E20'} />
                    <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                      {job.code}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
                    {formatCurrencyFull(job.earning)}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                  {job.driverName} · {job.tractorPlate}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unmatched jobs — match action */}
      {trip.status === 'DRAFT' && (
        <div>
          <button onClick={() => setShowMatchDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] touch-manipulation"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            <Link2 className="w-4 h-4" /> Khớp số cont
          </button>
        </div>
      )}

      {/* Edit Trip Dialog */}
      <Dialog open={editTrip} onOpenChange={setEditTrip}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa chuyến</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại container</Label>
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
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
              <Input value={editClientName} onChange={e => setEditClientName(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
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
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Lý do *</Label>
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
