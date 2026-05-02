import { useRef } from 'react'
import { Camera, RotateCcw, Trash2, AlertCircle, WifiOff, Loader2, Image } from 'lucide-react'
import { ContainerScanner } from '@/components/shared/ContainerScanner'
import { ContainerTypeGrid } from '@/components/shared/ContainerTypeGrid'
import { TripSummaryDialog } from '@/components/shared/TripSummaryDialog'
import { SuccessOverlay } from '@/components/shared/SuccessOverlay'
import { AddMorePrompt } from '@/components/shared/AddMorePrompt'
import { RecentTripSuggestions } from '@/components/shared/RecentTripSuggestions'
import { SheetPicker } from '@/components/shared/SheetPicker'
import { useCreateWorkOrder } from './useCreateWorkOrder'
import { useToast } from '@/components/atoms/Toast'

export function CreateWorkOrder() {
  const {
    clients, routes, recentOrders,
    containers, clientId, pickupLocation, dropoffLocation,
    submitting, scannerOpen, galleryImage, isOnline, summaryOpen, showSuccess,
    showAddMore, forceManualEntry, missingFields,
    canSubmit, summaryContainers, summaryClientName,
    setClientId, setPickupLocation, setDropoffLocation,
    openScanner, openGallery, handleScanComplete, setScannerOpen,
    updateContainer, addContainer, removeContainer,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit, setSummaryOpen,
    dismissAddMore,
  } = useCreateWorkOrder()

  const toast = useToast()

  // One hidden file input per container for gallery picking
  const galleryRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleGalleryChange = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      openGallery(idx, reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleConfirmSubmit = async () => {
    try {
      await confirmSubmit()
    } catch {
      toast.error('Gửi thất bại', 'Vui lòng thử lại')
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Offline hint */}
      {!isOnline && (
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ background: 'var(--theme-status-warning-light)', border: '1px solid var(--theme-status-warning)' }}
        >
          <WifiOff className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-warning)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--theme-status-warning)' }}>
            Không có mạng — nhập số cont thủ công
          </span>
        </div>
      )}

      {/* Scanner overlay */}
      {scannerOpen && (
        <ContainerScanner
          onCapture={handleScanComplete}
          onClose={() => setScannerOpen(false)}
          galleryImage={galleryImage}
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
            className="rounded-2xl p-5 space-y-4"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Cont {idx + 1}
              </span>
              {containers.length > 1 && (
                <button
                  onClick={() => removeContainer(idx)}
                  className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation"
                  style={{ background: 'var(--theme-status-error-light)' }}
                >
                  <Trash2 className="w-4 h-4" style={{ color: 'var(--theme-status-error)' }} />
                </button>
              )}
            </div>

            {/* Photo area */}
            {cont.photoTaken && cont.photoDataUrl ? (
              <button
                onClick={openScanner(idx)}
                className="w-full rounded-2xl overflow-hidden touch-manipulation"
                style={{ border: '2px solid var(--theme-brand-primary)' }}
              >
                <img
                  src={cont.photoDataUrl}
                  alt="Container"
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '120px' }}
                />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {/* Camera button — opens scanner overlay */}
                <button
                  onClick={openScanner(idx)}
                  className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-6 px-3 transition-colors touch-manipulation"
                  style={{ background: 'transparent', borderColor: 'var(--theme-border-default)' }}
                >
                  <Camera className="w-6 h-6 mb-2" style={{ color: 'var(--theme-brand-primary)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Chụp ảnh</span>
                  <span className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Quét camera</span>
                </button>

                {/* Gallery button — triggers hidden file input (no capture = OS gallery) */}
                <input
                  ref={el => { galleryRefs.current[idx] = el }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleGalleryChange(idx)}
                />
                <button
                  onClick={() => galleryRefs.current[idx]?.click()}
                  className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-6 px-3 transition-colors touch-manipulation"
                  style={{ background: 'transparent', borderColor: 'var(--theme-border-default)' }}
                >
                  <Image className="w-6 h-6 mb-2" style={{ color: 'var(--theme-brand-primary)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Thư viện</span>
                  <span className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Chọn từ máy</span>
                </button>
              </div>
            )}

            {/* Container number input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số cont</label>
                {cont.photoTaken && (
                  <button
                    onClick={openScanner(idx)}
                    className="flex items-center gap-1 text-xs font-medium touch-manipulation"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    <RotateCcw className="w-3 h-3" /> Chụp lại
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  value={cont.containerNumber}
                  onChange={e => updateContainer(idx, 'containerNumber', e.target.value)}
                  className="w-full h-12 rounded-2xl px-4 text-sm font-mono font-semibold"
                  style={{
                    background: 'var(--theme-bg-tertiary)',
                    border: `1.5px solid ${cont.ocrError ? 'var(--theme-status-warning)' : 'transparent'}`,
                    color: 'var(--theme-text-primary)',
                    paddingRight: cont.ocrLoading ? '44px' : undefined,
                  }}
                  placeholder={cont.ocrLoading ? 'Đang nhận diện...' : 'VD: MSKU-1234567'}
                  readOnly={cont.ocrLoading}
                />
                {cont.ocrLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: 'var(--theme-brand-primary)' }} />
                )}
              </div>
              {forceManualEntry && !cont.ocrLoading && (
                <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--theme-status-warning)' }}>
                  <AlertCircle className="w-3.5 h-3.5" /> Vui lòng nhập tay số cont
                </p>
              )}
              {!forceManualEntry && (
                <p className="text-xs flex items-center gap-1" style={{ color: cont.ocrError ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)' }}>
                  <AlertCircle className="w-3 h-3" />
                  {cont.ocrError ?? (isOnline ? 'Sửa nếu nhận diện sai' : 'Nhập số cont thủ công')}
                </p>
              )}
            </div>

            {/* Container type selector */}
            <ContainerTypeGrid
              value={cont.workType}
              onChange={(wt) => updateContainer(idx, 'workType', wt)}
            />
          </div>
        ))}
      </div>

      {/* Add more container prompt */}
      <AddMorePrompt
        visible={!!showAddMore}
        onAdd={addContainer}
        onDismiss={dismissAddMore}
      />

      {/* Customer & Route section */}
      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--theme-text-muted)' }}>
          Khách & Tuyến
        </p>

        <RecentTripSuggestions
          trips={recentOrders}
          onSelect={handleRecentTripSelect}
          onChooseOther={() => {}}
        />

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Khách hàng</label>
            <SheetPicker
              label="Chọn khách hàng"
              placeholder="Chọn khách hàng"
              value={clientId}
              options={clients.map(c => ({ value: String(c.id), label: c.code || c.name, sublabel: c.code ? c.name : c.phone }))}
              onChange={setClientId}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điểm lấy</label>
            <SheetPicker
              label="Chọn điểm lấy"
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
            <SheetPicker
              label="Chọn điểm trả"
              placeholder="Chọn điểm trả"
              value={dropoffLocation}
              options={routes.filter(r => r.pickupLocation === pickupLocation).map(r => ({ value: r.dropoffLocation ?? '', label: r.dropoffLocation ?? '' }))}
              onChange={setDropoffLocation}
            />
          </div>
        </div>
      </div>

      {/* Sticky submit bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-6 space-y-2 z-30"
        style={{ background: 'var(--theme-bg-primary)', borderTop: '1px solid var(--theme-border-default)' }}
      >
        {missingFields.length > 0 && !canSubmit && (
          <p className="text-xs font-medium text-center" style={{ color: 'var(--theme-status-warning)' }}>
            Còn thiếu: {missingFields.join(', ')}
          </p>
        )}
        <button
          onClick={onRequestSubmit}
          disabled={!canSubmit || submitting}
          className="w-full h-12 rounded-2xl text-base font-bold touch-manipulation transition-all active:scale-[0.98]"
          style={{
            background: canSubmit ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
            color: canSubmit ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
          }}
        >
          {submitting ? 'Đang gửi...' : isOnline ? 'Gửi chuyến' : 'Lưu offline'}
        </button>
      </div>

      {/* Summary dialog */}
      <TripSummaryDialog
        open={summaryOpen}
        onConfirm={handleConfirmSubmit}
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
