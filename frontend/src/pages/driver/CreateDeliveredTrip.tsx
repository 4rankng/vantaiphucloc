import { useNavigate } from 'react-router-dom'
import { Camera, ScanLine, RotateCcw, Trash2, AlertCircle, Loader2, Plus, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { ContainerScanner } from '@/components/shared/ContainerScanner'
import { ContainerTypeGrid } from '@/components/shared/ContainerTypeGrid'
import { TripSummaryDialog } from '@/components/shared/TripSummaryDialog'
import { SuccessOverlay } from '@/components/shared/SuccessOverlay'
import { RecentTripSuggestions } from '@/components/shared/RecentTripSuggestions'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { LocationSelect } from '@/components/shared/LocationSelect/LocationSelect'
import { useCreateDeliveredTrip } from './useCreateDeliveredTrip'
import { useToast } from '@/components/atoms/Toast'
import type { DeliveredTrip } from '@/data/domain'

export function CreateDeliveredTrip({ existingDeliveredTrip }: { existingDeliveredTrip?: DeliveredTrip | null }) {
  const {
    isEdit,
    clients, recentOrders,
    containers, clientId, vessel, pickupLocation, dropoffLocation,
    selectedTripId,
    submitting, scannerOpen, isOnline, summaryOpen, showSuccess,
    forceManualEntry, missingFields, containerErrors, suggestionLoading,
    canSubmit, summaryContNumber, summaryContType, summaryClientName,
    setClientId, setVessel, setPickupLocation, setDropoffLocation,
    openScanner, handleScanComplete, setScannerOpen,
    updateContainer, addContainer, removeContainer, validateContainerOnBlur,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit, setSummaryOpen,
  } = useCreateDeliveredTrip(existingDeliveredTrip)

  const navigate = useNavigate()
  const toast = useToast()

  const handleConfirmSubmit = async () => {
    try {
      await confirmSubmit()
    } catch {
      toast.error('Gửi thất bại', 'Vui lòng thử lại')
    }
  }

  return (
    <div className="space-y-6">
      {/* Scanner overlay */}
      {scannerOpen && (
        <ContainerScanner
          onCapture={handleScanComplete}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Container cards */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--theme-text-muted)' }}>
          Container
        </p>

        {containers.map((cont, idx) => (
          <div
            key={idx}
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
          >
            {/* ── Header row: label + scan button + delete ── */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold flex-1" style={{ color: 'var(--theme-text-primary)' }}>
                Cont {idx + 1}
              </span>

              {/* Scan button — optional, fills container number via OCR */}
              <button
                onClick={openScanner(idx)}
                aria-label="Quét số container bằng camera"
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold touch-manipulation transition-all active:scale-[0.96]"
                style={{
                  background: cont.photoTaken && !cont.ocrError
                    ? 'var(--theme-status-success-light)'
                    : 'var(--theme-brand-secondary)',
                  color: cont.photoTaken && !cont.ocrError
                    ? 'var(--theme-status-success)'
                    : 'var(--theme-brand-primary)',
                }}
              >
                {cont.ocrLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : cont.photoTaken && !cont.ocrError ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Đã quét</>
                ) : cont.photoTaken && cont.ocrError ? (
                  <><RotateCcw className="w-3.5 h-3.5" /> Quét lại</>
                ) : (
                  <><ScanLine className="w-3.5 h-3.5" /><Camera className="w-3 h-3" /> Quét</>
                )}
              </button>

              {containers.length > 1 && (
                <button
                  onClick={() => removeContainer(idx)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg touch-manipulation"
                  style={{ background: 'var(--theme-status-error-light)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-error)' }} />
                </button>
              )}
            </div>

            {/* ── Container number input ── */}
            <div className="relative">
              <input
                value={cont.containerNumber}
                onChange={e => updateContainer(idx, 'containerNumber', e.target.value)}
                onBlur={() => validateContainerOnBlur(idx)}
                className="w-full h-12 rounded-xl px-4 text-base font-mono font-semibold tracking-wide [&::placeholder]:opacity-40 [&::placeholder]:font-normal [&::placeholder]:tracking-normal"
                style={{
                  background: 'var(--theme-bg-tertiary)',
                  border: `1.5px solid ${containerErrors[idx] ? 'var(--theme-status-error)' : cont.containerNumber ? 'var(--theme-brand-primary)' : 'transparent'}`,
                  color: 'var(--theme-text-primary)',
                  paddingRight: cont.ocrLoading ? '44px' : undefined,
                }}
                placeholder={cont.ocrLoading ? 'Đang nhận diện...' : 'MSKU1234567'}
                readOnly={cont.ocrLoading}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              {cont.ocrLoading && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: 'var(--theme-brand-primary)' }} />
              )}
            </div>

            {/* ── Container type grid ── */}
            <ContainerTypeGrid
              value={cont.workType}
              onChange={(wt) => updateContainer(idx, 'workType', wt)}
              layout="grid2x2"
            />

            {/* ── Status messages ── */}
            {forceManualEntry && !cont.ocrLoading && (
              <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--theme-status-warning)' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Vui lòng nhập tay số cont
              </p>
            )}
            {containerErrors[idx] && (
              <p className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--theme-status-error)' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {containerErrors[idx]}
              </p>
            )}
            {cont.ocrError && !containerErrors[idx] && (
              <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--theme-status-warning)' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {cont.ocrError} — nhập tay hoặc quét lại
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add more container */}
      <button
        onClick={addContainer}
        className="w-full h-12 rounded-lg text-sm font-bold flex items-center justify-center gap-2 touch-manipulation transition-colors active:scale-[0.98]"
        style={{
          background: 'transparent',
          color: 'var(--theme-brand-primary)',
          border: '2px dashed var(--theme-border-default)',
        }}
      >
        <Plus className="w-4 h-4" /> Thêm cont
      </button>

      {/* Vessel */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số tàu</label>
        <input
          value={vessel}
          onChange={e => setVessel(e.target.value)}
          placeholder="Nhập số tàu"
          className="w-full h-11 rounded-xl px-3.5 text-sm"
          style={{
            background: 'var(--theme-bg-tertiary)',
            border: '1.5px solid transparent',
            color: 'var(--theme-text-primary)',
          }}
        />
      </div>

      {/* Customer & Route section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--theme-text-muted)' }}>
            Khách & Tuyến
          </p>
          {recentOrders.length > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--theme-brand-primary)' }}>
              · Tự động điền
            </p>
          )}
        </div>

        <RecentTripSuggestions
          suggestions={recentOrders}
          selectedTripId={selectedTripId ?? undefined}
          onSelect={handleRecentTripSelect}
          loading={suggestionLoading}
        />

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Khách hàng</label>
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
          </div>

          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điểm đi</label>
              <LocationSelect
                placeholder="Chọn điểm đi"
                value={pickupLocation}
                onChange={(val: string) => {
                  setPickupLocation(val)
                  setDropoffLocation('')
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điểm đến</label>
              <LocationSelect
                placeholder="Chọn điểm đến"
                value={dropoffLocation}
                onChange={setDropoffLocation}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit bar */}
      <div className="py-3 space-y-2">
          {missingFields.length > 0 && !canSubmit && (
            <p className="text-xs font-medium text-center" style={{ color: 'var(--theme-status-warning)' }}>
              <span className="font-semibold">Còn thiếu: </span>
              {missingFields.join(', ')}
            </p>
          )}
          {missingFields.length === 0 && !canSubmit && Object.keys(containerErrors).length > 0 && (
            <p className="text-xs font-medium text-center" style={{ color: 'var(--theme-status-error)' }}>
              Số container không hợp lệ — vui lòng kiểm tra
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => navigate(-1)}
              className="h-11 px-4 rounded-xl flex items-center justify-center gap-1.5 touch-manipulation transition-all active:scale-[0.97] shrink-0 text-sm font-semibold"
              style={{
                background: 'transparent',
                color: 'var(--theme-brand-primary)',
                border: '2px solid var(--theme-brand-primary)',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Quay lại
            </button>
            <button
              onClick={onRequestSubmit}
              disabled={!canSubmit || submitting}
              className="flex-1 h-11 rounded-xl text-sm font-bold touch-manipulation transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
              style={{
                background: canSubmit ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                color: canSubmit ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
              }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
              ) : isEdit ? 'Cập nhật' : isOnline ? 'Xác nhận' : 'Lưu offline'}
            </button>
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

      {/* Success overlay */}
      <SuccessOverlay visible={showSuccess} />
    </div>
  )
}
