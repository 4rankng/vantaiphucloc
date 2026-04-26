import { useEffect, useState } from 'react'
import { MapPin, Calendar, Truck, Building2, Route as RouteIcon } from 'lucide-react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder } from '@/data/mockData'

export function JobDetail() {
  const { currentPath, goBack } = useDriverStore()
  const [job, setJob] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)

  // Extract job ID from path like /driver/job/WO-001
  const jobId = currentPath.split('/').pop()

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    apiClient.getWorkOrders({}).then(res => {
      if (!cancelled && res.success) {
        const found = res.data.find((w: WorkOrder) => w.id === jobId)
        setJob(found ?? null)
      }
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [jobId])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-40 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="h-6 rounded w-2/3" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="h-4 rounded w-1/2" style={{ background: 'var(--theme-bg-tertiary)' }} />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
        <p className="text-sm">Không tìm thấy chuyến</p>
      </div>
    )
  }

  const date = new Date(job.createdAt)
  const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-4">
      {/* Photos */}
      <div className={`grid ${job.containers.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
        {job.containers.map((c, i) => (
          <div
            key={i}
            className="aspect-[4/3] rounded-2xl flex flex-col items-center justify-center"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
              style={{ background: 'var(--theme-bg-secondary)' }}>
              <span className="text-lg">📷</span>
            </div>
            <p className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {c.containerNumber}
            </p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
              {c.workType}
            </p>
          </div>
        ))}
      </div>

      {/* Container details */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          Container
        </p>
        {job.containers.map((c, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {c.containerNumber}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
            >
              {c.workType}
            </span>
          </div>
        ))}
      </div>

      {/* Trip info */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <InfoRow icon={Building2} label="Khách hàng" value={job.clientName} />
        <InfoRow icon={RouteIcon} label="Cung đường" value={job.route} />
        <InfoRow icon={Truck} label="Biển số" value={job.tractorPlate} />
        <InfoRow
          icon={MapPin}
          label="Vị trí"
          value={job.gpsAddress ?? `${job.gpsLat}, ${job.gpsLng}`}
        />
        <InfoRow icon={Calendar} label="Thời gian" value={`${dateStr} ${timeStr}`} noBorder />
      </div>

      {/* Earning */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{
          background: job.earning > 0 ? 'var(--theme-brand-primary)' : 'var(--theme-status-warning-light)',
          boxShadow: 'var(--theme-shadow-card)',
        }}
      >
        <p className="text-sm font-semibold" style={{
          color: job.earning > 0 ? 'var(--theme-text-on-brand)' : 'var(--theme-status-warning)',
        }}>
          Thu nhập
        </p>
        {job.earning > 0 ? (
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--theme-text-on-brand)' }}>
            {formatCurrencyFull(job.earning)}
          </p>
        ) : (
          <span className="text-xs font-semibold" style={{ color: 'var(--theme-status-warning)' }}>
            Chờ đối soát
          </span>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, noBorder }: {
  icon: typeof MapPin
  label: string
  value: string
  noBorder?: boolean
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3"
      style={!noBorder ? { borderBottom: '1px solid var(--theme-border-light)' } : undefined}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          {label}
        </p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-primary)' }}>{value}</p>
      </div>
    </div>
  )
}
