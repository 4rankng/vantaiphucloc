import {
  Calendar, Building2, Ship, Package2, CheckCircle2, Clock,
  MapPin, ArrowRight, Pencil, Wrench,
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatCurrencyFull, getWorkTypeLabel } from '@/data/domain'
import { useDeliveredTrip } from '@/hooks/use-queries'

// ── Simple label+value row ─────────────────────────────────────────────────────
function Field({
  icon: Icon,
  label,
  value,
  mono = false,
  last = false,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  value: React.ReactNode
  mono?: boolean
  last?: boolean
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3"
      style={last ? undefined : { borderBottom: '1px solid var(--theme-border-light)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'var(--theme-bg-tertiary)' }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
        <p
          className={`text-sm font-semibold mt-0.5 ${mono ? 'font-mono tracking-wide' : ''}`}
          style={{ color: value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}
        >
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

// ── Route icon (two map pins with arrow) ──────────────────────────────────────
function RouteIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`inline-flex items-center gap-px ${className ?? ''}`} style={style}>
      <MapPin className="w-3 h-3" />
      <ArrowRight className="w-2.5 h-2.5" />
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function JobDetail() {
  const { jobId: jobIdStr } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const jobId = Number(jobIdStr)
  const { data: job = null, isLoading: loading } = useDeliveredTrip(jobId)

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-10 rounded-xl w-1/3" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="h-64 rounded-xl" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="h-16 rounded-xl" style={{ background: 'var(--theme-bg-tertiary)' }} />
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

  const date = new Date(job.tripDate ?? job.createdAt)
  const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const canEdit = !job.bookedTripId
  const contTypeLabel = job.contType ?? null
  const workTypeLabel = getWorkTypeLabel(job.workType) ?? job.workType ?? null

  return (
    <>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm mb-4"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Quay lại
      </button>

      <div className="space-y-3 pb-24">

        {/* ── Status badge row ── */}
        <div className="flex items-center justify-between px-1">
          <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Chi tiết chuyến
          </p>
          {job.bookedTripId ? (
            <span
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã ghép
            </span>
          ) : (
            <span
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}
            >
              <Clock className="w-3.5 h-3.5" /> Chờ ghép
            </span>
          )}
        </div>

        {/* ── All trip fields in one card ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
        >
          <Field icon={Calendar}   label="Ngày đi"    value={dateStr} />
          <Field icon={Building2}  label="Chủ hàng"   value={job.client.name} />
          <Field icon={Ship}       label="Số tàu"     value={job.vessel ?? null} />
          <Field icon={Package2}   label="Số Cont"    value={job.contNumber} mono />
          <Field
            icon={({ className, style }) => (
              <span className={className} style={style}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
              </span>
            )}
            label="Loại Cont"
            value={contTypeLabel}
          />
          <Field
            icon={({ className, style }) => <MapPin className={className} style={style} />}
            label="Điểm đi"
            value={job.pickupLocation.name}
          />
          <Field
            icon={({ className, style }) => <RouteIcon className={className} style={style} />}
            label="Điểm đến"
            value={job.dropoffLocation.name}
          />
          <Field icon={Wrench} label="Tác nghiệp" value={workTypeLabel} last />
        </div>

        {/* ── Earning card ── */}
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{
            background: job.driverSalary > 0
              ? 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)'
              : 'var(--theme-status-warning-light)',
            border: `1px solid ${job.driverSalary > 0
              ? 'color-mix(in srgb, var(--theme-brand-primary) 20%, transparent)'
              : 'color-mix(in srgb, var(--theme-status-warning) 20%, transparent)'}`,
          }}
        >
          <div>
            <p
              className="text-xs font-semibold mb-0.5"
              style={{ color: job.driverSalary > 0 ? 'var(--theme-brand-primary)' : 'var(--theme-status-warning)' }}
            >
              Thu nhập chuyến
            </p>
          </div>
          {job.driverSalary > 0 ? (
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
              {formatCurrencyFull(job.driverSalary)}
            </p>
          ) : (
            <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa tính</span>
          )}
        </div>

        {/* ── Edit button — only while not matched ── */}
        {canEdit ? (
          <button
            onClick={() => navigate(`/driver/delivered-trips/${job.id}/edit`)}
            className="w-full rounded-xl text-base font-bold flex items-center justify-center gap-2 touch-manipulation transition-all active:scale-[0.98]"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', height: '52px' }}
          >
            <Pencil className="w-4 h-4" /> Sửa chuyến
          </button>
        ) : (
          <p className="text-center text-xs py-1" style={{ color: 'var(--theme-text-muted)' }}>
            Chuyến đã được ghép — không thể chỉnh sửa
          </p>
        )}
      </div>
    </>
  )
}
