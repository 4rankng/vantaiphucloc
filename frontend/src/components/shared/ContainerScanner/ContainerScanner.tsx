import { useRef, useCallback, useState } from 'react'
import Webcam from 'react-webcam'
import { X, RotateCcw } from 'lucide-react'

interface ContainerScannerProps {
  onCapture: (imageSrc: string) => void
  onClose: () => void
}

// Target rectangle dimensions — must match CSS values
const RECT_WIDTH_PERCENT = 0.85
const RECT_HEIGHT_PX = 100

export function ContainerScanner({ onCapture, onClose }: ContainerScannerProps) {
  const webcamRef = useRef<Webcam>(null)
  const [captured, setCaptured] = useState<string | null>(null)

  const handleCapture = useCallback(() => {
    const webcam = webcamRef.current
    if (!webcam) return

    const video = webcam.video
    if (!video) return

    const canvas = document.createElement('canvas')

    // Video source resolution (actual pixels)
    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight

    // Scale factor between displayed size and actual resolution
    const scale = sourceWidth / video.clientWidth

    // Calculate crop coordinates in actual pixels
    const cropWidth = (video.clientWidth * RECT_WIDTH_PERCENT) * scale
    const cropHeight = RECT_HEIGHT_PX * scale
    const cropX = (sourceWidth - cropWidth) / 2
    const cropY = (sourceHeight - cropHeight) / 2

    canvas.width = cropWidth
    canvas.height = cropHeight

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(
      video,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight,
    )

    const croppedImage = canvas.toDataURL('image/jpeg', 0.8)
    setCaptured(croppedImage)
  }, [])

  const handleRetake = useCallback(() => {
    setCaptured(null)
  }, [])

  const handleConfirm = useCallback(() => {
    if (captured) {
      onCapture(captured)
    }
  }, [captured, onCapture])

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
