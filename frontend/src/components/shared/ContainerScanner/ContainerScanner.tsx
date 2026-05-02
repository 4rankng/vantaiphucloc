import { useRef, useCallback, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { X, RotateCcw, Image } from 'lucide-react'

export interface PhotoMeta {
  lat: number | null
  lng: number | null
  timestamp: string
}

type ScanMode = 'rectangle' | 'square'

interface ContainerScannerProps {
  onCapture: (imageSrc: string, meta: PhotoMeta) => void
  onClose: () => void
  /** Pre-selected gallery image to crop instead of opening camera */
  galleryImage?: string | null
}

const RECT_WIDTH_PERCENT = 0.85
const SQUARE_SIZE_PERCENT = 0.75
const MAX_CAPTURE_WIDTH = 1200

// ─── Crop a loaded image to the given pixel area ──────────────────────────────
async function cropImageToDataUrl(imageSrc: string, pixelCrop: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const outW = Math.min(pixelCrop.width, MAX_CAPTURE_WIDTH)
      const outH = Math.round(pixelCrop.height * (outW / pixelCrop.width))
      canvas.width = outW
      canvas.height = outH
      canvas.getContext('2d')!.drawImage(
        img,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, outW, outH,
      )
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = reject
    img.src = imageSrc
  })
}

