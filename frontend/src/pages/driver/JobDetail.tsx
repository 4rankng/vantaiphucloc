import {
  Calendar, Building2, Ship, Package2, CheckCircle2, Clock,
  MapPin, ArrowRight, Pencil, Wrench, Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatCurrencyFull, getWorkTypeLabel } from '@/data/domain'
import { useDeliveredTrip, useDeleteDeliveredTrip } from '@/hooks/use-queries'

// ── Group card with a small uppercase label above ─────────────────────────────
function GroupCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <p
        className="text-[10px] font-bold uppercase tracking-[0.12em] px-1"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        {label}
      </p>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--theme-bg-secondary)',
          boxShadow: 'var(--theme-shadow-card)',
          border: '1px solid var(--theme-border-default)',
        }}
      >
        {children}
      </div>
    </section>
  )
}

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
  const deleteTrip = useDeleteDeliveredTrip()
  const [deleting, setDeleting] = useState(false)

  function handleDelete() {
    if (!window.confirm('Bạn có chắc muốn xóa chuyến này không?')) return
    setDeleting(true)
    deleteTrip.mutate(jobId, {
      onSuccess: () => navigate(-1),
      onError: () => setDeleting(false),
    })
  }

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

      <div className="space-y-3 pb-28">

        {/* ── Hero: cont number + type + status ── */}
        <section className="space-y-1.5">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em] px-1"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            Container
          </p>
        <div
          className="rounded-xl px-4 py-3.5 flex items-center justify-between gap-3"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
            boxShadow: 'var(--theme-shadow-card)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="text-[22px] font-bold font-mono tracking-wide"
              style={{ color: job.contNumber ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}
            >
              {job.contNumber || '—'}
            </span>
            {contTypeLabel && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-md shrink-0"
                style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)', color: 'var(--theme-brand-primary)' }}
              >
                {contTypeLabel}
              </span>
            )}
          </div>
          {job.bookedTripId ? (
            <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full shrink-0"
              style={{ background: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã ghép
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full shrink-0"
              style={{ background: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' }}>
              <Clock className="w-3.5 h-3.5" /> Chờ ghép
            </span>
          )}
        </div>
        </section>

        {/* ── Lịch trình group ── */}
        <GroupCard label="Lịch trình">
          <Field icon={Calendar} label="Ngày đi" value={dateStr} />
          <Field icon={Ship}     label="Số tàu"  value={job.vessel ?? null} />
          {/* Combined route row — last in the group, no border */}
          <div className="flex items-start gap-3 px-4 py-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'var(--theme-bg-tertiary)' }}
            >
              <RouteIcon style={{ color: 'var(--theme-text-muted)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>Tuyến đường</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--theme-text-primary)' }}>
                {job.pickupLocation.name}
                <span className="mx-1.5 font-normal" style={{ color: 'var(--theme-text-muted)' }}>→</span>
                {job.dropoffLocation.name}
              </p>
            </div>
          </div>
        </GroupCard>

        {/* ── Khách hàng & Tác nghiệp group ── */}
        <GroupCard label="Khách hàng & Tác nghiệp">
          <Field icon={Building2} label="Chủ hàng"   value={job.client.name} />
          <Field icon={Wrench}    label="Tác nghiệp" value={workTypeLabel} last />
        </GroupCard>

        {/* ── Earning card ── */}
        <section className="space-y-1.5">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em] px-1"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            Thu nhập
          </p>
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
          <p className="text-xs font-semibold"
            style={{ color: job.driverSalary > 0 ? 'var(--theme-brand-primary)' : 'var(--theme-status-warning)' }}>
            Thu nhập chuyến
          </p>
          {job.driverSalary > 0 ? (
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
              {formatCurrencyFull(job.driverSalary)}
            </p>
          ) : (
            <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa tính</span>
          )}
        </div>
        </section>
      </div>

      {/* ── Sticky action bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={{
          background: 'color-mix(in srgb, var(--theme-bg-primary, #fff) 92%, transparent)',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          borderTop: '1px solid var(--theme-border-default)',
        }}
      >
        {canEdit ? (
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl font-bold flex items-center justify-center gap-2 touch-manipulation transition-all active:scale-[0.98] shrink-0"
              style={{
                height: '52px',
                width: '52px',
                background: 'color-mix(in srgb, var(--theme-status-danger, #dc2626) 10%, transparent)',
                color: 'var(--theme-status-danger, #dc2626)',
                border: '1px solid color-mix(in srgb, var(--theme-status-danger, #dc2626) 20%, transparent)',
                opacity: deleting ? 0.5 : 1,
              }}
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate(`/driver/delivered-trips/${job.id}/edit`)}
              className="flex-1 rounded-xl text-base font-bold flex items-center justify-center gap-2 touch-manipulation transition-all active:scale-[0.98]"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', height: '52px' }}
            >
              <Pencil className="w-4 h-4" /> Sửa chuyến
            </button>
          </div>
        ) : (
          <p className="text-center text-xs py-2" style={{ color: 'var(--theme-text-muted)' }}>
            Chuyến đã được ghép — không thể chỉnh sửa
          </p>
        )}
      </div>
    </>
  )
}
