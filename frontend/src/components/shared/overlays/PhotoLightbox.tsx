import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, Download, ImageOff, Loader2, RefreshCw, X } from 'lucide-react'
import {
  downloadImage,
  getImageDownloadHref,
  prefetchImageBlob,
  shouldPrepareImageDownload,
} from '@/lib/download'
import { cn } from '@/lib/utils'

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

interface Size {
  width: number
  height: number
}

type DownloadState = 'idle' | 'working' | 'done' | 'error'
type ImageState = 'loading' | 'ready' | 'error'

const MIN_SCALE = 1
const MAX_SCALE = 5
const DOUBLE_TAP_SCALE = 2.5
const TAP_MOVE_LIMIT = 8
const DOUBLE_TAP_MS = 280
const EMPTY_TRANSFORM: Transform = { scale: 1, x: 0, y: 0 }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

function containSize(image: Size, box: Size): Size {
  if (image.width <= 0 || image.height <= 0 || box.width <= 0 || box.height <= 0) {
    return { width: 0, height: 0 }
  }

  const ratio = Math.min(1, box.width / image.width, box.height / image.height)
  return {
    width: image.width * ratio,
    height: image.height * ratio,
  }
}

function panBounds(scale: number, viewport: Size, naturalSize: Size | null) {
  if (scale <= MIN_SCALE || viewport.width <= 0 || viewport.height <= 0) {
    return { x: 0, y: 0 }
  }

  const baseSize = naturalSize ? containSize(naturalSize, viewport) : viewport
  return {
    x: Math.max(0, (baseSize.width * scale - viewport.width) / 2),
    y: Math.max(0, (baseSize.height * scale - viewport.height) / 2),
  }
}

function normalizeTransform(next: Transform, viewport: Size, naturalSize: Size | null): Transform {
  const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE)
  if (scale <= MIN_SCALE + 0.001) return EMPTY_TRANSFORM

  const bounds = panBounds(scale, viewport, naturalSize)
  return {
    scale,
    x: clamp(next.x, -bounds.x, bounds.x),
    y: clamp(next.y, -bounds.y, bounds.y),
  }
}

function pointFromEvent(e: { clientX: number; clientY: number }): Point {
  return { x: e.clientX, y: e.clientY }
}

function pointsFromTouches(touches: TouchList): Point[] {
  return Array.from(touches, (touch) => ({ x: touch.clientX, y: touch.clientY }))
}

