import { useNavigate } from 'react-router-dom'
import {
  ScanLine, RotateCcw, Trash2, AlertCircle, Loader2, Plus,
  ChevronLeft, CheckCircle2, Container as ContainerIcon, Ship, MapPin,
  WifiOff, Sparkles, Calendar, Lock,
} from 'lucide-react'
import { getWorkTypeLabel } from '@/data/domain'
import { ContainerScanner } from '@/components/shared/ContainerScanner'
import { ContainerTypeGrid } from '@/components/shared/ContainerTypeGrid'
import { TripSummaryDialog } from '@/components/shared/TripSummaryDialog'
import { SuccessOverlay } from '@/components/shared/SuccessOverlay'
import { AIScanningOverlay } from '@/components/shared/AIScanningOverlay'
import { RecentTripSuggestions } from '@/components/shared/RecentTripSuggestions'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { LocationSelect } from '@/components/shared/LocationSelect/LocationSelect'
import { useCreateDeliveredTrip } from './useCreateDeliveredTrip'
import { useToast } from '@/components/atoms/Toast'
import type { DeliveredTrip } from '@/data/domain'

/**
 * CreateDeliveredTrip — mobile-first redesign
 *
 * Layout (top → bottom):
 *   ① Page header     — back arrow + title + step pills
 *   ② Container card  — scan / number / type / operation
 *   ③ Vessel section  — small standalone field
 *   ④ Customer route  — suggestions + client / pickup / dropoff
 *   ⑤ Sticky CTA bar  — missing-fields hint + back + submit
 */
