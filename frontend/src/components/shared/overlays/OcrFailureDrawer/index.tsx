import { useCallback, useMemo, useState } from 'react'
import { AlertCircle, ImageIcon, Loader2, ZoomIn } from 'lucide-react'
import { Drawer } from '@/components/shared/overlays/Drawer/Drawer'
import { PhotoLightbox } from '@/components/shared/overlays/PhotoLightbox'
import { useOcrFailures } from '@/hooks/queries/ocr-stats'
import type { OcrFailureItem } from '@/services/api/ocrStats.api'

interface OcrFailureDrawerProps {
  open: boolean
  onClose: () => void
  days: number
}

const TIME_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Lists failed-OCR uploads that have a captured photo, so the admin can
 * preview/download the actual image that defeated OCR. Superadmin-only — the
 * trigger is only rendered when `driverFailed > 0` in `OcrPerformanceChart`.
 *
 * Fetches only while open (`enabled={open}`) to avoid loading failure photos
 * on every dashboard visit.
 */
export function OcrFailureDrawer({ open, onClose, days }: OcrFailureDrawerProps) {
  const { data: items = [], isLoading, isError } = useOcrFailures(days, open)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    setLightboxSrc(null)
    onClose()
  }, [onClose])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) handleClose()
    },
    [handleClose],
  )

  const title = useMemo(() => 'Ảnh OCR lỗi', [])

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      width="640px"
      meta={isLoading ? undefined : `${items.length} ảnh`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--ink-3)' }} />
          <span className="text-sm" style={{ color: 'var(--ink-3)' }}>
            Đang tải…
          </span>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm" style={{ color: 'var(--ink-2)' }}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Không tải được danh sách ảnh lỗi. Thử lại sau.</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ImageIcon className="h-6 w-6" style={{ color: 'var(--ink-4)' }} />
          <p className="m-0 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
            Chưa có ảnh lỗi được ghi nhận
          </p>
          <p className="m-0 text-xs" style={{ color: 'var(--ink-4)' }}>
            Ảnh chỉ được lưu khi OCR lỗi sau khi tính năng này được triển khai.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li key={item.id}>
              <FailureThumb item={item} onOpen={() => setLightboxSrc(item.contPhotoUrl)} />
            </li>
          ))}
        </ul>
      )}

      {lightboxSrc && (
        <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </Drawer>
  )
}

interface FailureThumbProps {
  item: OcrFailureItem
  onOpen: () => void
}

const FailureThumb = ({ item, onOpen }: FailureThumbProps) => {
  const label = item.driverName?.trim() || 'Không rõ lái xe'
  const when = TIME_FMT.format(new Date(item.createdAt))
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-xl border text-left transition-colors"
      style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}
      aria-label={`Xem ảnh lỗi của ${label} lúc ${when}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: 'var(--surface)' }}>
        <img
          src={item.contPhotoUrl}
          alt={`Ảnh OCR lỗi — ${label}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]"
        />
        <span
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: 'rgba(10,10,10,0.55)', color: 'white' }}
          aria-hidden
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="space-y-1 px-2.5 py-2">
        <p className="m-0 truncate text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
          {label}
        </p>
        <p className="m-0 truncate text-[11px] tabular-nums" style={{ color: 'var(--ink-3)' }}>
          {when}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {item.provider && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink-3)' }}
            >
              {item.provider}
            </span>
          )}
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink-3)' }}
          >
            {item.attempts} lần thử
          </span>
        </div>
      </div>
    </button>
  )
}
