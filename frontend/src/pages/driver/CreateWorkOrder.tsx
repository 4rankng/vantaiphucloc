import { useNavigate } from 'react-router-dom'
import { Camera, RotateCcw, Trash2, AlertCircle, Loader2, Plus, ChevronLeft } from 'lucide-react'
import { ContainerScanner } from '@/components/shared/ContainerScanner'
import { ContainerTypeGrid } from '@/components/shared/ContainerTypeGrid'
import { TripSummaryDialog } from '@/components/shared/TripSummaryDialog'
import { SuccessOverlay } from '@/components/shared/SuccessOverlay'
import { RecentTripSuggestions } from '@/components/shared/RecentTripSuggestions'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { useCreateWorkOrder } from './useCreateWorkOrder'
import { useToast } from '@/components/atoms/Toast'
import type { WorkOrder } from '@/data/domain'

export function CreateWorkOrder({ existingWorkOrder }: { existingWorkOrder?: WorkOrder | null }) {
  const {
    isEdit,
    clients, routes, recentOrders,
    containers, clientId, pickupLocation, dropoffLocation,
    submitting, scannerOpen, isOnline, summaryOpen, showSuccess,
    forceManualEntry, missingFields, containerErrors,
    canSubmit, summaryContainers, summaryClientName,
    setClientId, setPickupLocation, setDropoffLocation,
    openScanner, handleScanComplete, setScannerOpen,
    updateContainer, addContainer, removeContainer,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit, setSummaryOpen,
  } = useCreateWorkOrder(existingWorkOrder)

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
      {/* Back button — inline in page body */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Quay lại
      </button>

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
            className="rounded-lg p-3 flex gap-3"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
          >
            {/* ── Left: square photo / capture placeholder ── */}
            <div className="shrink-0 self-stretch flex flex-col" style={{ width: 148 }}>
              {cont.photoTaken && cont.photoDataUrl ? (
                <>
                  <button
                    onClick={openScanner(idx)}
                    className="rounded-xl overflow-hidden touch-manipulation flex-1"
                    style={{ border: '2px solid var(--theme-brand-primary)', minHeight: 148 }}
                  >
                    <img src={cont.photoDataUrl} alt="Container" className="w-full h-full object-cover" />
                  </button>
                  <button
                    onClick={openScanner(idx)}
                    className="flex items-center justify-center gap-1 text-[10px] font-medium touch-manipulation w-full mt-1"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Chụp lại
                  </button>
                </>
              ) : (
                /* ── No photo: square placeholder fills card height ── */
                <button
                  onClick={openScanner(idx)}
                  className="rounded-xl border-2 border-dashed flex items-center justify-center touch-manipulation transition-colors flex-1"
                  style={{ borderColor: 'var(--theme-border-default)', minHeight: 148 }}
                >
                  <Camera className="w-8 h-8" style={{ color: 'var(--theme-brand-primary)' }} />
                </button>
              )}
            </div>

            {/* ── Right: label + delete + number input + type grid + status ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {/* Row: "Cont N" label + delete */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                  Cont {idx + 1}
                </span>
                {containers.length > 1 && (
                  <button
                    onClick={() => removeContainer(idx)}
                    className="w-9 h-9 flex items-center justify-center rounded-full touch-manipulation"
                    style={{ background: 'var(--theme-status-error-light)' }}
                  >
                    <Trash2 className="w-4 h-4" style={{ color: 'var(--theme-status-error)' }} />
                  </button>
                )}
              </div>

              {/* Container number input */}
              <div className="relative">
                <input
                  value={cont.containerNumber}
                  onChange={e => updateContainer(idx, 'containerNumber', e.target.value)}
                  className="w-full h-11 rounded-xl px-3.5 text-sm font-mono font-semibold [&::placeholder]:opacity-50"
                  style={{
                    background: 'var(--theme-bg-tertiary)',
                    border: `1.5px solid ${containerErrors[idx] ? 'var(--theme-status-error)' : cont.ocrError ? 'var(--theme-status-warning)' : 'transparent'}`,
                    color: 'var(--theme-text-primary)',
                    paddingRight: cont.ocrLoading ? '40px' : undefined,
                  }}
                  placeholder={cont.ocrLoading ? 'Nhận diện...' : 'MSKU1234567'}
                  readOnly={cont.ocrLoading}
                />
                {cont.ocrLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: 'var(--theme-brand-primary)' }} />
                )}
              </div>

              {/* Container type grid */}
              <ContainerTypeGrid
                value={cont.workType}
                onChange={(wt) => updateContainer(idx, 'workType', wt)}
                layout="grid2x2"
              />

              {/* Status messages */}
              {forceManualEntry && !cont.ocrLoading && (
                <p className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'var(--theme-status-warning)' }}>
                  <AlertCircle className="w-3 h-3 shrink-0" /> Vui lòng nhập tay số cont
                </p>
              )}
              {containerErrors[idx] && (
                <p className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'var(--theme-status-error)' }}>
                  <AlertCircle className="w-3 h-3 shrink-0" /> {containerErrors[idx]}
                </p>
              )}
              {!forceManualEntry && !containerErrors[idx] && (
                <p className="text-[10px] flex items-center gap-1" style={{ color: cont.ocrError ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)' }}>
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {cont.ocrError ?? (isOnline ? 'Sửa nếu nhận diện sai' : 'Nhập số cont thủ công')}
                </p>
              )}
            </div>
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

      {/* Customer & Route section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--theme-text-muted)' }}>
            Khách & Tuyến
          </p>
          {recentOrders.length > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--theme-text-muted)' }}>
              · Gần đây
            </p>
          )}
        </div>

        <RecentTripSuggestions
          trips={recentOrders}
          selectedClientId={clientId}
          selectedPickup={pickupLocation}
          selectedDropoff={dropoffLocation}
          onSelect={handleRecentTripSelect}
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

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điểm lấy</label>
              <InlineSelect
                placeholder="Chọn điểm lấy"
                value={pickupLocation}
                options={[...new Set(routes.map(r => r.pickupLocation).filter(Boolean) as string[])].map(loc => ({ value: loc!, label: loc! }))}
                onChange={(val: string) => {
                  setPickupLocation(val)
                  setDropoffLocation('')
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điểm trả</label>
              <InlineSelect
                placeholder="Chọn điểm trả"
                value={dropoffLocation}
                options={[...new Set(routes.map(r => r.dropoffLocation).filter(Boolean) as string[])].map(loc => ({ value: loc!, label: loc! }))}
                onChange={setDropoffLocation}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit bar (sticky footer) */}
      <div
        className="sticky bottom-0 z-10 -mx-4 px-4 py-3 space-y-2"
        style={{
          background: 'var(--theme-bg-primary)',
          borderTop: '1px solid var(--theme-border-default)',
        }}
      >
        <div className="safe-area-bottom">
          {missingFields.length > 0 && !canSubmit && (
            <p className="text-xs font-medium text-center" style={{ color: 'var(--theme-status-warning)' }}>
              Còn thiếu: {missingFields.join(', ')}
            </p>
          )}
          {missingFields.length === 0 && !canSubmit && Object.keys(containerErrors).length > 0 && (
            <p className="text-xs font-medium text-center" style={{ color: 'var(--theme-status-error)' }}>
              Số container không hợp lệ — vui lòng kiểm tra
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => navigate(-1)}
              className="h-12 px-4 rounded-lg flex items-center justify-center gap-1 touch-manipulation transition-all active:scale-[0.98] shrink-0"
              style={{
                background: 'transparent',
                color: 'var(--theme-status-error)',
                border: '1.5px solid var(--theme-status-error)',
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onRequestSubmit}
              disabled={!canSubmit || submitting}
              className="flex-1 h-12 rounded-lg text-base font-bold touch-manipulation transition-all active:scale-[0.98]"
              style={{
                background: canSubmit ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                color: canSubmit ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
              }}
            >
              {submitting ? 'Đang gửi...' : isEdit ? 'Cập nhật' : isOnline ? 'Xác nhận' : 'Lưu offline'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary dialog */}
      <TripSummaryDialog
        open={summaryOpen}
        onConfirm={handleConfirmSubmit}
        onClose={() => setSummaryOpen(false)}
        containers={summaryContainers}
        clientName={summaryClientName}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
      />

      {/* Success overlay */}
      <SuccessOverlay visible={showSuccess} />
    </div>
  )
}
