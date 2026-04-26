import { useRef, useCallback, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import { X, RotateCcw } from 'lucide-react'

interface ContainerScannerProps {
  onCapture: (imageSrc: string) => void
  onClose: () => void
}

// Target rectangle dimensions (must match the CSS)
const TARGET_WIDTH_RATIO = 0.85
const TARGET_HEIGHT = 100

export function ContainerScanner({ onCapture, onClose }: ContainerScannerProps) {
  const webcamRef = useRef<Webcam>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 })

  // Track container size for crop calculations
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setViewSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const cropToTarget = useCallback((fullImage: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        // Calculate target rectangle position in the video element
        const videoW = viewSize.width
        const videoH = viewSize.height
        const targetW = videoW * TARGET_WIDTH_RATIO
        const targetH = TARGET_HEIGHT
        const targetX = (videoW - targetW) / 2
        const targetY = (videoH - targetH) / 2

        // Map to actual image coordinates
        // Webcam screenshot may have different resolution than displayed size
        const scaleX = img.width / videoW
        const scaleY = img.height / videoH

        const cropX = targetX * scaleX
        const cropY = targetY * scaleY
        const cropW = targetW * scaleX
        const cropH = targetH * scaleY

        canvas.width = cropW
        canvas.height = cropH
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = fullImage
    })
  }, [viewSize])

  const handleCapture = useCallback(async () => {
    const fullImage = webcamRef.current?.getScreenshot()
    if (fullImage && viewSize.width > 0) {
      const cropped = await cropToTarget(fullImage)
      setCaptured(cropped)
    }
  }, [cropToTarget, viewSize])

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
      ref={containerRef}
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
            {/* Dim mask with rectangle cutout */}
            <div
              className="relative rounded-xl"
              style={{
                width: `${TARGET_WIDTH_RATIO * 100}%`,
                height: `${TARGET_HEIGHT}px`,
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

            {/* Instruction */}
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
