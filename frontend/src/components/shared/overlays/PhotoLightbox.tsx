import { useEffect, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, Loader2, Check, AlertTriangle } from 'lucide-react'
import { downloadImage, prefetchImageBlob, shouldPrepareImageDownload } from '@/lib/download'

interface PhotoLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

interface Transform {
  scale: number
  x: number
  y: number
}

interface Point {
  x: number
  y: number
}

const MIN_SCALE = 1
const MAX_SCALE = 5

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function getMidpoint(a: Point, b: Point) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

export function PhotoLightbox({ src, alt = 'Ảnh container', onClose }: PhotoLightboxProps) {
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 })
  const [isInteracting, setIsInteracting] = useState(false)
  const transformRef = useRef(transform)
  const pointersRef = useRef(new Map<number, Point>())
  const dragStartRef = useRef<{ point: Point; transform: Transform } | null>(null)
  const pinchStartRef = useRef<{ distance: number; midpoint: Point; transform: Transform } | null>(null)
  const gestureMovedRef = useRef(false)
  const lastTapRef = useRef(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPreparingDownload, setIsPreparingDownload] = useState(false)
  const [dlStatus, setDlStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [stageMsg, setStageMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleDownload = useCallback(async () => {
    if (isPreparingDownload) return
    setDlStatus('working')
    setStageMsg('① Đã bấm')
    setErrorMsg('')
    setIsDownloading(true)
    console.log('[Tải về] click registered, src=', src)
    try {
      await downloadImage(src, alt, (stage) => {
        setStageMsg(stage)
        console.log('[Tải về] stage:', stage)
      })
      setDlStatus('done')
      setStageMsg('✓ Đã gửi lệnh tải')
      console.log('[Tải về] done')
    } catch (err) {
      setDlStatus('error')
      setErrorMsg(err instanceof Error ? `${err.name}: ${err.message}` : String(err))
      console.error('[Tải về] FAILED', err)
    } finally {
      setIsDownloading(false)
    }
  }, [alt, isPreparingDownload, src])

  const updateTransform = useCallback((next: Transform | ((current: Transform) => Transform)) => {
    setTransform((current) => {
      const value = typeof next === 'function' ? next(current) : next
      const normalized = value.scale <= MIN_SCALE
        ? { scale: MIN_SCALE, x: 0, y: 0 }
        : { scale: clamp(value.scale, MIN_SCALE, MAX_SCALE), x: value.x, y: value.y }

      transformRef.current = normalized
      return normalized
    })
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '0') updateTransform({ scale: 1, x: 0, y: 0 })
    },
    [onClose, updateTransform]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Prefetch the image bytes on open so the "Tải về" button can invoke
  // navigator.share() synchronously within the tap gesture (see download.ts).
  useEffect(() => {
    let active = true
    const shouldWait = shouldPrepareImageDownload()
    setIsPreparingDownload(shouldWait)
    void prefetchImageBlob(src).finally(() => {
      if (active) setIsPreparingDownload(false)
    })
    return () => {
      active = false
    }
  }, [src])

  const zoomBy = useCallback((delta: number) => {
    updateTransform((current) => {
      const scale = clamp(current.scale * delta, MIN_SCALE, MAX_SCALE)
      return { ...current, scale }
    })
  }, [updateTransform])

  const toggleZoom = useCallback((point?: Point) => {
    const current = transformRef.current
    if (current.scale > MIN_SCALE) {
      updateTransform({ scale: 1, x: 0, y: 0 })
      return
    }

    updateTransform({
      scale: 2.5,
      x: point ? (window.innerWidth / 2 - point.x) * 0.35 : 0,
      y: point ? (window.innerHeight / 2 - point.y) * 0.35 : 0,
    })
  }, [updateTransform])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    zoomBy(e.deltaY > 0 ? 0.9 : 1.12)
  }, [zoomBy])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return

    e.preventDefault()
    e.stopPropagation()

    e.currentTarget.setPointerCapture(e.pointerId)
    setIsInteracting(true)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const pointers = Array.from(pointersRef.current.values())
    if (pointers.length === 1) {
      gestureMovedRef.current = false
      dragStartRef.current = {
        point: pointers[0],
        transform: transformRef.current,
      }
    }

    if (pointers.length === 2) {
      gestureMovedRef.current = true
      pinchStartRef.current = {
        distance: getDistance(pointers[0], pointers[1]),
        midpoint: getMidpoint(pointers[0], pointers[1]),
        transform: transformRef.current,
      }
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    if (!pointersRef.current.has(e.pointerId)) return

    e.preventDefault()
    e.stopPropagation()
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const pointers = Array.from(pointersRef.current.values())
    if (pointers.length === 2 && pinchStartRef.current) {
      gestureMovedRef.current = true
      const midpoint = getMidpoint(pointers[0], pointers[1])
      const scale = clamp(
        pinchStartRef.current.transform.scale * (getDistance(pointers[0], pointers[1]) / pinchStartRef.current.distance),
        MIN_SCALE,
        MAX_SCALE
      )

      updateTransform({
        scale,
        x: pinchStartRef.current.transform.x + midpoint.x - pinchStartRef.current.midpoint.x,
        y: pinchStartRef.current.transform.y + midpoint.y - pinchStartRef.current.midpoint.y,
      })
      return
    }

    if (pointers.length === 1 && dragStartRef.current && transformRef.current.scale > MIN_SCALE) {
      const pointer = pointers[0]
      if (getDistance(pointer, dragStartRef.current.point) > 8) {
        gestureMovedRef.current = true
      }

      updateTransform({
        scale: dragStartRef.current.transform.scale,
        x: dragStartRef.current.transform.x + pointer.x - dragStartRef.current.point.x,
        y: dragStartRef.current.transform.y + pointer.y - dragStartRef.current.point.y,
      })
    }
  }, [updateTransform])

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return

    e.preventDefault()
    e.stopPropagation()

    const endedPoint = pointersRef.current.get(e.pointerId)
    pointersRef.current.delete(e.pointerId)
    pinchStartRef.current = null

    const remainingPointers = Array.from(pointersRef.current.values())
    if (remainingPointers.length === 1) {
      setIsInteracting(true)
      dragStartRef.current = {
        point: remainingPointers[0],
        transform: transformRef.current,
      }
      return
    }

    setIsInteracting(false)
    dragStartRef.current = null

    if (remainingPointers.length === 0 && endedPoint && !gestureMovedRef.current) {
      const now = Date.now()
      if (now - lastTapRef.current < 280) {
        toggleZoom(endedPoint)
        lastTapRef.current = 0
        return
      }
      lastTapRef.current = now
    }
  }, [toggleZoom])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsInteracting(true)

    const touches = Array.from(e.touches).map((touch) => ({ x: touch.clientX, y: touch.clientY }))
    if (touches.length === 1) {
      gestureMovedRef.current = false
      pinchStartRef.current = null
      dragStartRef.current = {
        point: touches[0],
        transform: transformRef.current,
      }
    }

    if (touches.length >= 2) {
      const firstTwo = touches.slice(0, 2)
      gestureMovedRef.current = true
      dragStartRef.current = null
      pinchStartRef.current = {
        distance: getDistance(firstTwo[0], firstTwo[1]),
        midpoint: getMidpoint(firstTwo[0], firstTwo[1]),
        transform: transformRef.current,
      }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const touches = Array.from(e.touches).map((touch) => ({ x: touch.clientX, y: touch.clientY }))
    if (touches.length >= 2 && pinchStartRef.current) {
      const firstTwo = touches.slice(0, 2)
      const midpoint = getMidpoint(firstTwo[0], firstTwo[1])
      const scale = clamp(
        pinchStartRef.current.transform.scale * (getDistance(firstTwo[0], firstTwo[1]) / pinchStartRef.current.distance),
        MIN_SCALE,
        MAX_SCALE
      )

      gestureMovedRef.current = true
      updateTransform({
        scale,
        x: pinchStartRef.current.transform.x + midpoint.x - pinchStartRef.current.midpoint.x,
        y: pinchStartRef.current.transform.y + midpoint.y - pinchStartRef.current.midpoint.y,
      })
      return
    }

    if (touches.length === 1 && dragStartRef.current && transformRef.current.scale > MIN_SCALE) {
      const touch = touches[0]
      if (getDistance(touch, dragStartRef.current.point) > 8) {
        gestureMovedRef.current = true
      }

      updateTransform({
        scale: dragStartRef.current.transform.scale,
        x: dragStartRef.current.transform.x + touch.x - dragStartRef.current.point.x,
        y: dragStartRef.current.transform.y + touch.y - dragStartRef.current.point.y,
      })
    }
  }, [updateTransform])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const touches = Array.from(e.touches).map((touch) => ({ x: touch.clientX, y: touch.clientY }))
    const endedTouch = e.changedTouches[0]
    const endedPoint = endedTouch ? { x: endedTouch.clientX, y: endedTouch.clientY } : null

    pinchStartRef.current = null

    if (touches.length === 1) {
      setIsInteracting(true)
      dragStartRef.current = {
        point: touches[0],
        transform: transformRef.current,
      }
      return
    }

    setIsInteracting(false)
    dragStartRef.current = null

    if (touches.length === 0 && endedPoint && !gestureMovedRef.current) {
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        toggleZoom(endedPoint)
        lastTapRef.current = 0
        return
      }
      lastTapRef.current = now
    }
  }, [toggleZoom])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh toàn màn hình"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden animate-in fade-in duration-200"
      style={{ background: '#000' }}
      onClick={onClose}
    >
      <div
        className={`relative z-10 flex h-full w-full items-center justify-center select-none ${transform.scale > MIN_SCALE ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
        onClick={(e) => {
          e.stopPropagation()
          if (e.target === e.currentTarget) onClose()
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[92vw] object-contain select-none rounded-sm animate-in zoom-in-95 duration-200 will-change-transform"
          style={{
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
            transition: isInteracting ? 'none' : 'transform 120ms ease-out',
          }}
          draggable={false}
        />
      </div>

      {/* Top toolbar */}
      <div
        className="absolute top-0 inset-x-0 z-20 flex items-center justify-end gap-2 px-3 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-4 sm:pb-4 sm:pt-4"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.36) 64%, transparent 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading || isPreparingDownload}
          className={`flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-sm font-semibold touch-manipulation transition-all duration-150 disabled:opacity-60 active:scale-95 ${dlStatus === 'error' ? 'ring-2 ring-red-400' : ''}`}
          style={{
            color: dlStatus === 'done' ? '#4ade80' : dlStatus === 'error' ? '#f87171' : 'rgba(255,255,255,0.9)',
            background: dlStatus === 'working' ? 'rgba(96,165,250,0.25)' : dlStatus === 'done' ? 'rgba(74,222,128,0.20)' : dlStatus === 'error' ? 'rgba(248,113,113,0.20)' : 'rgba(255,255,255,0.10)',
          }}
          onMouseEnter={(e) => {
            if (isDownloading || isPreparingDownload) return
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.background = 'rgba(255,255,255,0.18)'
          }}
          onMouseLeave={(e) => {
            if (dlStatus !== 'idle') return
            e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
          }}
          aria-label="Tải về"
        >
          {dlStatus === 'done' ? <Check className="h-5 w-5" />
            : dlStatus === 'error' ? <AlertTriangle className="h-5 w-5" />
            : (dlStatus === 'working' || isDownloading || isPreparingDownload) ? <Loader2 className="h-5 w-5 animate-spin" />
            : <Download className="h-5 w-5" />}
          <span>{dlStatus === 'idle' ? (isPreparingDownload ? 'Đang chuẩn bị' : 'Tải về') : stageMsg}</span>
        </button>
        {dlStatus === 'error' && errorMsg && (
          <div className="absolute top-[80px] left-1/2 -translate-x-1/2 z-30 max-w-[85vw] rounded-lg bg-red-900/80 px-4 py-2 text-center text-xs text-red-100 backdrop-blur-sm">
            {errorMsg}
          </div>
        )}
        <button
          onClick={onClose}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-xl touch-manipulation transition-colors duration-150"
          style={{ color: '#fff', background: 'rgba(255,255,255,0.14)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.background = 'rgba(255,255,255,0.22)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
          }}
          aria-label="Đóng"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>,
    document.body
  )
}