export function ContainerScanner({ onCapture, onClose, galleryImage }: ContainerScannerProps) {
  const webcamRef = useRef<Webcam>(null)
  const overlayBoxRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [captured, setCaptured] = useState<string | null>(null)
  const [imageToCrop, setImageToCrop] = useState<string | null>(galleryImage ?? null)
  const [scanMode, setScanMode] = useState<ScanMode>('rectangle')
  const [gpsCoords, setGpsCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })

  // react-easy-crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  // Sync galleryImage prop
  useEffect(() => {
    if (galleryImage) {
      setImageToCrop(galleryImage)
      setCaptured(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
  }, [galleryImage])

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsCoords({ lat: null, lng: null }),
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [])

  // ── Camera capture: crop video frame using the overlay box ──────────────────
  const handleCapture = useCallback(() => {
    const video = webcamRef.current?.video
    const overlayBox = overlayBoxRef.current
    if (!video || !overlayBox) return

    const rect = overlayBox.getBoundingClientRect()
    const scaleX = video.videoWidth / window.innerWidth
    const scaleY = video.videoHeight / window.innerHeight

    const sx = rect.left * scaleX
    const sy = rect.top * scaleY
    const sw = rect.width * scaleX
    const sh = rect.height * scaleY

    const canvas = document.createElement('canvas')
    const outW = Math.min(sw, MAX_CAPTURE_WIDTH)
    const outH = Math.round(sh * (outW / sw))
    canvas.width = outW
    canvas.height = outH
    canvas.getContext('2d')!.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH)
    setCaptured(canvas.toDataURL('image/jpeg', 0.92))
  }, [])

  // ── Gallery crop: use react-easy-crop's croppedAreaPixels ──────────────────
  const handleGalleryCrop = useCallback(async () => {
    if (!imageToCrop || !croppedAreaPixels) return
    const result = await cropImageToDataUrl(imageToCrop, croppedAreaPixels)
    onCapture(result, {
      lat: gpsCoords.lat,
      lng: gpsCoords.lng,
      timestamp: new Date().toISOString(),
    })
  }, [imageToCrop, croppedAreaPixels, gpsCoords, onCapture])

  const handleRetake = useCallback(() => {
    setCaptured(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
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

  const handleGallerySelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageToCrop(reader.result as string)
      setCaptured(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  // ── Camera overlay box ──────────────────────────────────────────────────────
  const overlayBoxStyle = {
    width: scanMode === 'square' ? `${SQUARE_SIZE_PERCENT * 100}%` : `${RECT_WIDTH_PERCENT * 100}%`,
    height: scanMode === 'rectangle' ? '120px' : undefined,
    aspectRatio: scanMode === 'square' ? '1 / 1' : undefined,
    boxShadow: '0 0 0 1000px rgba(0, 0, 0, 0.6)',
    border: '2px dashed rgba(22, 163, 74, 0.5)',
  } as React.CSSProperties

  const overlayBox = (
    <div ref={overlayBoxRef} className="relative rounded-xl" style={overlayBoxStyle}>
      <div className="absolute -top-[2px] -left-[2px] w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
      <div className="absolute -top-[2px] -right-[2px] w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
      <div className="absolute -bottom-[2px] -left-[2px] w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
      <div className="absolute -bottom-[2px] -right-[2px] w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: 'var(--theme-brand-primary)' }} />
    </div>
  )

  const modeToggleButton = (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => setScanMode(m => m === 'rectangle' ? 'square' : 'rectangle')}
        className="w-12 h-12 flex items-center justify-center rounded-full touch-manipulation"
        style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
      >
        {scanMode === 'rectangle' ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="5" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </button>
      <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {scanMode === 'rectangle' ? 'Vuông' : 'Ngang'}
      </span>
    </div>
  )

  // ── Crop aspect ratio for react-easy-crop ───────────────────────────────────
  const cropAspect = scanMode === 'square' ? 1 : 3.5 // wide rectangle for container numbers

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#000' }}>
      {/* Hidden file input (camera mode gallery button) */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full touch-manipulation"
        style={{ background: 'rgba(0,0,0,0.5)' }}
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {captured ? (
        /* ── Preview ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-full rounded-xl overflow-hidden" style={{ border: '2px solid var(--theme-brand-primary)' }}>
            <img src={captured} alt="Captured" className="w-full h-auto block" />
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Kiểm tra số cont trong ảnh</p>
          <div className="flex gap-4 w-full">
            <button
              onClick={handleRetake}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold touch-manipulation"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <RotateCcw className="w-4 h-4" /> {imageToCrop ? 'Cắt lại' : 'Chụp lại'}
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

      ) : imageToCrop ? (
        /* ── Gallery crop mode — react-easy-crop ── */
        <>
          {/* Crop area fills the screen */}
          <div className="absolute inset-0" style={{ bottom: '100px' }}>
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={cropAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { background: '#000' },
                cropAreaStyle: {
                  border: '2px solid var(--theme-brand-primary)',
                  borderRadius: '12px',
                },
              }}
            />
          </div>

          {/* Bottom controls — pinch to zoom, compact buttons */}
          <div
            className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-3 flex items-center justify-center gap-5"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            {/* Choose another image (left) */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => { setCaptured(null); setCrop({ x: 0, y: 0 }); setZoom(1); fileInputRef.current?.click() }}
                className="w-12 h-12 flex items-center justify-center rounded-full touch-manipulation"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Chọn lại
              </span>
            </div>

            {/* Confirm — compact pill (center) */}
            <button
              onClick={handleGalleryCrop}
              className="px-8 py-3 rounded-full text-sm font-bold touch-manipulation"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              Xác nhận
            </button>

            {/* Mode toggle (right) */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setScanMode(m => m === 'rectangle' ? 'square' : 'rectangle')}
                className="w-12 h-12 flex items-center justify-center rounded-full touch-manipulation"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
              >
                {scanMode === 'rectangle' ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="1" y="5" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                )}
              </button>
              <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {scanMode === 'rectangle' ? 'Vuông' : 'Ngang'}
              </span>
            </div>
          </div>
        </>

      ) : (
        /* ── Camera mode ── */
        <>
          <div className="scanner-video">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.8}
              videoConstraints={{ facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1920 } }}
              className="w-full h-full"
            />
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
            {overlayBox}
            <p className="text-sm font-bold mt-4" style={{ color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.8)', position: 'relative', zIndex: 1 }}>
              Đưa số container vào ô này
            </p>
          </div>

          <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6" style={{ pointerEvents: 'auto' }}>
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleGallerySelect}
                className="w-12 h-12 flex items-center justify-center rounded-full touch-manipulation"
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
              >
                <Image className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Thư viện</span>
            </div>

            <button
              onClick={handleCapture}
              className="w-16 h-16 rounded-full flex items-center justify-center touch-manipulation transition-transform active:scale-90"
              style={{ background: 'var(--theme-brand-primary)', border: '4px solid rgba(255,255,255,0.3)' }}
            >
              <div className="w-12 h-12 rounded-full" style={{ background: '#fff', opacity: 0.9 }} />
            </button>

            {modeToggleButton}
          </div>
        </>
      )}
    </div>
  )
}
