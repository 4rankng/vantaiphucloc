import { useRef, useCallback, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import { X, RotateCcw } from 'lucide-react'
import { calculateCrop } from '@/lib/crop-utils'

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
const STABILITY_THRESHOLD = 15
const REQUIRED_STABLE_FRAMES = 3
const CHECK_INTERVAL_MS = 500

export function ContainerScanner({ onCapture, onClose }: ContainerScannerProps) {
  const webcamRef = useRef<Webcam>(null)
  const overlayBoxRef = useRef<HTMLDivElement>(null)
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null)
  const stabilityCountRef = useRef(0)
  const [captured, setCaptured] = useState<string | null>(null)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })

  const viewfinderHeight = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.4) : 300

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

    const overlayBox = overlayBoxRef.current
    if (!overlayBox) return

    const rect = overlayBox.getBoundingClientRect()

    const crop = calculateCrop({
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
      containerWidth: window.innerWidth,
      containerHeight: window.innerHeight,
      rectLeft: rect.left,
      rectTop: rect.top,
      rectWidth: rect.width,
      rectHeight: rect.height,
    })

    const canvas = document.createElement('canvas')
    canvas.width = crop.width
    canvas.height = crop.height

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)

    let outputCanvas = canvas
    if (crop.width > MAX_CAPTURE_WIDTH) {
      const scale = MAX_CAPTURE_WIDTH / crop.width
      outputCanvas = document.createElement('canvas')
      outputCanvas.width = MAX_CAPTURE_WIDTH
      outputCanvas.height = Math.round(crop.height * scale)
      outputCanvas.getContext('2d')!.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height)
    }

    const croppedImage = outputCanvas.toDataURL('image/jpeg', 0.92)
    setCaptured(croppedImage)
  }, [])

  // Auto-capture via motion stability detection
  useEffect(() => {
    if (captured) return

    const interval = setInterval(() => {
      const video = webcamRef.current?.video
      if (!video || video.readyState < 2) return

      const thumbCanvas = document.createElement('canvas')
      thumbCanvas.width = 80
      thumbCanvas.height = 60
      const ctx = thumbCanvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, 80, 60)
      const currentFrame = ctx.getImageData(0, 0, 80, 60).data

      if (prevFrameRef.current) {
        let diff = 0
        const len = currentFrame.length
        for (let i = 0; i < len; i += 4) {
          diff += Math.abs(currentFrame[i] - prevFrameRef.current[i])
          diff += Math.abs(currentFrame[i + 1] - prevFrameRef.current[i + 1])
          diff += Math.abs(currentFrame[i + 2] - prevFrameRef.current[i + 2])
        }
        const avgDiff = diff / (80 * 60 * 3)

        if (avgDiff < STABILITY_THRESHOLD) {
          stabilityCountRef.current++
          if (stabilityCountRef.current >= REQUIRED_STABLE_FRAMES) {
            handleCapture()
            stabilityCountRef.current = 0
          }
        } else {
          stabilityCountRef.current = 0
        }
      }
      prevFrameRef.current = currentFrame
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [captured, handleCapture])

  const handleRetake = useCallback(() => {
    setCaptured(null)
    prevFrameRef.current = null
    stabilityCountRef.current = 0
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
        /* Preview mode */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-full rounded-xl overflow-hidden" style={{ border: '2px solid var(--theme-brand-primary)' }}>
            <img
              src={captured}
              alt="Captured container"
              className="w-full h-auto block"
            />
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Kiểm tra số cont trong ảnh
          </p>
          <div className="flex gap-4 w-full">
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
        /* Scanner mode */
        <>
          <div className="scanner-video">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.8}
              videoConstraints={{
                facingMode: 'environment',
                width: { ideal: 1080 },
                height: { ideal: 1920 },
              }}
              className="w-full h-full"
            />
          </div>

          {/* Overlay */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ pointerEvents: 'none' }}
          >
            {/* Guide text above viewfinder */}
            <p
              className="text-sm font-bold mb-4"
              style={{ color: 'rgba(255,255,255,0.9)', textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}
            >
              Đưa số container vào ô này
            </p>

            {/* Viewfinder box — dashed green, ~40% height */}
            <div
              ref={overlayBoxRef}
              className="relative rounded-xl"
              style={{
                width: '85%',
                height: `${viewfinderHeight}px`,
                boxShadow: '0 0 0 1000px rgba(0, 0, 0, 0.6)',
                border: '2px dashed rgba(22, 163, 74, 0.5)',
              }}
            >
              {/* Corner markers */}
              <div className="absolute -top-[2px] -left-[2px] w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
              <div className="absolute -top-[2px] -right-[2px] w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
              <div className="absolute -bottom-[2px] -left-[2px] w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
              <div className="absolute -bottom-[2px] -right-[2px] w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
            </div>
          </div>

          {/* Manual capture button — fallback */}
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
