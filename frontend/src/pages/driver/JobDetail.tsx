import { useState } from 'react'
import { MapPin, Calendar, Truck, Building2, Route as RouteIcon, Camera, X, Pencil } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { InfoRow } from '@/components/shared/InfoRow'
import { formatCurrencyFull } from '@/data/domain'
import { useWorkOrder } from '@/hooks/use-queries'

export function JobDetail() {
  const { jobId: jobIdStr } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const jobId = Number(jobIdStr)
  const { data: job = null, isLoading: loading } = useWorkOrder(jobId)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-40 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }} />
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
    <>
      {/* Back button — inline in page body */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 typo-body-sm mb-3"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Quay lại
      </button>

      {/* Fullscreen lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Ảnh container"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold touch-manipulation"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(8px)' }}
          >
            <X className="w-4 h-4" />
            Đóng
          </button>
        </div>
      )}

    <div className="space-y-4 pb-20">
      {/* Photos */}
      <div className={`grid ${job.containers.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
        {job.containers.map((c, i) => (
          <div
            key={i}
            className="relative rounded-lg overflow-hidden aspect-square"
            style={{ border: '1px solid var(--theme-border-default)' }}
          >
            {c.photoUrl ? (
              <button
                className="block w-full h-full touch-manipulation"
                onClick={() => setLightboxUrl(c.photoUrl!)}
                aria-label={`Xem ảnh ${c.containerNumber}`}
              >
                <img
                  src={c.photoUrl}
                  alt={c.containerNumber}
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center"
                style={{ background: 'var(--theme-bg-tertiary)' }}
              >
                <Camera className="w-6 h-6" style={{ color: 'var(--theme-text-muted)' }} />
              </div>
            )}
            {/* Container info overlay at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center justify-between"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            >
              <p className="text-xs font-mono font-semibold truncate" style={{ color: '#fff' }}>
                {c.containerNumber}
              </p>
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ml-1"
                style={{ background: 'var(--theme-brand-primary)', color: '#fff' }}
              >
                {c.workType}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Trip info */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <InfoRow icon={Building2} label="Khách hàng" value={job.client.name} />
        <InfoRow icon={RouteIcon} label="Cung đường" value={job.route} />
        <InfoRow icon={Truck} label="Biển số" value={job.tractorPlate} />
        {(() => {
          const loc = job.gpsAddress ?? (job.gpsLat && job.gpsLng ? `${job.gpsLat}, ${job.gpsLng}` : null)
          return loc ? <InfoRow icon={MapPin} label="Vị trí" value={loc} /> : null
        })()}
        <InfoRow icon={Calendar} label="Thời gian" value={`${dateStr} ${timeStr}`} noBorder />
      </div>

      {/* Earning */}
      <div
        className="rounded-lg p-4 flex items-center justify-between"
        style={{
          background: job.earning > 0
            ? 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)'
            : 'var(--theme-status-warning-light)',
          border: `1px solid ${job.earning > 0
            ? 'color-mix(in srgb, var(--theme-brand-primary) 20%, transparent)'
            : 'color-mix(in srgb, var(--theme-status-warning) 20%, transparent)'}`,
        }}
      >
        <p className="text-sm font-semibold" style={{
          color: job.earning > 0 ? 'var(--theme-brand-primary)' : 'var(--theme-status-warning)',
        }}>
          Thu nhập
        </p>
        {job.earning > 0 ? (
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
            {formatCurrencyFull(job.earning)}
          </p>
        ) : (
          <span className="text-xs font-semibold" style={{ color: 'var(--theme-status-warning)' }}>
            Chờ khớp
          </span>
        )}
      </div>

      {/* Edit button for PENDING orders */}
      {job.status === 'PENDING' && (
        <button
          onClick={() => navigate(`/driver/work-orders/${job.id}/edit`)}
          className="w-full h-12 rounded-lg text-base font-bold flex items-center justify-center gap-2 touch-manipulation transition-all active:scale-[0.98]"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Pencil className="w-4 h-4" /> Sửa chuyến
        </button>
      )}
    </div>
    </>
  )
}
