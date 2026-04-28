import { useRef, useCallback, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import { X, RotateCcw } from 'lucide-react'
import { calculateObjectCoverCrop } from '@/lib/crop-utils'

export interface PhotoMeta {
  lat: number | null
  lng: number | null
  timestamp: string
}

interface ContainerScannerProps {
  onCapture: (imageSrc: string, meta: PhotoMeta) => void
  onClose: () => void
}

// Target rectangle dimensions — must match CSS values
const RECT_WIDTH_PERCENT = 0.85
const RECT_HEIGHT_PX = 100

export function ContainerScanner({ onCapture, onClose }: ContainerScannerProps) {
  const webcamRef = useRef<Webcam>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsCoords({ lat: null, lng: null }),
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [])

  const handleCapture = useCallback(() => {
    const webcam = webcamRef.current
    if (!webcam) return

    const video = webcam.video
    if (!video) return

    const crop = calculateObjectCoverCrop({
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
      containerWidth: video.clientWidth,
      containerHeight: video.clientHeight,
      rectWidth: video.clientWidth * RECT_WIDTH_PERCENT,
      rectHeight: RECT_HEIGHT_PX,
    })

    const canvas = document.createElement('canvas')
    canvas.width = crop.width
    canvas.height = crop.height

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)

    const croppedImage = canvas.toDataURL('image/jpeg', 0.8)
    setCaptured(croppedImage)
  }, [])

  const handleRetake = useCallback(() => {
    setCaptured(null)
  }, [])

  const handleConfirm = useCallback(() => {
    if (captured) {
      onCapture(captured, {
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        timestamp: new Date().toISOString(),
      })
    }
  }, [captured, gpsCoords, onCapture])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: '#000' }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full touch-manipulation"
        style={{ background: 'rgba(0,0,0,0.5)' }}
      >
        <X className="w-5 h-5" style={{ color: '#fff' }} />
      </button>

      {captured ? (
        /* ── Preview mode ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div
            className="rounded-xl overflow-hidden w-full"
            style={{ maxHeight: '50vh' }}
          >
            <img
              src={captured}
              alt="Captured container"
              className="w-full h-auto object-contain"
            />
          </div>
          <p className="text-xs mt-3 mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Kiểm tra số cont trong ảnh
          </p>
          <div className="flex gap-4 px-6 w-full">
            <button
              onClick={handleRetake}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold touch-manipulation"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <RotateCcw className="w-4 h-4" /> Chụp lại
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold touch-manipulation"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              Dùng ảnh này
            </button>
          </div>
        </div>
      ) : (
        /* ── Scanner mode ── */
        <>
          {/* Camera feed */}
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.8}
            videoConstraints={{ facingMode: 'environment' }}
            className="w-full h-full object-cover"
          />

          {/* Overlay with rectangle hole */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="relative rounded-xl"
              style={{
                width: `${RECT_WIDTH_PERCENT * 100}%`,
                height: `${RECT_HEIGHT_PX}px`,
                boxShadow: '0 0 0 1000px rgba(0, 0, 0, 0.6)',
                border: '2px solid rgba(255,255,255,0.4)',
              }}
            >
              {/* Corner markers */}
              <div className="absolute -top-[2px] -left-[2px] w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
              <div className="absolute -top-[2px] -right-[2px] w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
              <div className="absolute -bottom-[2px] -left-[2px] w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
              <div className="absolute -bottom-[2px] -right-[2px] w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
            </div>

            <p
              className="mt-4 text-xs font-bold uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.8)', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              Căn số cont vào khung
            </p>
          </div>

          {/* Capture button */}
          <div
            className="absolute bottom-8 left-0 right-0 flex justify-center"
            style={{ pointerEvents: 'auto' }}
          >
            <button
              onClick={handleCapture}
              className="w-16 h-16 rounded-full flex items-center justify-center touch-manipulation transition-transform active:scale-90"
              style={{
                background: 'var(--theme-brand-primary)',
                border: '4px solid rgba(255,255,255,0.3)',
              }}
            >
              <div className="w-12 h-12 rounded-full" style={{ background: '#fff', opacity: 0.9 }} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
