import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/hooks/use-app-store'
import { apiClient } from '@/services/api'
import { InfoRow } from '@/components/shared/InfoRow'
import { ContBadge } from '@/components/shared/ContBadge'
import { SheetPicker } from '@/components/shared/SheetPicker'
import { formatCurrencyFull, type WorkOrder, type TripOrder, WORK_TYPES, type WorkType } from '@/data/mockData'
import { Building2, Route, UserCircle, Truck, Pencil, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'

export function MatchJob({ jobId }: { jobId: string }) {
  const { goBack } = useAppStore()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [trips, setTrips] = useState<TripOrder[]>([])
  const [loading, setLoading] = useState(true)

  // Selected trip for comparison
  const [selectedTripId, setSelectedTripId] = useState('')

  // Edit states for job (left side)
  const [editJob, setEditJob] = useState(false)
  const [jobWorkType, setJobWorkType] = useState<WorkType>('E20')
  const [jobClient, setJobClient] = useState('')
  const [jobRoute, setJobRoute] = useState('')
  const [jobContNumber, setJobContNumber] = useState('')

  // Edit states for trip (right side)
  const [editTrip, setEditTrip] = useState(false)
  const [tripWorkType, setTripWorkType] = useState<WorkType>('E20')
  const [tripClient, setTripClient] = useState('')
  const [tripRoute, setTripRoute] = useState('')

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

  const job = useMemo(() => workOrders.find(w => w.id === jobId), [workOrders, jobId])

  // Populate job edit fields when loaded
  useEffect(() => {
    if (job) {
      setJobWorkType(job.containers[0]?.workType ?? 'E20')
      setJobClient(job.clientName)
      setJobRoute(job.route)
      setJobContNumber(job.containers[0]?.containerNumber ?? '')
    }
  }, [job])

  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId])

  useEffect(() => {
    if (selectedTrip) {
      setTripWorkType(selectedTrip.workType)
      setTripClient(selectedTrip.clientName)
      setTripRoute(selectedTrip.route)
    }
  }, [selectedTrip])

  // Trips that are DRAFT (chua khop) for matching
  const draftTrips = useMemo(() => {
    return trips.filter(t => t.status === 'DRAFT')
  }, [trips])

  const handleMatch = () => {
    // In real app: call API to match job to trip
    goBack()
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  if (!job) {
    return <div className="p-4 text-center" style={{ color: 'var(--theme-text-muted)' }}>Không tìm thấy số công</div>
  }

  return (
    <div className="space-y-3">
      {/* LEFT: Job info */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
          <p className="text-xs font-bold">Số công</p>
          <button onClick={() => setEditJob(!editJob)} className="touch-manipulation">
            <Pencil className="w-3 h-3" />
          </button>
        </div>

        {editJob ? (
          <div className="p-3 space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại công</Label>
              <div className="flex flex-wrap gap-1">
                {WORK_TYPES.map(w => (
                  <button key={w} onClick={() => setJobWorkType(w)}
                    className="px-2 py-1 rounded text-[10px] font-bold touch-manipulation"
                    style={{ background: jobWorkType === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: jobWorkType === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Số cont</Label>
              <Input value={jobContNumber} onChange={e => setJobContNumber(e.target.value)} className="text-xs font-mono h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
              <Input value={jobClient} onChange={e => setJobClient(e.target.value)} className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
              <Input value={jobRoute} onChange={e => setJobRoute(e.target.value)} className="text-xs h-8" />
            </div>
            <Button onClick={() => setEditJob(false)} className="w-full h-8 text-xs font-bold rounded-lg" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              Lưu
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 px-3 pt-2">
              <ContBadge type={jobWorkType} />
              <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{jobContNumber || '-'}</span>
            </div>
            <InfoRow icon={UserCircle} label="Tài xế" value={`${job.driverName} · ${job.tractorPlate}`} />
            <InfoRow icon={Building2} label="Khách hàng" value={jobClient} />
            <InfoRow icon={Route} label="Cung đường" value={jobRoute} />
          </div>
        )}
      </div>

      {/* RIGHT: Select trip */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="px-3 py-2" style={{ background: 'var(--theme-status-warning-light)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--theme-status-warning)' }}>Chuyến chưa khớp</p>
        </div>

        {!selectedTrip ? (
          <div className="p-3 space-y-2">
            {draftTrips.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--theme-text-muted)' }}>Không có chuyến nào chưa khớp</p>
            ) : (
              draftTrips.map(trip => (
                <button key={trip.id}
                  onClick={() => setSelectedTripId(trip.id)}
                  className="w-full text-left rounded-xl p-2.5 transition-all active:scale-[0.98] touch-manipulation"
                  style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{trip.clientName}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                    {trip.route} · {trip.driverName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <ContBadge type={trip.workType} />
                    <span className="text-[10px] font-mono" style={{ color: 'var(--theme-text-muted)' }}>{trip.containerNumber}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 pt-2">
              <p className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đã chọn</p>
              <button onClick={() => { setSelectedTripId(''); setEditTrip(false) }} className="text-[10px] font-medium touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>
                Đổi chuyến
              </button>
            </div>

            {editTrip ? (
              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại công</Label>
                  <div className="flex flex-wrap gap-1">
                    {WORK_TYPES.map(w => (
                      <button key={w} onClick={() => setTripWorkType(w)}
                        className="px-2 py-1 rounded text-[10px] font-bold touch-manipulation"
                        style={{ background: tripWorkType === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: tripWorkType === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
                  <Input value={tripClient} onChange={e => setTripClient(e.target.value)} className="text-xs h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
                  <Input value={tripRoute} onChange={e => setTripRoute(e.target.value)} className="text-xs h-8" />
                </div>
                <Button onClick={() => setEditTrip(false)} className="w-full h-8 text-xs font-bold rounded-lg" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                  Lưu
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between px-3">
                  <div className="flex items-center gap-2">
                    <ContBadge type={tripWorkType} />
                    <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{selectedTrip.containerNumber}</span>
                  </div>
                  <button onClick={() => setEditTrip(true)} className="touch-manipulation" style={{ color: 'var(--theme-text-muted)' }}>
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
                <InfoRow icon={UserCircle} label="Tài xế" value={`${selectedTrip.driverName} · ${selectedTrip.tractorPlate}`} />
                <InfoRow icon={Building2} label="Khách hàng" value={tripClient} />
                <InfoRow icon={Route} label="Cung đường" value={tripRoute} />
                <InfoRow label="Lương + Phụ cấp" value={`${formatCurrencyFull(selectedTrip.driverSalary)} + ${formatCurrencyFull(selectedTrip.allowance)}`} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Khớp button */}
      {selectedTrip && (
        <Button onClick={handleMatch}
          className="w-full h-11 font-bold rounded-xl"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
          <Check className="w-4 h-4 mr-1.5" /> Khớp
        </Button>
      )}
    </div>
  )
}
