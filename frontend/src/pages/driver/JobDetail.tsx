import { Pencil, Trash2 } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatCurrencyFull, getWorkTypeLabel } from '@/data/domain'
import { useDeliveredTrip, useDeleteDeliveredTrip, useUpdateDeliveredTrip } from '@/hooks/use-queries'
import { DangerConfirmDialog } from '@/components/shared/DangerConfirmDialog/DangerConfirmDialog'
import { DateNavigator } from '@/components/shared/DateNavigator'

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ booked }: { booked: boolean }) {
  if (booked) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold"
        style={{ background: 'rgba(0,90,45,0.12)', color: 'var(--brand, #005A2D)' }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--brand, #005A2D)' }}
        />
        Đã ghép
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold"
      style={{ background: '#FFF1DC', color: '#B6701A' }}
    >
      <span className="w-1.5 h-1.5 rounded-full status-dot-amber" style={{ background: '#B6701A' }} />
      Chờ ghép
    </span>
  )
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="px-4 mb-[18px]">
      <p
        className="text-[10.5px] font-bold uppercase tracking-[0.14em] px-1.5 pb-2.5"
        style={{ color: 'var(--text-3, #8A938F)' }}
      >
        {label}
      </p>
      {children}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function JobDetail() {
  const { jobId: jobIdStr } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const jobId = Number(jobIdStr)
  const { data: job = null, isLoading: loading } = useDeliveredTrip(jobId)
  const deleteTrip = useDeleteDeliveredTrip()
  const updateTrip = useUpdateDeliveredTrip()
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const isMatched = !!job?.bookedTripId

  // Local trip date state — synced from server data, persisted on change
  const [tripDate, setTripDate] = useState<string>('')
  const [tripDateOriginal, setTripDateOriginal] = useState<string>('')

  // Sync local date when job loads
  useEffect(() => {
    if (job) {
      const iso = (job.tripDate ?? job.createdAt).slice(0, 10)
      setTripDate(iso)
      setTripDateOriginal(iso)
    }
  }, [job])

  // Debounce date mutations — rapid arrow tapping only sends the final value
  const dateDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => {
    return () => { if (dateDebounceRef.current) clearTimeout(dateDebounceRef.current) }
  }, [])

  const handleDateChange = useCallback((newDate: string) => {
    const prev = tripDate
    setTripDate(newDate)

    // Clear any pending mutation from a previous tap
    if (dateDebounceRef.current) clearTimeout(dateDebounceRef.current)

    // Debounce: only fire the API call after 300ms of inactivity
    dateDebounceRef.current = setTimeout(() => {
      updateTrip.mutate(
        { id: jobId, data: { tripDate: newDate } },
        { onError: () => setTripDate(prev) },
      )
    }, 300)
  }, [jobId, updateTrip, tripDate])

  function handleDelete() {
    setDeleteDialogOpen(true)
  }

  function confirmDelete() {
    setDeleting(true)
    deleteTrip.mutate(jobId, {
      onSuccess: () => navigate(-1),
      onError: () => setDeleting(false),
    })
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-32 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="h-48 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="h-20 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }} />
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

  const canEdit = !job.bookedTripId
  const contTypeLabel = job.contType ?? null
  const workTypeLabel = getWorkTypeLabel(job.workType) ?? job.workType ?? null

  return (
    <>
      {/* Pulse animation */}
      <style>{`
        @keyframes amberPulse {
          0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(182,112,26,0.5); }
          50%      { opacity:.9; box-shadow:0 0 0 5px rgba(182,112,26,0); }
        }
        .status-dot-amber { animation: amberPulse 1.6s infinite; }
      `}</style>

      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-[15px] font-semibold px-5 pt-[18px] pb-2 mb-1"
        style={{ color: 'var(--brand, #005A2D)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Quay lại
      </button>

      <div className="space-y-0 pb-28">

        {/* ── HERO: light card with container + status ── */}
        <div className="px-4 mb-[18px]">
          <div
            className="rounded-[20px] px-5 py-[18px] relative overflow-hidden"
            style={{
              background: 'radial-gradient(circle at 92% -10%, rgba(0,90,45,0.08) 0%, transparent 45%), linear-gradient(180deg, #FFFFFF 0%, #F0F7F3 100%)',
              boxShadow: '0 10px 28px rgba(0,90,45,0.08)',
              border: '1px solid var(--line, #ECEFEC)',
            }}
          >
            {/* dot grid */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,90,45,0.06) 1px, transparent 0)',
                backgroundSize: '16px 16px',
                maskImage: 'linear-gradient(to left, black, transparent 60%)',
                WebkitMaskImage: 'linear-gradient(to left, black, transparent 60%)',
              }}
            />

            <div className="relative z-10">
              {/* top row */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10.5px] font-bold uppercase tracking-[0.16em]"
                    style={{ color: 'var(--text-3, #8A938F)' }}
                  >
                    Container
                  </span>
                  {contTypeLabel && (
                    <span
                      className="px-2 py-[3px] rounded-[6px] text-[11px] font-bold tracking-[0.6px]"
                      style={{
                        background: 'var(--brand-soft, #E6F2EB)',
                        color: 'var(--brand, #005A2D)',
                        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                      }}
                    >
                      {contTypeLabel}
                    </span>
                  )}
                </div>
                <StatusPill booked={isMatched} />
              </div>

              {/* container number */}
              <div
                className="text-[28px] font-bold leading-none tracking-[0.5px]"
                style={{
                  color: job.contNumber ? 'var(--ink, #0F1714)' : 'rgba(15,23,20,0.3)',
                  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                }}
              >
                {job.contNumber || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ── JOURNEY ── */}
        <Section label="Lịch trình">
          <div
            className="rounded-[18px] px-5 py-5"
            style={{
              background: 'var(--card, #FFFFFF)',
              border: '1px solid var(--line, #ECEFEC)',
              boxShadow: '0 1px 2px rgba(15,23,20,0.04)',
            }}
          >
            {/* date navigator */}
            <div className="mb-4">
              <DateNavigator
                value={tripDate}
                onChange={handleDateChange}
                originalLabel={tripDate !== tripDateOriginal ? (() => {
                  const [y, m, d] = tripDateOriginal.split('-')
                  return `${d}/${m}/${y}`
                })() : null}
                compact
              />
            </div>

            {/* route visualisation */}
            <div className="grid items-center mb-[18px]" style={{ gridTemplateColumns: '1fr auto 1fr', gap: '10px' }}>
              {/* origin */}
              <div className="text-center">
                <div
                  className="w-3.5 h-3.5 rounded-full mx-auto mb-2"
                  style={{
                    background: 'var(--brand, #005A2D)',
                    boxShadow: '0 0 0 4px var(--brand-soft, #E6F2EB)',
                  }}
                />
                <div className="text-[13px] font-bold leading-tight tracking-[0.3px]" style={{ color: 'var(--text, #0F1714)' }}>
                  {job.pickupLocation.name}
                </div>
                <div
                  className="text-[10px] font-semibold uppercase tracking-wide mt-1"
                  style={{ color: 'var(--text-3, #8A938F)' }}
                >
                  Điểm đi
                </div>
              </div>

              {/* middle truck icon */}
              <div className="flex flex-col items-center" style={{ transform: 'translateY(-12px)' }}>
                <div
                  className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center"
                  style={{
                    background: 'var(--brand, #005A2D)',
                    color: '#fff',
                    boxShadow: '0 4px 10px rgba(0,90,45,0.3)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 18H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11" />
                    <path d="M14 9h4l4 4v5h-2" />
                    <path d="M9 18h6" />
                    <circle cx="7" cy="18" r="2" />
                    <circle cx="17" cy="18" r="2" />
                  </svg>
                </div>
                {/* dashed line */}
                <div
                  className="mt-1.5"
                  style={{
                    height: 2,
                    width: 60,
                    backgroundImage: 'linear-gradient(to right, var(--brand, #005A2D) 50%, transparent 50%)',
                    backgroundSize: '6px 2px',
                    backgroundRepeat: 'repeat-x',
                  }}
                />
              </div>

              {/* destination */}
              <div className="text-center">
                <div
                  className="w-3.5 h-3.5 rounded-full mx-auto mb-2"
                  style={{
                    background: '#fff',
                    border: '3px solid var(--brand, #005A2D)',
                  }}
                />
                <div className="text-[13px] font-bold leading-tight tracking-[0.3px]" style={{ color: 'var(--text, #0F1714)' }}>
                  {job.dropoffLocation.name}
                </div>
                <div
                  className="text-[10px] font-semibold uppercase tracking-wide mt-1"
                  style={{ color: 'var(--text-3, #8A938F)' }}
                >
                  Điểm đến
                </div>
              </div>
            </div>

            {/* vessel row */}
            {job.vessel && (
              <div
                className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                style={{
                  background: '#FAFBFA',
                  border: '1px solid var(--line, #ECEFEC)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: '#fff',
                    border: '1px solid var(--line, #ECEFEC)',
                    color: 'var(--brand, #005A2D)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                    <path d="M19.4 13l-.5-2.4a2 2 0 0 0-1.9-1.6H6.9a2 2 0 0 0-1.9 1.6L4.6 13" />
                    <path d="M21 13c-1.2 1.2-3 2-5 2H8c-2 0-3.8-.8-5-2" />
                  </svg>
                </div>
                <div>
                  <div
                    className="text-[10.5px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-3, #8A938F)' }}
                  >
                    Số tàu
                  </div>
                  <div
                    className="text-[14px] font-bold mt-0.5 tracking-[0.3px]"
                    style={{
                      color: 'var(--text, #0F1714)',
                      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    }}
                  >
                    {job.vessel}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── CUSTOMER & OPERATION — 2-col grid ── */}
        <Section label="Khách hàng & Tác nghiệp">
          <div
            className="rounded-[18px] overflow-hidden p-1"
            style={{
              background: 'var(--card, #FFFFFF)',
              border: '1px solid var(--line, #ECEFEC)',
              boxShadow: '0 1px 2px rgba(15,23,20,0.04)',
            }}
          >
            <div className="grid grid-cols-2">
              {/* client */}
              <div className="px-3.5 py-4">
                <div
                  className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--text-3, #8A938F)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
                    <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
                  </svg>
                  Chủ hàng
                </div>
                <div
                  className="text-[13.5px] font-bold leading-snug"
                  style={{ color: 'var(--text, #0F1714)' }}
                >
                  {job.client.name || '—'}
                </div>
              </div>

              {/* operation */}
              <div
                className="px-3.5 py-4"
                style={{ borderLeft: '1px solid var(--line, #ECEFEC)' }}
              >
                <div
                  className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--text-3, #8A938F)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  Tác nghiệp
                </div>
                <div
                  className="text-[14px] font-bold leading-snug"
                  style={{ color: 'var(--text, #0F1714)' }}
                >
                  {workTypeLabel || '—'}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── INCOME — only for matched trips ── */}
        {isMatched && (
          <Section label="Thu nhập">
            <div
              className="rounded-[18px] px-5 py-[18px] relative overflow-hidden"
              style={{
                background: job.driverSalary > 0
                  ? 'linear-gradient(135deg, #007E3E 0%, #005A2D 60%, #003E1F 100%)'
                  : 'var(--brand-softer, #F0F7F3)',
                boxShadow: job.driverSalary > 0
                  ? '0 10px 24px rgba(0,90,45,0.25)'
                  : 'none',
                border: job.driverSalary > 0
                  ? 'none'
                  : '1px solid rgba(0,90,45,0.12)',
              }}
            >
              {/* gloss overlays */}
              {job.driverSalary > 0 && (
                <>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.18) 0%, transparent 40%), radial-gradient(circle at 0% 100%, rgba(255,255,255,0.08) 0%, transparent 50%)',
                    }}
                  />
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: '-50%', right: '-10%',
                      width: 200, height: 200,
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '50%',
                    }}
                  />
                </>
              )}

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: job.driverSalary > 0
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(0,90,45,0.08)',
                      color: job.driverSalary > 0 ? '#fff' : 'var(--brand, #005A2D)',
                    }}
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div>
                    <div
                      className="text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                      style={{ color: job.driverSalary > 0 ? 'rgba(255,255,255,0.7)' : 'var(--brand, #005A2D)' }}
                    >
                      Thu nhập
                    </div>
                    <div
                      className="text-[13px] font-semibold mt-0.5"
                      style={{ color: job.driverSalary > 0 ? 'rgba(255,255,255,0.9)' : 'var(--text-2, #5B6661)' }}
                    >
                      Chuyến này
                    </div>
                  </div>
                </div>

                {job.driverSalary > 0 ? (
                  <div className="flex items-baseline gap-0.5">
                    <span
                      className="text-[22px] font-extrabold tabular-nums leading-none"
                      style={{ color: '#fff', letterSpacing: '-0.3px' }}
                    >
                      {formatCurrencyFull(job.driverSalary)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-3, #8A938F)' }}>
                    Chưa tính
                  </span>
                )}
              </div>
            </div>
          </Section>
        )}

      </div>

      {/* ── Sticky action bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={{
          background: 'color-mix(in srgb, var(--card, #fff) 92%, transparent)',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          borderTop: '1px solid var(--line, #ECEFEC)',
        }}
      >
        {canEdit ? (
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-[14px] flex items-center justify-center shrink-0 transition-all active:scale-[0.97]"
              style={{
                height: 52,
                width: 52,
                background: '#fff',
                color: 'var(--danger, #C0392B)',
                border: '1.5px solid #FDECEA',
                opacity: deleting ? 0.5 : 1,
              }}
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate(`/driver/delivered-trips/${job.id}/edit`)}
              className="flex-1 rounded-[14px] text-[15px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: 'var(--brand, #005A2D)',
                color: '#fff',
                height: 52,
                boxShadow: '0 8px 20px rgba(0,90,45,0.28)',
              }}
            >
              <Pencil className="w-4 h-4" /> Sửa chuyến
            </button>
          </div>
        ) : (
          <p className="text-center text-xs py-2" style={{ color: 'var(--text-3, #8A938F)' }}>
            Chuyến đã được ghép — không thể chỉnh sửa
          </p>
        )}
      </div>
      <DangerConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Xoá chuyến"
        entityName={job.contNumber || 'chuyến này'}
        loading={deleting}
      />
    </>
  )
}
