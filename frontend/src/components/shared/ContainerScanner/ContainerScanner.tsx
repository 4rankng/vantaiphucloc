import { useRef, useCallback, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Camera } from 'react-camera-pro'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { X, RotateCcw, Image } from 'lucide-react'

export interface PhotoMeta {
  lat: number | null
  lng: number | null
  timestamp: string
}

interface ContainerScannerProps {
  onCapture: (imageSrc: string, meta: PhotoMeta) => void
  onClose: () => void
  /** Pre-selected gallery image to crop instead of opening camera */
  galleryImage?: string | null
}

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
  const cameraRef = useRef<unknown>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [captured, setCaptured] = useState<string | null>(null)
  const [finalCropped, setFinalCropped] = useState<string | null>(null)
  const [imageToCrop, setImageToCrop] = useState<string | null>(galleryImage ?? null)
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

  // ── Camera capture: takePhoto() returns base64 directly ───────────────────
  const handleCapture = useCallback(() => {
    const cam = cameraRef.current as { takePhoto: () => string } | null
    if (!cam) return
    const photo = cam.takePhoto()
    setCaptured(photo)
    setImageToCrop(photo)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }, [])

  // ── Handle crop confirmation (from camera or gallery) ────────────────────────
  const handleCropConfirm = useCallback(async () => {
    if (!imageToCrop || !croppedAreaPixels) return
    const result = await cropImageToDataUrl(imageToCrop, croppedAreaPixels)
    setFinalCropped(result)
    setCaptured(null)
  }, [imageToCrop, croppedAreaPixels])

  const handleRetake = useCallback(() => {
    setCaptured(null)
    setFinalCropped(null)
    setImageToCrop(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }, [])

  const handleConfirm = useCallback(() => {
    if (finalCropped) {
      onCapture(finalCropped, {
        lat: gpsCoords.lat,
        lng: gpsCoords.lng,
        timestamp: new Date().toISOString(),
      })
    }
  }, [finalCropped, gpsCoords, onCapture])


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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#000' }}>
      {/* Hidden file input (camera mode gallery button) - capture="" forces gallery only on most devices */}
      {/* File input — use a <label> to trigger it so iOS Safari skips the action sheet */}
      <input
        ref={fileInputRef}
        id="scanner-gallery-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full touch-manipulation"
        style={{ background: 'rgba(0,0,0,0.5)' }}
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {finalCropped ? (
        /* ── Preview (final cropped result) ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-full rounded-xl overflow-hidden" style={{ border: '2px solid var(--theme-brand-primary)' }}>
            <img src={finalCropped} alt="Captured" className="w-full h-auto block" />
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Kiểm tra số cont trong ảnh</p>
          <div className="flex gap-4 w-full">
            <button
              onClick={handleRetake}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold touch-manipulation"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <RotateCcw className="w-4 h-4" /> Cắt lại
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
        /* ── Crop mode — react-easy-crop (square only) ── */
        <>
          {/* Crop area fills the screen */}
          <div className="absolute inset-0" style={{ bottom: '100px' }}>
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
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

          {/* Bottom controls */}
          <div
            className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-3 flex items-center justify-center gap-5"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            {/* Retake (left) */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleRetake}
                className="w-12 h-12 flex items-center justify-center rounded-full touch-manipulation"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Chụp lại
              </span>
            </div>

            {/* Confirm crop (center) */}
            <button
              onClick={handleCropConfirm}
              className="px-8 py-3 rounded-full text-sm font-bold touch-manipulation"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              Xác nhận
            </button>
          </div>
        </>
      ) : (
        /* ── Camera mode ── */
        <>
          <div className="absolute inset-0 scanner-video">
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
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center items-center gap-6 pb-8 pt-3 safe-area-bottom" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            <div className="flex flex-col items-center gap-1">
              <label
                htmlFor="scanner-gallery-input"
                className="w-12 h-12 flex items-center justify-center rounded-full touch-manipulation cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
              >
                <Image className="w-5 h-5" />
              </label>
              <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Thư viện</span>
            </div>

            <button
              onClick={handleCapture}
              className="w-16 h-16 rounded-full flex items-center justify-center touch-manipulation transition-transform active:scale-90"
              style={{ background: 'var(--theme-brand-primary)', border: '4px solid rgba(255,255,255,0.3)' }}
            >
              <div className="w-12 h-12 rounded-full" style={{ background: '#fff', opacity: 0.9 }} />
            </button>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}