export function CreateDeliveredTrip({ existingDeliveredTrip }: { existingDeliveredTrip?: DeliveredTrip | null }) {
  const {
    isEdit, original,
    clients, recentOrders,
    containers, clientId, vessel, pickupLocation, dropoffLocation,
    selectedTripId,
    submitting, scannerOpen, isOnline, summaryOpen, showSuccess,
    forceManualEntry, missingFields, containerErrors, containerSuggestions, suggestionLoading,
    canSubmit, summaryContNumber, summaryContType, summaryClientName,
    setClientId, setVessel, setPickupLocation, setDropoffLocation,
    openScanner, handleScanComplete, setScannerOpen,
    updateContainer, addContainer, removeContainer, validateContainerOnBlur,
    applyContainerSuggestion,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit, setSummaryOpen,
  } = useCreateDeliveredTrip(existingDeliveredTrip)

  const navigate = useNavigate()
  const toast = useToast()

  // The first container with an in-flight OCR request — feeds the AI scanning
  // overlay so the driver sees their captured photo being "scanned" while the
  // backend runs OCR. We pick the first one rather than tracking which row
  // started scanning because OCR is one-at-a-time in practice.
  const scanningContainer = containers.find(c => c.ocrLoading)

  const handleConfirmSubmit = async () => {
    try {
      await confirmSubmit()
    } catch {
      toast.error('Gửi thất bại', 'Vui lòng thử lại')
    }
  }

  return (
    <div className="-mx-4 -my-4 pb-32">
      {/* Scanner overlay */}
      {scannerOpen && (
        <ContainerScanner
          onCapture={handleScanComplete}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* ─────────────────────────── ① Page header ─────────────────────────── */}
      <div
        className="px-4 pt-4 pb-3"
        style={{
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--theme-brand-primary) 6%, transparent) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Quay lại"
            className="w-9 h-9 flex items-center justify-center rounded-full touch-manipulation active:scale-95 transition-transform"
            style={{
              background: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border-default)',
              color: 'var(--theme-text-primary)',
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-bold leading-tight truncate" style={{ color: 'var(--theme-text-primary)' }}>
              {isEdit ? 'Sửa chuyến' : 'Tạo chuyến mới'}
            </h1>
            <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
              {isEdit ? 'Cập nhật thông tin chuyến đã giao' : 'Nhập thông tin chuyến vừa giao xong'}
            </p>
          </div>
          {!isOnline && (
            <span
              className="flex items-center gap-1 h-7 px-2 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ background: 'var(--theme-status-warning-light, #fef3c7)', color: 'var(--theme-status-warning, #b45309)' }}
            >
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
        </div>

        {/* Edit mode: show the locked Ngày đi so driver knows the date can't be changed here */}
        {isEdit && original && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border-default)',
            }}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
              Ngày đi:
            </span>
            <span className="text-[13px] font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              {original.tripDateLabel}
            </span>
            <span
              className="ml-auto flex items-center gap-1 text-[10px] font-semibold"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              <Lock className="w-3 h-3" /> Không thể đổi
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-2 space-y-6">

        {/* ────────────────────── ② Container section ────────────────────── */}
        <Section
          icon={<ContainerIcon className="w-3.5 h-3.5" />}
          label="Container"
          hint={containers.length > 1 ? `${containers.length} cont` : 'Quét hoặc nhập số'}
        >
          <div className="space-y-3">
            {containers.map((cont, idx) => {
              const scanState =
                cont.ocrLoading ? 'loading'
                : cont.photoTaken && !cont.ocrError ? 'done'
                : cont.photoTaken && cont.ocrError ? 'retry'
                : 'idle'

              return (
                <div
                  key={idx}
                  className="rounded-2xl p-3.5 space-y-3 transition-all"
                  style={{
                    background: 'var(--theme-bg-secondary)',
                    border: `1px solid ${
                      containerErrors[idx]
                        ? 'var(--theme-status-error)'
                        : cont.containerNumber
                          ? 'color-mix(in srgb, var(--theme-brand-primary) 30%, transparent)'
                          : 'var(--theme-border-default)'
                    }`,
                    boxShadow: 'var(--theme-shadow-card)',
                  }}
                >
                  {/* Number input + Scan CTA + delete — single row.
                      Input is capped at ~260px (enough for MSKU1234567 + slack);
                      anything wider just leaves clean breathing room on desktop. */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0 max-w-[260px]">
                      <input
                        value={cont.containerNumber}
                        onChange={e => updateContainer(idx, 'containerNumber', e.target.value)}
                        onBlur={() => validateContainerOnBlur(idx)}
                        className="w-full h-12 rounded-xl pl-4 text-base font-mono font-semibold tracking-wider uppercase [&::placeholder]:opacity-40 [&::placeholder]:font-normal [&::placeholder]:tracking-normal [&::placeholder]:normal-case"
                        style={{
                          background: 'var(--theme-bg-tertiary)',
                          border: `1.5px solid ${
                            containerErrors[idx]
                              ? 'var(--theme-status-error)'
                              : cont.containerNumber
                                ? 'var(--theme-brand-primary)'
                                : 'transparent'
                          }`,
                          color: 'var(--theme-text-primary)',
                          paddingRight: cont.ocrLoading ? '44px' : '14px',
                        }}
                        placeholder={cont.ocrLoading ? 'Đang nhận diện...' : 'MSKU1234567'}
                        readOnly={cont.ocrLoading}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        inputMode="text"
                        maxLength={12}
                      />
                      {cont.ocrLoading && (
                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: 'var(--theme-brand-primary)' }} />
                      )}
                    </div>

                    {/* Scan CTA */}
                    <button
                      onClick={openScanner(idx)}
                      aria-label="Quét số container bằng camera"
                      type="button"
                      className="flex items-center gap-1 h-12 px-3 rounded-xl text-xs font-bold touch-manipulation transition-all active:scale-[0.96] shrink-0"
                      style={
                        scanState === 'done'
                          ? {
                              background: 'var(--theme-status-success-light, #d1fae5)',
                              color: 'var(--theme-status-success, #047857)',
                              border: '1px solid color-mix(in srgb, var(--theme-status-success, #047857) 25%, transparent)',
                            }
                          : scanState === 'retry'
                          ? {
                              background: 'var(--theme-status-warning-light, #fef3c7)',
                              color: 'var(--theme-status-warning, #b45309)',
                              border: '1px solid color-mix(in srgb, var(--theme-status-warning, #b45309) 25%, transparent)',
                            }
                          : {
                              background: 'var(--theme-brand-primary)',
                              color: 'var(--theme-text-on-brand, #fff)',
                              border: '1px solid var(--theme-brand-primary)',
                            }
                      }
                    >
                      {scanState === 'loading' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : scanState === 'done' ? (
                        <><CheckCircle2 className="w-4 h-4" /> Đã quét</>
                      ) : scanState === 'retry' ? (
                        <><RotateCcw className="w-4 h-4" /> Quét lại</>
                      ) : (
                        <><ScanLine className="w-4 h-4" /> Quét</>
                      )}
                    </button>

                    {containers.length > 1 && (
                      <button
                        onClick={() => removeContainer(idx)}
                        aria-label="Xoá container"
                        type="button"
                        className="w-12 h-12 flex items-center justify-center rounded-xl touch-manipulation active:scale-95 transition-transform shrink-0 ml-auto"
                        style={{
                          background: 'var(--theme-status-error-light, #fee2e2)',
                          border: '1px solid color-mix(in srgb, var(--theme-status-error) 20%, transparent)',
                        }}
                      >
                        <Trash2 className="w-4 h-4" style={{ color: 'var(--theme-status-error)' }} />
                      </button>
                    )}
                  </div>

                  {/* Edit-mode hint: show prior cont number if changed (only on the first row,
                      which is the one that maps to the existing trip — additional rows are
                      always new and don't have a prior value). */}
                  {isEdit && idx === 0 && original && (
                    <OriginalHint current={cont.containerNumber} original={original.contNumber} />
                  )}

                  {/* Two independent groups: Loại cont (E20/E40/F20/F40) + Tác nghiệp */}
                  <ContainerTypeGrid
                    contType={cont.contType}
                    workType={cont.workType}
                    onContTypeChange={(ct) => updateContainer(idx, 'contType', ct)}
                    onWorkTypeChange={(wt) => updateContainer(idx, 'workType', wt)}
                  />

                  {/* Edit-mode hint: show prior contType / workType if changed */}
                  {isEdit && idx === 0 && original && (
                    <div className="space-y-0.5">
                      <OriginalHint
                        current={cont.contType ?? ''}
                        original={original.contType ?? ''}
                      />
                      <OriginalHint
                        current={getWorkTypeLabel(cont.workType) ?? cont.workType ?? ''}
                        original={getWorkTypeLabel(original.workType) ?? original.workType ?? ''}
                      />
                    </div>
                  )}

                  {/* Status messages */}
                  {(forceManualEntry || containerErrors[idx] || cont.ocrError || (containerSuggestions[idx]?.length ?? 0) > 0) && !cont.ocrLoading && (
                    <div className="space-y-1.5 pt-0.5">
                      {forceManualEntry && (
                        <Hint tone="warning" text="Vui lòng nhập tay số cont" />
                      )}
                      {containerErrors[idx] && (
                        <Hint tone="error" text={containerErrors[idx]} />
                      )}
                      {cont.ocrError && !containerErrors[idx] && (
                        <Hint tone="warning" text={`${cont.ocrError} — nhập tay hoặc quét lại`} />
                      )}

                      {/* Server-suggested corrections — tap one to auto-fill */}
                      {(containerSuggestions[idx]?.length ?? 0) > 0 && (
                        <SuggestionChips
                          original={cont.containerNumber}
                          suggestions={containerSuggestions[idx]!}
                          onPick={(s) => applyContainerSuggestion(idx, s)}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add cont — hidden in edit mode. The edit flow only persists a single
                container (the one that belongs to the existing trip); offering "Thêm
                container" here would create rows that get silently dropped on submit. */}
            {!isEdit && (
              <button
                onClick={addContainer}
                type="button"
                className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 touch-manipulation transition-all active:scale-[0.98]"
                style={{
                  background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)',
                  color: 'var(--theme-brand-primary)',
                  border: '1.5px dashed color-mix(in srgb, var(--theme-brand-primary) 40%, transparent)',
                }}
              >
                <Plus className="w-4 h-4" /> Thêm container
              </button>
            )}
          </div>
        </Section>

        {/* ────────────────────── ③ Vessel section ────────────────────── */}
        <Section
          icon={<Ship className="w-3.5 h-3.5" />}
          label="Tàu"
          hint="Số tàu (nếu có)"
        >
          <input
            value={vessel}
            onChange={e => setVessel(e.target.value)}
            placeholder="VD: SITC HAKATA V.2451N"
            className="w-full h-12 rounded-xl px-4 text-sm font-medium"
            style={{
              background: 'var(--theme-bg-secondary)',
              border: `1.5px solid ${vessel ? 'color-mix(in srgb, var(--theme-brand-primary) 30%, transparent)' : 'var(--theme-border-default)'}`,
              color: 'var(--theme-text-primary)',
              boxShadow: 'var(--theme-shadow-card)',
            }}
            autoCapitalize="characters"
          />
          {isEdit && original && (
            <OriginalHint current={vessel} original={original.vessel} />
          )}
        </Section>

        {/* ────────────────────── ④ Customer & route ────────────────────── */}
        <Section
          icon={<MapPin className="w-3.5 h-3.5" />}
          label="Khách & Tuyến"
          hint={recentOrders.length > 0 ? 'Chọn nhanh từ lịch sử' : 'Chọn khách hàng và tuyến'}
          accent={recentOrders.length > 0}
        >
          <div className="space-y-3">
            {!isEdit && recentOrders.length > 0 && (
              <RecentTripSuggestions
                suggestions={recentOrders}
                selectedTripId={selectedTripId ?? undefined}
                onSelect={handleRecentTripSelect}
                loading={suggestionLoading}
              />
            )}

            <Field label="Khách hàng" required>
              <InlineSelect
                placeholder="Chọn khách hàng"
                value={clientId}
                options={clients.map(c => ({
                  value: String(c.id),
                  label: c.code ? `${c.code} - ${c.name}` : c.name,
                  sublabel: c.code ? undefined : c.phone,
                }))}
                onChange={setClientId}
              />
              {isEdit && original && (
                <OriginalHint
                  current={clients.find(c => String(c.id) === clientId)?.name ?? ''}
                  original={original.clientName}
                />
              )}
            </Field>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Field label="Điểm đi" required>
                <LocationSelect
                  placeholder="Chọn điểm đi"
                  value={pickupLocation}
                  onChange={(val: string) => {
                    setPickupLocation(val)
                    setDropoffLocation('')
                  }}
                />
                {isEdit && original && (
                  <OriginalHint current={pickupLocation} original={original.pickupLocation} />
                )}
              </Field>

              <Field label="Điểm đến" required>
                <LocationSelect
                  placeholder="Chọn điểm đến"
                  value={dropoffLocation}
                  onChange={setDropoffLocation}
                />
                {isEdit && original && (
                  <OriginalHint current={dropoffLocation} original={original.dropoffLocation} />
                )}
              </Field>
            </div>
          </div>
        </Section>
      </div>

      {/* ─────────────────────────── ⑤ Sticky submit bar ─────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={{
          background: 'color-mix(in srgb, var(--theme-bg-primary, #fff) 92%, transparent)',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          borderTop: '1px solid var(--theme-border-default)',
        }}
      >
        <div className="max-w-2xl mx-auto space-y-2">
          {missingFields.length > 0 && !canSubmit && (
            <p className="text-[11px] font-medium text-center leading-tight" style={{ color: 'var(--theme-status-warning, #b45309)' }}>
              <span className="font-bold">Còn thiếu:</span> {missingFields.join(', ')}
            </p>
          )}
          {missingFields.length === 0 && !canSubmit && Object.keys(containerErrors).length > 0 && (
            <p className="text-[11px] font-medium text-center" style={{ color: 'var(--theme-status-error)' }}>
              Số container không hợp lệ — vui lòng kiểm tra
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              type="button"
              className="h-12 w-12 rounded-xl flex items-center justify-center touch-manipulation transition-all active:scale-[0.96] shrink-0"
              style={{
                background: 'var(--theme-bg-secondary)',
                color: 'var(--theme-text-primary)',
                border: '1.5px solid var(--theme-border-default)',
              }}
              aria-label="Quay lại"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onRequestSubmit}
              disabled={!canSubmit || submitting}
              type="button"
              className="flex-1 h-12 rounded-xl text-sm font-bold touch-manipulation transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
              style={{
                background: canSubmit
                  ? 'var(--theme-brand-primary)'
                  : 'var(--theme-bg-tertiary)',
                color: canSubmit ? 'var(--theme-text-on-brand, #fff)' : 'var(--theme-text-muted)',
                boxShadow: canSubmit
                  ? '0 4px 14px color-mix(in srgb, var(--theme-brand-primary) 35%, transparent)'
                  : 'none',
              }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
              ) : isEdit ? (
                <><CheckCircle2 className="w-4 h-4" /> Cập nhật chuyến</>
              ) : isOnline ? (
                <><CheckCircle2 className="w-4 h-4" /> Xác nhận chuyến</>
              ) : (
                <><WifiOff className="w-4 h-4" /> Lưu offline</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary dialog */}
      <TripSummaryDialog
        open={summaryOpen}
        onConfirm={handleConfirmSubmit}
        onClose={() => setSummaryOpen(false)}
        contNumber={summaryContNumber}
        contType={summaryContType}
        clientName={summaryClientName}
        vessel={vessel}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
      />

      {/* AI scanning overlay — visible while backend OCR is in flight */}
      <AIScanningOverlay
        visible={!!scanningContainer}
        imageSrc={scanningContainer?.photoDataUrl ?? null}
      />

      {/* Success overlay */}
      <SuccessOverlay visible={showSuccess} />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Local presentational helpers                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function Section({
  icon, label, hint, accent, children,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{
              background: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)',
              color: 'var(--theme-brand-primary)',
            }}
          >
            {icon}
          </span>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--theme-text-primary)' }}>
            {label}
          </h2>
        </div>
        {hint && (
          <p
            className="text-[10px] font-semibold"
            style={{ color: accent ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}
          >
            {hint}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-semibold flex items-center gap-1" style={{ color: 'var(--theme-text-primary)' }}>
        {label}
        {required && <span style={{ color: 'var(--theme-status-error)' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

/**
 * OriginalHint — small dimmed "Trước: <value>" caption shown below an input
 * in edit mode when the current value differs from the saved original.
 *
 * Helps the driver see what they're changing without re-opening the detail page.
 * Renders nothing when current === original (or original is empty) so the
 * caption only appears for fields the driver has actually edited.
 */
function OriginalHint({ current, original }: { current: string; original: string }) {
  if (!original) return null
  if ((current ?? '').trim() === original.trim()) return null
  return (
    <p
      className="text-[11px] font-medium pl-1 flex items-center gap-1"
      style={{ color: 'var(--theme-text-muted)' }}
    >
      <span style={{ opacity: 0.7 }}>Trước:</span>
      <span className="line-through" style={{ opacity: 0.85 }}>{original}</span>
    </p>
  )
}

function Hint({ tone, text }: { tone: 'warning' | 'error'; text: string }) {
  const color =
    tone === 'error' ? 'var(--theme-status-error)' : 'var(--theme-status-warning, #b45309)'
  return (
    <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color }}>
      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {text}
    </p>
  )
}

/**
 * SuggestionChips — server-suggested corrections for a failed container number.
 *
 * Renders up to 3 tappable chips. Each chip shows the candidate with the
 * positions that differ from `original` highlighted in bold so the driver can
 * see at a glance which digit changed.
 */
function SuggestionChips({
  original, suggestions, onPick,
}: {
  original: string
  suggestions: string[]
  onPick: (s: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <p
        className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1"
        style={{ color: 'var(--theme-brand-primary)' }}
      >
        <Sparkles className="w-3 h-3" /> Gợi ý sửa
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="h-9 px-2.5 rounded-lg text-[13px] font-mono font-semibold tracking-wide touch-manipulation transition-all active:scale-[0.96]"
            style={{
              background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)',
              color: 'var(--theme-text-primary)',
              border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 35%, transparent)',
            }}
            aria-label={`Sửa thành ${s}`}
          >
            <DiffText original={original} candidate={s} />
          </button>
        ))}
      </div>
    </div>
  )
}

/** Render `candidate` with characters that differ from `original` in brand color. */
function DiffText({ original, candidate }: { original: string; candidate: string }) {
  const orig = (original || '').toUpperCase().replace(/-/g, '')
  const cand = candidate || ''
  return (
    <span>
      {cand.split('').map((ch, i) => {
        const changed = orig ? orig.charAt(i) !== ch : false
        return (
          <span
            key={i}
            style={changed ? { color: 'var(--theme-brand-primary)', fontWeight: 800 } : undefined}
          >
            {ch}
          </span>
        )
      })}
    </span>
  )
}
