import { useEffect, useState, useMemo } from 'react'
import { Search, Filter, Link2 } from 'lucide-react'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { ContBadge } from '@/components/shared/ContBadge'
import { SheetPicker } from '@/components/shared/SheetPicker'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { apiClient } from '@/services/api'
import { type WorkOrder, type TripOrder, WORK_TYPES, type WorkType } from '@/data/mockData'

export function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [trips, setTrips] = useState<TripOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchPlate, setSearchPlate] = useState('')

  // Edit job dialog
  const [editJob, setEditJob] = useState<WorkOrder | null>(null)
  const [editWorkType, setEditWorkType] = useState<WorkType>('E20')
  const [editClientName, setEditClientName] = useState('')
  const [editRoute, setEditRoute] = useState('')

  // Match dialog
  const [matchJobId, setMatchJobId] = useState<string | null>(null)

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

  // Only show unmatched jobs
  const unmatched = useMemo(() => {
    const matchedIds = new Set(trips.flatMap(t => t.matchedWorkOrderIds))
    return workOrders.filter(w => !matchedIds.has(w.id))
  }, [workOrders, trips])

  const filtered = useMemo(() => {
    if (!searchPlate.trim()) return unmatched
    return unmatched.filter(w => w.tractorPlate.toLowerCase().includes(searchPlate.toLowerCase()))
  }, [unmatched, searchPlate])

  // Editable job
  const handleOpenEdit = (job: WorkOrder) => {
    setEditJob(job)
    setEditWorkType(job.containers[0]?.workType ?? 'E20')
    setEditClientName(job.clientName)
    setEditRoute(job.route)
  }

  // Available trips to match with (unmatched or partially matched)
  const availableTrips = useMemo(() => {
    return trips.filter(t => t.status === 'DRAFT')
  }, [trips])

  const handleMatch = (jobId: string, tripId: string) => {
    // In real app: call API to match
    setMatchJobId(null)
    setEditJob(null)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
        <Input
          value={searchPlate}
          onChange={e => setSearchPlate(e.target.value)}
          placeholder="Tìm theo biển số..."
          className="text-sm pl-9"
          style={{ background: 'var(--theme-bg-secondary)' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có số công chưa match</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => (
            <div key={job.id}
              className="rounded-2xl p-3"
              style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ContBadge type={job.containers[0]?.workType ?? 'E20'} />
                  <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {job.containers[0]?.containerNumber || job.id}
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}>
                  Chờ match
                </span>
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                {job.driverName} · {job.tractorPlate}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                {job.clientName} · {job.route}
              </p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleOpenEdit(job)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium touch-manipulation"
                  style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}>
                  Sửa
                </button>
                <button onClick={() => setMatchJobId(job.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold touch-manipulation"
                  style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                  <Link2 className="w-3 h-3 inline mr-1" /> Match
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Job Dialog */}
      <Dialog open={!!editJob} onOpenChange={() => setEditJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa số công</DialogTitle>
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
            <Button variant="outline" onClick={() => setEditJob(null)} className="flex-1">Huỷ</Button>
            <Button onClick={() => { /* save edits */ setEditJob(null) }} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Job to Trip Dialog */}
      <Dialog open={!!matchJobId} onOpenChange={() => setMatchJobId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chọn chuyến để match</DialogTitle>
          </DialogHeader>
          {availableTrips.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có chuyến nào để match</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {availableTrips.map(trip => (
                <button key={trip.id}
                  onClick={() => handleMatch(matchJobId!, trip.id)}
                  className="w-full text-left rounded-xl p-3 transition-all active:scale-[0.98] touch-manipulation"
                  style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {trip.clientName}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                    {trip.route} · {trip.driverName}
                  </p>
                  <p className="text-[11px] font-mono" style={{ color: 'var(--theme-text-muted)' }}>
                    {trip.workType} · {trip.containerNumber}
                  </p>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchJobId(null)} className="flex-1">Huỷ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
