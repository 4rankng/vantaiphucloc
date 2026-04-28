import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '@/services/api'
import { InfoRow } from '@/components/shared/InfoRow'
import { ContBadge } from '@/components/shared/ContBadge'
import { formatCurrencyFull, type TripOrder, type WorkOrder, WORK_TYPES, type WorkType } from '@/data/domain'
import { Building2, Route, UserCircle, Wallet, Link2, Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'

export function TripDetail({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<TripOrder | null>(null)
  const [jobs, setJobs] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  // Edit trip dialog
  const [editTrip, setEditTrip] = useState(false)
  const [editClientName, setEditClientName] = useState('')
  const [editRoute, setEditRoute] = useState('')
  const [editWorkType, setEditWorkType] = useState<WorkType>('E20')

  // Match dialog — pick from unmatched jobs
  const [showMatchDialog, setShowMatchDialog] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getTripOrders(), apiClient.getWorkOrders()])
      .then(([t, j]) => {
        if (!cancelled) {
          if (t.success) setTrip(t.data.find(t => t.id === tripId) ?? null)
          if (j.success) setJobs(j.data)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [tripId])

  const matchedJobs = useMemo(() => {
    if (!trip) return []
    return jobs.filter(j => trip.matchedWorkOrderIds.includes(j.id))
  }, [trip, jobs])

  const unmatchedJobs = useMemo(() => {
    const allMatchedIds = new Set(
      // All jobs matched to ANY trip
      [] as string[]
    )
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

  const handleMatch = (jobId: string) => {
    // In real app: call API to match job to trip
    setShowMatchDialog(false)
  }

  return (
    <div className="space-y-4">
      {/* Trip info card */}
      <div className="rounded-2xl p-4 space-y-1"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>Chuyến</p>
          <div className="flex items-center gap-2">
            <button onClick={handleOpenEdit}
              className="h-7 w-7 flex items-center justify-center rounded-lg touch-manipulation"
              style={{ color: 'var(--theme-text-muted)' }}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: trip.status === 'DRAFT' ? 'var(--theme-status-warning-light)' : 'var(--theme-status-success-light)',
                color: trip.status === 'DRAFT' ? 'var(--theme-status-warning)' : 'var(--theme-status-success)',
              }}>
              {trip.status === 'DRAFT' ? 'Đối soát khách hàng' : 'Đã khớp'}
            </span>
          </div>
        </div>
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
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-status-success)' }}>
            Đã match ({matchedJobs.length})
          </p>
          <div className="space-y-2">
            {matchedJobs.map(job => (
              <div key={job.id} className="rounded-2xl p-3"
                style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', borderLeft: '3px solid var(--theme-status-success)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ContBadge type={job.containers[0]?.workType ?? 'E20'} />
                    <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                      {job.containers[0]?.containerNumber || job.id}
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
            <Link2 className="w-4 h-4" /> Khớp số công
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
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại công</Label>
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
            <Button onClick={() => { setEditTrip(false) }} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Job Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chọn số công để khớp</DialogTitle>
          </DialogHeader>
          {unmatchedJobs.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có số công nào chưa khớp</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {unmatchedJobs.map(job => (
                <button key={job.id}
                  onClick={() => handleMatch(job.id)}
                  className="w-full text-left rounded-xl p-3 transition-all active:scale-[0.98] touch-manipulation"
                  style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)' }}>
                  <div className="flex items-center gap-2">
                    <ContBadge type={job.containers[0]?.workType ?? 'E20'} />
                    <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                      {job.containers[0]?.containerNumber || job.id}
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
    </div>
  )
}
