import { useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera } from 'react-camera-pro'
import { StyleSheetManager } from 'styled-components'
import { X, Image, Zap } from 'lucide-react'

export interface PhotoMeta {
  lat: number | null
  lng: number | null
  timestamp: string
}

interface ContainerScannerProps {
  onCapture: (imageSrc: string, meta: PhotoMeta) => void
  onClose: () => void
}

const MAX_CAPTURE_WIDTH = 1200

/**
 * Downsize an image to MAX_CAPTURE_WIDTH while preserving aspect ratio.
 * Used so we don't upload multi-MB camera frames to the OCR endpoint.
 * Images already at or below the threshold pass through untouched.
 */
async function downsizeImageToDataUrl(imageSrc: string): Promise<string> {
  // ALWAYS re-encode through a canvas as image/jpeg. iOS gallery photos can be
  // HEIC; returning the raw source (as we used to for small images) would send
  // HEIC bytes that get stored under a .jpg name and render as broken images in
  // Chrome/Firefox/Android. Drawing to a canvas forces a decode + JPEG re-encode,
  // so the output is always real JPEG regardless of the input format.
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = img.width > MAX_CAPTURE_WIDTH ? MAX_CAPTURE_WIDTH / img.width : 1
      const outW = Math.max(1, Math.round(img.width * scale))
      const outH = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      canvas.getContext('2d')!.drawImage(img, 0, 0, outW, outH)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

/**
 * ContainerScanner — fullscreen camera + gallery picker for container photos.
 *
 * Single-step flow: as soon as the driver taps the shutter (or picks an
 * image from their gallery), the photo is downsized and handed back to the
 * parent via `onCapture` — which kicks off OCR immediately. There's no
 * crop or preview step in between.
 */
export function ContainerScanner({ onCapture, onClose }: ContainerScannerProps) {
  const cameraRef = useRef<unknown>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [flashOn, setFlashOn] = useState(false)
  const [busy, setBusy] = useState(false)

  // ── Flash toggle via MediaStreamTrack ────────────────────────────────────
  const handleFlashToggle = useCallback(() => {
    const cam = cameraRef.current as { video?: { srcObject?: MediaStream } } | null
    if (!cam?.video?.srcObject) return
    const track = (cam.video.srcObject as MediaStream).getVideoTracks()[0]
    if (!track) return
    try {
      const constraints = { torch: !flashOn }
      track.applyConstraints({ advanced: [constraints as ConstrainBooleanParameters] })
      setFlashOn(!flashOn)
    } catch {
      // Flash not supported on this device
    }
  }, [flashOn])

  /** Common "I have an image, fire onCapture and close" path. */
  const finishWith = useCallback(async (rawDataUrl: string) => {
    if (busy) return
    setBusy(true)
    try {
      const final = await downsizeImageToDataUrl(rawDataUrl)
      onCapture(final, {
        lat: null,
        lng: null,
        timestamp: new Date().toISOString(),
      })
    } catch {
      // If downsize fails (e.g. CORS on a remote URL), fall back to the raw source.
      onCapture(rawDataUrl, {
        lat: null,
        lng: null,
        timestamp: new Date().toISOString(),
      })
    }
  }, [busy, onCapture])

  // ── Camera capture: takePhoto() returns base64 directly ───────────────────
  const handleCapture = useCallback(() => {
    const cam = cameraRef.current as { takePhoto: () => string } | null
    if (!cam) return
    const photo = cam.takePhoto()
    void finishWith(photo)
  }, [finishWith])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      void finishWith(reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [finishWith])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#000' }}>
      {/* Hidden file input — triggered by the gallery button label below */}
      <input
        ref={fileInputRef}
        id="scanner-gallery-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Top bar — close (left) + flash toggle (right) ────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4"
        style={{ paddingTop: `max(16px, env(safe-area-inset-top))` }}
      >
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full touch-manipulation"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          aria-label="Đóng"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={handleFlashToggle}
          className="w-10 h-10 flex items-center justify-center rounded-full touch-manipulation transition-colors"
          style={{
            background: flashOn ? 'var(--theme-brand-primary)' : 'rgba(0,0,0,0.5)',
            color: 'var(--theme-text-on-brand)',
          }}
          aria-label={flashOn ? 'Tắt đèn flash' : 'Bật đèn flash'}
        >
          <Zap className="w-5 h-5" fill={flashOn ? 'var(--theme-text-on-brand)' : 'none'} />
        </button>
      </div>

      {/* ── Live camera preview ──────────────────────────────────────────── */}
      <div className="absolute inset-0 scanner-video">
        <StyleSheetManager shouldForwardProp={(prop) => prop !== 'aspectRatio' && prop !== 'mirrored'}>
          <Camera
            ref={cameraRef}
            facingMode="environment"
            errorMessages={{
              noCameraAccessible: 'Không tìm thấy camera. Vui lòng kết nối camera hoặc thử trình duyệt khác.',
              permissionDenied: 'Quyền truy cập camera bị từ chối. Vui lòng tải lại trang và cấp quyền.',
              switchCamera: 'Không thể chuyển camera.',
              canvas: 'Trình duyệt không hỗ trợ canvas.',
            }}
          />
        </StyleSheetManager>
      </div>

      {/* ── Bottom bar — gallery (left) + shutter (center) ──────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-6 pt-3"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
          paddingBottom: `max(24px, env(safe-area-inset-bottom))`,
        }}
      >
        <div className="relative flex items-center justify-center">
          {/* Gallery picker */}
          <label
            htmlFor="scanner-gallery-input"
            className="absolute left-0 bottom-1 w-11 h-11 flex items-center justify-center rounded-full touch-manipulation cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--theme-text-on-brand)' }}
            aria-label="Chọn ảnh từ thư viện"
          >
            <Image className="w-5 h-5" />
          </label>

          {/* Shutter — dead-center, iOS-style ring. Disabled while busy
              so a double-tap can't fire two captures. */}
          <button
            onClick={handleCapture}
            disabled={busy}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center touch-manipulation transition-transform active:scale-[0.92] disabled:opacity-60"
            style={{
              border: '4px solid rgba(255,255,255,0.95)',
              background: 'var(--theme-brand-primary)',
            }}
            aria-label="Chụp ảnh"
          >
            <div
              className="w-14 h-14 rounded-full"
              style={{ background: 'var(--theme-brand-primary)' }}
            />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