export function PhotoLightbox({ src, alt = 'Ảnh container', onClose }: PhotoLightboxProps) {
  const [transform, setTransform] = useState<Transform>(EMPTY_TRANSFORM)
  const [isInteracting, setIsInteracting] = useState(false)
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [downloadError, setDownloadError] = useState('')
  const [imageState, setImageState] = useState<ImageState>('loading')
  const [imageAttempt, setImageAttempt] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const transformRef = useRef<Transform>(EMPTY_TRANSFORM)
  const viewportRef = useRef<Size>({ width: 0, height: 0 })
  const naturalSizeRef = useRef<Size | null>(null)
  const pointersRef = useRef(new Map<number, Point>())
  const dragRef = useRef<{ point: Point; transform: Transform } | null>(null)
  const pinchRef = useRef<{ distance: number; imagePoint: Point; transform: Transform } | null>(null)
  const movedRef = useRef(false)
  const startedOnBackdropRef = useRef(false)
  const lastTapRef = useRef<{ time: number; point: Point } | null>(null)
  const resetStatusTimerRef = useRef<number | null>(null)

  const commitTransform = useCallback((next: Transform | ((current: Transform) => Transform)) => {
    const raw = typeof next === 'function' ? next(transformRef.current) : next
    const normalized = normalizeTransform(raw, viewportRef.current, naturalSizeRef.current)
    transformRef.current = normalized
    setTransform(normalized)
  }, [])

  const resetTransform = useCallback(() => {
    commitTransform(EMPTY_TRANSFORM)
  }, [commitTransform])

  const updateViewport = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return

    viewportRef.current = { width: rect.width, height: rect.height }
    commitTransform((current) => current)
  }, [commitTransform])

  const pointToStageOffset = useCallback((point: Point): Point => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return point

    return {
      x: point.x - rect.left - rect.width / 2,
      y: point.y - rect.top - rect.height / 2,
    }
  }, [])

  const zoomAt = useCallback((point: Point, nextScale: number) => {
    const current = transformRef.current
    const stagePoint = pointToStageOffset(point)
    const imagePoint = {
      x: (stagePoint.x - current.x) / current.scale,
      y: (stagePoint.y - current.y) / current.scale,
    }
    const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE)

    commitTransform({
      scale,
      x: stagePoint.x - imagePoint.x * scale,
      y: stagePoint.y - imagePoint.y * scale,
    })
  }, [commitTransform, pointToStageOffset])

  const zoomFromCenter = useCallback((factor: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    const center = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 }

    zoomAt(center, transformRef.current.scale * factor)
  }, [zoomAt])

  const toggleZoom = useCallback((point: Point) => {
    const current = transformRef.current
    if (current.scale > MIN_SCALE + 0.001) {
      resetTransform()
      return
    }

    zoomAt(point, DOUBLE_TAP_SCALE)
  }, [resetTransform, zoomAt])

  const clearDownloadStatusTimer = useCallback(() => {
    if (resetStatusTimerRef.current == null) return
    window.clearTimeout(resetStatusTimerRef.current)
    resetStatusTimerRef.current = null
  }, [])

  const finishDownloadStatus = useCallback((state: DownloadState) => {
    setDownloadState(state)
    clearDownloadStatusTimer()
    resetStatusTimerRef.current = window.setTimeout(() => {
      setDownloadState('idle')
      setDownloadError('')
      resetStatusTimerRef.current = null
    }, state === 'done' ? 1400 : 2600)
  }, [clearDownloadStatusTimer])

  const handleDownload = useCallback(async () => {
    if (downloadState === 'working') return

    clearDownloadStatusTimer()
    setDownloadState('working')
    setDownloadError('')

    try {
      await downloadImage(src, alt)
      finishDownloadStatus('done')
    } catch {
      setDownloadError('Không tải được ảnh')
      finishDownloadStatus('error')
    }
  }, [alt, clearDownloadStatusTimer, downloadState, finishDownloadStatus, src])

  const handleDownloadClick = useCallback((e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation()
    if (!shouldPrepareImageDownload()) return

    e.preventDefault()
    void handleDownload()
  }, [handleDownload])

  const handleImageLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    naturalSizeRef.current = {
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight,
    }
    setImageState('ready')
    commitTransform((current) => current)
  }, [commitTransform])

  const handleImageRetry = useCallback(() => {
    setImageState('loading')
    setImageAttempt((current) => current + 1)
  }, [])

  const handleWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const current = transformRef.current
    const factor = Math.exp(-e.deltaY * 0.002)
    zoomAt({ x: e.clientX, y: e.clientY }, current.scale * factor)
  }, [zoomAt])

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return

    e.preventDefault()
    e.stopPropagation()

    const point = pointFromEvent(e)
    pointersRef.current.set(e.pointerId, point)
    setIsInteracting(true)

    const pointers = Array.from(pointersRef.current.values())
    if (pointers.length === 1) {
      movedRef.current = false
      startedOnBackdropRef.current = e.target === e.currentTarget
      dragRef.current = {
        point,
        transform: transformRef.current,
      }
      pinchRef.current = null
      return
    }

    if (pointers.length === 2) {
      movedRef.current = true
      startedOnBackdropRef.current = false
      dragRef.current = null

      const startMidpoint = midpoint(pointers[0], pointers[1])
      const stagePoint = pointToStageOffset(startMidpoint)
      const current = transformRef.current
      pinchRef.current = {
        distance: Math.max(1, distance(pointers[0], pointers[1])),
        imagePoint: {
          x: (stagePoint.x - current.x) / current.scale,
          y: (stagePoint.y - current.y) / current.scale,
        },
        transform: current,
      }
    }
  }, [pointToStageOffset])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const touches = pointsFromTouches(e.touches)
    if (touches.length === 0) return

    setIsInteracting(true)

    if (touches.length === 1) {
      movedRef.current = false
      startedOnBackdropRef.current = e.target === stageRef.current
      dragRef.current = {
        point: touches[0],
        transform: transformRef.current,
      }
      pinchRef.current = null
      return
    }

    const startMidpoint = midpoint(touches[0], touches[1])
    const stagePoint = pointToStageOffset(startMidpoint)
    const current = transformRef.current

    movedRef.current = true
    startedOnBackdropRef.current = false
    dragRef.current = null
    pinchRef.current = {
      distance: Math.max(1, distance(touches[0], touches[1])),
      imagePoint: {
        x: (stagePoint.x - current.x) / current.scale,
        y: (stagePoint.y - current.y) / current.scale,
      },
      transform: current,
    }
  }, [pointToStageOffset])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const touches = pointsFromTouches(e.touches)
    if (touches.length >= 2 && pinchRef.current) {
      const nextMidpoint = midpoint(touches[0], touches[1])
      const nextDistance = Math.max(1, distance(touches[0], touches[1]))
      const nextScale = pinchRef.current.transform.scale * (nextDistance / pinchRef.current.distance)
      const stagePoint = pointToStageOffset(nextMidpoint)
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE)

      movedRef.current = true
      commitTransform({
        scale,
        x: stagePoint.x - pinchRef.current.imagePoint.x * scale,
        y: stagePoint.y - pinchRef.current.imagePoint.y * scale,
      })
      return
    }

    if (touches.length !== 1 || !dragRef.current) return

    const point = touches[0]
    if (distance(point, dragRef.current.point) > TAP_MOVE_LIMIT) {
      movedRef.current = true
    }

    if (dragRef.current.transform.scale <= MIN_SCALE + 0.001) return

    commitTransform({
      scale: dragRef.current.transform.scale,
      x: dragRef.current.transform.x + point.x - dragRef.current.point.x,
      y: dragRef.current.transform.y + point.y - dragRef.current.point.y,
    })
  }, [commitTransform, pointToStageOffset])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const remainingTouches = pointsFromTouches(e.touches)
    if (remainingTouches.length >= 2) {
      const startMidpoint = midpoint(remainingTouches[0], remainingTouches[1])
      const stagePoint = pointToStageOffset(startMidpoint)
      const current = transformRef.current

      movedRef.current = true
      dragRef.current = null
      pinchRef.current = {
        distance: Math.max(1, distance(remainingTouches[0], remainingTouches[1])),
        imagePoint: {
          x: (stagePoint.x - current.x) / current.scale,
          y: (stagePoint.y - current.y) / current.scale,
        },
        transform: current,
      }
      return
    }

    if (remainingTouches.length === 1) {
      movedRef.current = true
      pinchRef.current = null
      dragRef.current = {
        point: remainingTouches[0],
        transform: transformRef.current,
      }
      return
    }

    setIsInteracting(false)
    dragRef.current = null
    pinchRef.current = null

    const endedTouch = e.changedTouches[0]
    if (!endedTouch || movedRef.current) return

    const endedPoint = pointFromEvent(endedTouch)
    if (startedOnBackdropRef.current) {
      onClose()
      return
    }

    const now = Date.now()
    const lastTap = lastTapRef.current
    if (lastTap && now - lastTap.time <= DOUBLE_TAP_MS && distance(lastTap.point, endedPoint) <= 40) {
      lastTapRef.current = null
      toggleZoom(endedPoint)
      return
    }

    lastTapRef.current = { time: now, point: endedPoint }
  }, [onClose, pointToStageOffset, toggleZoom])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return

    e.preventDefault()

    const point = pointFromEvent(e)
    pointersRef.current.set(e.pointerId, point)

    const pointers = Array.from(pointersRef.current.values())
    if (pointers.length === 2 && pinchRef.current) {
      const nextMidpoint = midpoint(pointers[0], pointers[1])
      const nextDistance = distance(pointers[0], pointers[1])
      const nextScale = pinchRef.current.transform.scale * (nextDistance / pinchRef.current.distance)
      const stagePoint = pointToStageOffset(nextMidpoint)
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE)

      movedRef.current = true
      commitTransform({
        scale,
        x: stagePoint.x - pinchRef.current.imagePoint.x * scale,
        y: stagePoint.y - pinchRef.current.imagePoint.y * scale,
      })
      return
    }

    if (pointers.length !== 1 || !dragRef.current) return

    if (distance(point, dragRef.current.point) > TAP_MOVE_LIMIT) {
      movedRef.current = true
    }

    if (dragRef.current.transform.scale <= MIN_SCALE + 0.001) return

    commitTransform({
      scale: dragRef.current.transform.scale,
      x: dragRef.current.transform.x + point.x - dragRef.current.point.x,
      y: dragRef.current.transform.y + point.y - dragRef.current.point.y,
    })
  }, [commitTransform, pointToStageOffset])

  const handlePointerEnd = useCallback((e: PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return

    e.preventDefault()

    const endedPoint = pointersRef.current.get(e.pointerId)
    pointersRef.current.delete(e.pointerId)
    pinchRef.current = null

    const remainingPointers = Array.from(pointersRef.current.values())
    if (remainingPointers.length === 1) {
      dragRef.current = {
        point: remainingPointers[0],
        transform: transformRef.current,
      }
      movedRef.current = true
      return
    }

    setIsInteracting(false)
    dragRef.current = null

    if (!endedPoint || movedRef.current) return

    if (startedOnBackdropRef.current) {
      onClose()
      return
    }

    const now = Date.now()
    const lastTap = lastTapRef.current
    if (lastTap && now - lastTap.time <= DOUBLE_TAP_MS && distance(lastTap.point, endedPoint) <= 40) {
      lastTapRef.current = null
      toggleZoom(endedPoint)
      return
    }

    lastTapRef.current = { time: now, point: endedPoint }
  }, [onClose, toggleZoom])

  useEffect(() => {
    const options: AddEventListenerOptions = { passive: false }
    window.addEventListener('pointermove', handlePointerMove, options)
    window.addEventListener('pointerup', handlePointerEnd, options)
    window.addEventListener('pointercancel', handlePointerEnd, options)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, options)
      window.removeEventListener('pointerup', handlePointerEnd, options)
      window.removeEventListener('pointercancel', handlePointerEnd, options)
    }
  }, [handlePointerEnd, handlePointerMove])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    const options: AddEventListenerOptions = { passive: false }
    stage.addEventListener('touchstart', handleTouchStart, options)
    stage.addEventListener('touchmove', handleTouchMove, options)
    stage.addEventListener('touchend', handleTouchEnd, options)
    stage.addEventListener('touchcancel', handleTouchEnd, options)

    return () => {
      stage.removeEventListener('touchstart', handleTouchStart, options)
      stage.removeEventListener('touchmove', handleTouchMove, options)
      stage.removeEventListener('touchend', handleTouchEnd, options)
      stage.removeEventListener('touchcancel', handleTouchEnd, options)
    }
  }, [handleTouchEnd, handleTouchMove, handleTouchStart])

  useEffect(() => {
    updateViewport()

    window.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('resize', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.visualViewport?.removeEventListener('resize', updateViewport)
    }
  }, [updateViewport])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === '0') resetTransform()
      if (e.key === '+' || e.key === '=') zoomFromCenter(1.25)
      if (e.key === '-' || e.key === '_') zoomFromCenter(0.8)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, resetTransform, zoomFromCenter])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(media.matches)
    updatePreference()
    media.addEventListener('change', updatePreference)
    return () => media.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    pointersRef.current.clear()
    dragRef.current = null
    pinchRef.current = null
    movedRef.current = false
    lastTapRef.current = null
    naturalSizeRef.current = null
    transformRef.current = EMPTY_TRANSFORM
    setTransform(EMPTY_TRANSFORM)
    setDownloadState('idle')
    setDownloadError('')
    setImageState('loading')
    setImageAttempt(0)
    clearDownloadStatusTimer()
    void prefetchImageBlob(src)
  }, [clearDownloadStatusTimer, src])

  useEffect(() => clearDownloadStatusTimer, [clearDownloadStatusTimer])

  const canReset = transform.scale > MIN_SCALE + 0.001
  const downloadHref = getImageDownloadHref(src)
  const downloadLabel = downloadState === 'working'
    ? 'Đang tải'
    : downloadState === 'done'
      ? 'Đã tải'
      : downloadState === 'error'
        ? 'Thử lại'
        : 'Tải về'

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh toàn màn hình"
      aria-busy={imageState === 'loading'}
      className="fixed inset-0 z-[200] overflow-hidden animate-in fade-in duration-150 motion-reduce:animate-none"
      style={{
        background: 'radial-gradient(circle at 50% 44%, color-mix(in srgb, var(--theme-sidebar) 24%, var(--theme-text-primary)), var(--theme-text-primary) 72%)',
      }}
    >
      <div
        ref={stageRef}
        className={cn(
          'relative z-10 flex h-[100dvh] w-screen items-center justify-center overflow-hidden select-none',
          canReset ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
        )}
        style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
      >
        {imageState === 'loading' && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 grid place-items-center text-[var(--theme-text-inverse)]"
          >
            <div className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--theme-text-inverse)_12%,transparent)] bg-[color-mix(in_srgb,var(--theme-text-primary)_46%,transparent)] px-4 py-3 text-sm font-medium backdrop-blur-md">
              <Loader2 className="h-4 w-4 animate-spin opacity-75 motion-reduce:animate-none" />
              Đang tải ảnh…
            </div>
          </div>
        )}
        {imageState === 'error' && (
          <div role="alert" className="absolute inset-0 z-10 grid place-items-center px-6 text-center text-[var(--theme-text-inverse)]">
            <div className="flex max-w-xs flex-col items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--theme-text-inverse)_14%,transparent)] bg-[color-mix(in_srgb,var(--theme-text-inverse)_8%,transparent)]">
                <ImageOff className="h-5 w-5 opacity-70" />
              </span>
              <div className="space-y-1">
                <p className="text-[15px] font-semibold">Không tải được ảnh</p>
                <p className="text-[13px] opacity-70">Kiểm tra kết nối rồi thử lại.</p>
              </div>
              <button
                type="button"
                onClick={handleImageRetry}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--theme-text-inverse)_22%,transparent)] bg-[color-mix(in_srgb,var(--theme-text-inverse)_10%,transparent)] px-4 text-sm font-semibold backdrop-blur-md transition-[background,transform] duration-150 hover:bg-[color-mix(in_srgb,var(--theme-text-inverse)_16%,transparent)] active:scale-[0.98]"
              >
                <RefreshCw className="h-4 w-4" />
                Thử tải lại
              </button>
            </div>
          </div>
        )}
        <img
          key={imageAttempt}
          src={src}
          alt={alt}
          data-viewer-image-state={imageState}
          className="max-h-[100dvh] max-w-screen object-contain select-none rounded-[2px]"
          style={{
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
            opacity: imageState === 'ready' ? 1 : 0,
            transition: reducedMotion || isInteracting
              ? 'none'
              : 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease-out',
            willChange: isInteracting ? 'transform' : 'auto',
          }}
          draggable={false}
          onLoad={handleImageLoad}
          onError={() => setImageState('error')}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-end pb-8 pt-[calc(env(safe-area-inset-top,0px)+12px)]"
        style={{
          paddingLeft: 'max(12px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(12px, env(safe-area-inset-right, 0px))',
          background: 'linear-gradient(to bottom, color-mix(in srgb, var(--theme-text-primary) 88%, transparent), color-mix(in srgb, var(--theme-text-primary) 30%, transparent) 58%, transparent)',
        }}
      >
        <div className="pointer-events-auto flex max-w-full items-center gap-2">
          <a
            href={downloadHref}
            download
            onClick={handleDownloadClick}
            aria-disabled={downloadState === 'working'}
            className={cn(
              'inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-semibold backdrop-blur-md transition-[background,color,border-color,transform] duration-150 active:scale-[0.98] disabled:opacity-70 sm:h-11',
              'border-[color-mix(in_srgb,var(--theme-text-inverse)_18%,transparent)] bg-[color-mix(in_srgb,var(--theme-text-inverse)_10%,transparent)] text-[var(--theme-text-inverse)] hover:bg-[color-mix(in_srgb,var(--theme-text-inverse)_16%,transparent)]',
              downloadState === 'working' && 'pointer-events-none opacity-70',
              downloadState === 'done' && 'text-[var(--theme-status-success)]',
              downloadState === 'error' && 'text-[var(--theme-status-error)]'
            )}
            aria-label="Tải về"
            aria-live="polite"
            tabIndex={downloadState === 'working' ? -1 : undefined}
          >
            {downloadState === 'working' ? <Loader2 className="h-5 w-5 animate-spin" />
              : downloadState === 'done' ? <Check className="h-5 w-5" />
                : downloadState === 'error' ? <AlertTriangle className="h-5 w-5" />
                  : <Download className="h-5 w-5" />}
            <span>{downloadLabel}</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--theme-text-inverse)_18%,transparent)] bg-[color-mix(in_srgb,var(--theme-text-inverse)_10%,transparent)] text-[var(--theme-text-inverse)] backdrop-blur-md transition-[background,transform] duration-150 hover:bg-[color-mix(in_srgb,var(--theme-text-inverse)_16%,transparent)] active:scale-[0.98] sm:h-11 sm:w-11"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {downloadState === 'error' && downloadError && (
          <div className="pointer-events-auto absolute left-1/2 top-[calc(env(safe-area-inset-top,0px)+64px)] max-w-[min(320px,calc(100vw-32px))] -translate-x-1/2 rounded-lg bg-[var(--theme-status-error-light)] px-3 py-2 text-center text-[12px] font-semibold text-[var(--theme-status-error-text)] shadow-theme-card">
            {downloadError}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
