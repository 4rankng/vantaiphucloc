import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, Loader2, Plus,
  ChevronLeft, CheckCircle2, Container as ContainerIcon, Ship, MapPin,
  Sparkles, Camera, StickyNote, X,
} from 'lucide-react'
import { getWorkTypeLabel } from '@/data/domain'
import { ContainerScanner } from '@/components/shared/overlays/ContainerScanner'
import { ContainerTypeGrid } from '@/components/shared/data-display/ContainerTypeGrid'
import { TripSummaryDialog } from '@/components/shared/overlays/TripSummaryDialog'
import { SuccessOverlay } from '@/components/shared/feedback/SuccessOverlay'
import { AIScanningOverlay } from '@/components/shared/feedback/AIScanningOverlay'
import { RecentTripSuggestions } from '@/components/shared/cards/RecentTripSuggestions'
import { InlineSelect } from '@/components/shared/forms/InlineSelect'
import { RecentValuesInput } from '@/components/shared/forms/RecentValuesInput'
import { LocationSelect } from '@/components/shared/forms/LocationSelect/LocationSelect'
import { DateNavigator } from '@/components/shared/navigation/DateNavigator'
import { useCreateDeliveredTrip } from './useCreateDeliveredTrip'
import { useOperationTypes } from '@/hooks/queries/operation-types'
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
    recentVessels,
    recentNotes,
    containers, clientId, vessel, note, pickupLocation, dropoffLocation, tripDate,
    selectedTripId,
    submitting, scannerOpen, summaryOpen, showSuccess,
    forceManualEntry, missingFields, containerErrors, containerSuggestions, suggestionLoading,
    canSubmit, summaryContNumber, summaryContType, summaryWorkType, summaryClientName,
    hasAnyPhoto, containerCount,
    tripDateLabel,
    setClientId, setVessel, setNote, setPickupLocation, setDropoffLocation, setTripDate,
    openScanner, handleScanComplete, setScannerOpen,
    updateContainer, addContainer, removeContainer, validateContainerOnBlur,
    applyContainerSuggestion,
    updateAllContType, updateAllWorkType, scanNewContainer,
    addContainerWithNumber,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit, setSummaryOpen,
  } = useCreateDeliveredTrip(existingDeliveredTrip)
  const { data: operationTypes } = useOperationTypes()

  const navigate = useNavigate()
  const toast = useToast()

  // Staging input for manual container number entry — committed to container
  // array on + or Enter, not bound to any specific container until then.
  const [stagingNumber, setStagingNumber] = useState('')
  const [stagingError, setStagingError] = useState<string | null>(null)

  const commitStagingNumber = useCallback(() => {
    const num = stagingNumber.trim().toUpperCase().replace(/-/g, '')
    if (!num) return
    if (num.length !== 11 || !/^[A-Z]{4}\d{7}$/.test(num)) {
      setStagingError('Sai định dạng. Đúng: 4 chữ cái + 7 số')
      return
    }
    setStagingError(null)
    addContainerWithNumber(num)
    setStagingNumber('')
  }, [stagingNumber, addContainerWithNumber])

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
        </div>

        {/* Ngày đi — left/right navigator for easy mobile use */}
        <DateNavigator
          value={tripDate}
          onChange={setTripDate}
          originalLabel={isEdit && original && tripDate !== original.tripDateISO ? original.tripDateLabel : null}
        />
      </div>

      <div className="px-4 pt-2 space-y-6">

        {/* ────────────────────── ② Container section ────────────────────── */}
        <Section
          icon={<ContainerIcon className="w-3.5 h-3.5" />}
          label="Container"
          hint={containerCount > 1 ? `${containerCount} cont` : 'Quét hoặc nhập số'}
        >
          <div className="space-y-3">
            {/* ① Shared cont type + tác nghiệp — all containers inherit these */}
            <div
              className="rounded-2xl p-3.5"
              style={{
                background: 'var(--theme-bg-secondary)',
                border: '1px solid var(--theme-border-default)',
                boxShadow: 'var(--theme-shadow-card)',
              }}
            >
              <ContainerTypeGrid
                contType={containers[0]?.contType ?? null}
                workType={containers[0]?.workType ?? null}
                onContTypeChange={updateAllContType}
                onWorkTypeChange={updateAllWorkType}
                operationTypes={operationTypes}
              />
              {isEdit && original && (
                <div className="space-y-0.5 mt-2">
                  <OriginalHint current={containers[0]?.contType ?? ''} original={original.contType ?? ''} />
                  <OriginalHint current={getWorkTypeLabel(containers[0]?.workType) ?? containers[0]?.workType ?? ''} original={getWorkTypeLabel(original.workType) ?? original.workType ?? ''} />
                </div>
              )}
            </div>

            {/* ② Detected container badges — each AI-detected number shown as a removable chip */}
            {containerCount > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {containers.map((cont, idx) => {
                  if (!cont.containerNumber.trim()) return null
                  const hasError = !!containerErrors[idx]
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 h-9 pl-3 pr-1.5 rounded-lg text-[13px] font-mono font-semibold tracking-wide transition-all"
                      style={{
                        background: hasError
                          ? 'var(--theme-status-error-light, #fee2e2)'
                          : 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)',
                        color: hasError ? 'var(--theme-status-error)' : 'var(--theme-text-primary)',
                        border: `1px solid ${hasError
                          ? 'color-mix(in srgb, var(--theme-status-error) 30%, transparent)'
                          : 'color-mix(in srgb, var(--theme-brand-primary) 30%, transparent)'}`,
                      }}
                    >
                      {cont.containerNumber}
                      <button
                        onClick={() => removeContainer(idx)}
                        type="button"
                        className="w-6 h-6 flex items-center justify-center rounded-md touch-manipulation active:scale-90 transition-transform"
                        style={{ color: 'var(--theme-text-muted)' }}
                        aria-label={`Xoá ${cont.containerNumber}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* ③ Input row — textbox + plus + scan */}
            <div className="flex items-center gap-2">
              {/* Textbox */}
              <div className="relative min-w-0 max-w-[200px]">
                <input
                  value={isEdit ? (containers[0]?.containerNumber ?? '') : stagingNumber}
                  onChange={e => {
                    const val = e.target.value.toUpperCase().replace(/-/g, '')
                    if (isEdit) {
                      updateContainer(0, 'containerNumber', val)
                    } else {
                      setStagingNumber(val)
                      setStagingError(null)
                    }
                  }}
                  onKeyDown={e => {
                    if (!isEdit && e.key === 'Enter') commitStagingNumber()
                  }}
                  onBlur={() => {
                    if (isEdit) validateContainerOnBlur(0)
                  }}
                  className="w-full h-12 rounded-xl pl-4 text-base font-mono font-semibold tracking-wider uppercase [&::placeholder]:opacity-40 [&::placeholder]:font-normal [&::placeholder]:tracking-normal [&::placeholder]:normal-case"
                  style={{
                    background: 'var(--theme-bg-tertiary)',
                    border: `1.5px solid ${
                      isEdit && containerErrors[0]
                        ? 'var(--theme-status-error)'
                        : isEdit && containers[0]?.containerNumber
                          ? 'var(--theme-brand-primary)'
                          : stagingError
                            ? 'var(--theme-status-error)'
                            : 'transparent'
                    }`,
                    color: 'var(--theme-text-primary)',
                    paddingRight: scanningContainer ? '44px' : '14px',
                  }}
                  placeholder={scanningContainer ? 'Đang nhận diện...' : 'MSKU1234567'}
                  readOnly={!!scanningContainer}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  maxLength={12}
                />
                {scanningContainer && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: 'var(--theme-brand-primary)' }} />
                )}
              </div>

              {/* + Add button — right of textbox */}
              {!isEdit && (
                <button
                  onClick={commitStagingNumber}
                  type="button"
                  className="flex-1 h-12 flex items-center justify-center rounded-xl touch-manipulation transition-all active:scale-90 shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)',
                    border: '1.5px solid color-mix(in srgb, var(--theme-brand-primary) 30%, transparent)',
                    color: 'var(--theme-brand-primary)',
                  }}
                  aria-label="Thêm container"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}

              {/* Scan button — icon only, prominent */}
              <button
                onClick={scanNewContainer}
                disabled={!!scanningContainer}
                aria-label="Quét số container bằng camera"
                type="button"
                className="flex-1 h-12 flex items-center justify-center rounded-xl text-sm font-bold touch-manipulation transition-all active:scale-[0.96] shrink-0 disabled:opacity-50"
                style={{
                  background: 'var(--theme-brand-primary)',
                  color: 'var(--theme-text-on-brand, #fff)',
                  border: '1px solid var(--theme-brand-primary)',
                }}
              >
                {scanningContainer ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
            </div>

            {hasAnyPhoto && (
              <div className="flex items-center gap-2 mt-1">
                {containers.map((c, i) => {
                  if (!c.photoDataUrl) return null
                  return (
                    <div
                      key={i}
                      className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0"
                      style={{
                        border: '1.5px solid color-mix(in srgb, var(--theme-brand-primary) 40%, transparent)',
                        boxShadow: '0 0 8px color-mix(in srgb, var(--theme-brand-primary) 15%, transparent)',
                      }}
                    >
                      <img
                        src={c.photoDataUrl}
                        alt="Ảnh đã chụp"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => {
                          updateContainer(i, 'photoDataUrl', undefined)
                          updateContainer(i, 'photoTaken', false)
                        }}
                        type="button"
                        className="absolute flex items-center justify-center rounded-full touch-manipulation"
                        style={{
                          width: 18,
                          height: 18,
                          background: 'rgba(0,0,0,0.65)',
                          color: '#fff',
                          top: 2,
                          right: 2,
                        }}
                        aria-label="Xoá ảnh"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )
                })}
                <span className="text-[11px] font-medium" style={{ color: 'var(--theme-brand-primary)' }}>
                  Đã chụp ảnh
                </span>
              </div>
            )}

            {/* Status messages */}
            <div className="space-y-1.5">
              {stagingError && <Hint tone="error" text={stagingError} />}
              {forceManualEntry && <Hint tone="warning" text="Vui lòng nhập tay số cont" />}
              {containers.some(c => c.ocrError) && !scanningContainer && (
                <Hint tone="warning" text={`${containers.find(c => c.ocrError)?.ocrError} — nhập tay hoặc quét lại`} />
              )}
              {/* Edit-mode: show per-container errors */}
              {isEdit && containerErrors[0] && <Hint tone="error" text={containerErrors[0]} />}
              {isEdit && (containerSuggestions[0]?.length ?? 0) > 0 && (
                <SuggestionChips
                  original={containers[0]?.containerNumber ?? ''}
                  suggestions={containerSuggestions[0]!}
                  onPick={(s) => applyContainerSuggestion(0, s)}
                />
              )}
              {isEdit && original && (
                <OriginalHint current={containers[0]?.containerNumber ?? ''} original={original.contNumber} />
              )}
            </div>
          </div>
        </Section>

        {/* ────────────────────── ③ Vessel section ────────────────────── */}
        <Section
          icon={<Ship className="w-3.5 h-3.5" />}
          label="Tàu"
          hint="Số tàu (nếu có)"
        >
          <RecentValuesInput
            value={vessel}
            onChange={setVessel}
            suggestions={recentVessels}
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

        {/* ────────────────────── ③b Note section ────────────────────── */}
        <Section
          icon={<StickyNote className="w-3.5 h-3.5" />}
          label="Ghi chú"
          hint="Ghi chú cho chuyến (nếu có)"
        >
          <RecentValuesInput
            value={note}
            onChange={setNote}
            suggestions={recentNotes}
            placeholder="VD: Chạy lẻ 1 cont 20, Cont hỏng cần chụp ảnh..."
            className="w-full h-12 rounded-xl px-4 text-sm font-medium"
            style={{
              background: 'var(--theme-bg-secondary)',
              border: `1.5px solid ${note ? 'color-mix(in srgb, var(--theme-brand-primary) 30%, transparent)' : 'var(--theme-border-default)'}`,
              color: 'var(--theme-text-primary)',
              boxShadow: 'var(--theme-shadow-card)',
            }}
          />
          {isEdit && original && (
            <OriginalHint current={note} original={original.note} />
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
          {/* Nudge banner — gentle reminder when no photo taken (create mode only) */}
          {!isEdit && containerCount > 0 && !hasAnyPhoto && (
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2 text-[11px]"
              style={{
                background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)',
                border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 15%, transparent)',
                color: 'var(--theme-text-secondary)',
              }}
            >
              <Camera className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--theme-brand-primary)' }} />
              <span>
                Bạn có thể chụp ảnh container để kế toán dễ đối soát hơn.
              </span>
            </div>
          )}

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
              onClick={async () => {
                await onRequestSubmit()
              }}
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
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Xác nhận chuyến</>
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
        workType={summaryWorkType}
        clientName={summaryClientName}
        vessel={vessel}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        tripDate={tripDateLabel}
        note={note.trim() || null}
        containerCount={containerCount}
        hasPhoto={hasAnyPhoto}
        photoUrls={containers.filter(c => c.photoTaken && c.photoDataUrl).map(c => c.photoDataUrl!)}
      />

      {/* AI scanning overlay — visible while backend OCR is in flight */}
      <AIScanningOverlay
        visible={!!scanningContainer}
        imageSrc={scanningContainer?.photoDataUrl ?? null}
        detectedNumbers={containers.filter(c => c.containerNumber.trim() && !c.ocrLoading).map(c => c.containerNumber)}
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
