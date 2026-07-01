import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, Download, Loader2, X } from 'lucide-react'
import { downloadImage, prefetchImageBlob } from '@/lib/download'
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

  const handleImageLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    naturalSizeRef.current = {
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight,
    }
    commitTransform((current) => current)
  }, [commitTransform])

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
    clearDownloadStatusTimer()
    void prefetchImageBlob(src)
  }, [clearDownloadStatusTimer, src])

  useEffect(() => clearDownloadStatusTimer, [clearDownloadStatusTimer])

  const canReset = transform.scale > MIN_SCALE + 0.001
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
      className="fixed inset-0 z-[200] overflow-hidden animate-in fade-in duration-150"
      style={{ background: 'color-mix(in srgb, var(--theme-text-primary) 96%, transparent)' }}
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
        <img
          src={src}
          alt={alt}
          className="max-h-[100dvh] max-w-screen object-contain select-none rounded-sm will-change-transform"
          style={{
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
            transition: isInteracting ? 'none' : 'transform 140ms ease-out',
          }}
          draggable={false}
          onLoad={handleImageLoad}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-end gap-2 px-3 pb-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-4"
        style={{
          background: 'linear-gradient(to bottom, color-mix(in srgb, var(--theme-text-primary) 72%, transparent), transparent)',
        }}
      >
        <div className="pointer-events-auto flex max-w-full items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadState === 'working'}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold backdrop-blur-md transition-[background,color,border-color,transform] duration-150 active:scale-95 disabled:opacity-70 sm:h-11 sm:gap-2 sm:px-3 sm:text-[13px]',
              'border-[color-mix(in_srgb,var(--theme-bg-secondary)_18%,transparent)] bg-[color-mix(in_srgb,var(--theme-bg-secondary)_14%,transparent)] text-[var(--theme-bg-primary)] hover:bg-[color-mix(in_srgb,var(--theme-bg-secondary)_24%,transparent)]',
              downloadState === 'done' && 'text-[var(--theme-status-success)]',
              downloadState === 'error' && 'text-[var(--theme-status-error)]'
            )}
            aria-label="Tải về"
            aria-live="polite"
          >
            {downloadState === 'working' ? <Loader2 className="h-5 w-5 animate-spin" />
              : downloadState === 'done' ? <Check className="h-5 w-5" />
                : downloadState === 'error' ? <AlertTriangle className="h-5 w-5" />
                  : <Download className="h-5 w-5" />}
            <span>{downloadLabel}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--theme-bg-secondary)_18%,transparent)] bg-[color-mix(in_srgb,var(--theme-bg-secondary)_14%,transparent)] text-[var(--theme-bg-primary)] backdrop-blur-md transition-[background,transform] duration-150 hover:bg-[color-mix(in_srgb,var(--theme-bg-secondary)_24%,transparent)] active:scale-95 sm:h-11 sm:w-11"
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
