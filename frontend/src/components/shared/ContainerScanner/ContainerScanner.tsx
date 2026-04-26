import { useRef, useCallback, useState } from 'react'
import Webcam from 'react-webcam'
import { X, RotateCcw } from 'lucide-react'

interface ContainerScannerProps {
  onCapture: (imageSrc: string) => void
  onClose: () => void
}

export function ContainerScanner({ onCapture, onClose }: ContainerScannerProps) {
  const webcamRef = useRef<Webcam>(null)
  const [captured, setCaptured] = useState<string | null>(null)

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setCaptured(imageSrc)
    }
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
        <div className="flex-1 flex flex-col items-center justify-center">
          <img
            src={captured}
            alt="Captured container"
            className="w-full max-h-[60vh] object-contain"
          />
          <div className="flex gap-4 mt-6 px-6 w-full">
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
                width: '85%',
                height: '100px',
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
