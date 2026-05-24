import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface TripBarChartBar {
  day: number
  date?: string
  matched: number
  pending: number
}

export interface TripBarChartProps {
  bars: TripBarChartBar[]
  height?: number
}

function formatDate(date?: string, day?: number): string {
  if (date) {
    const parts = date.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`
  }
  return String(day ?? '')
}

export function TripBarChart({ bars, height = 140 }: TripBarChartProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const CHART_H = height
  const Y_AXIS_W = 28
  const X_AXIS_H = 20

  const maxTotal = Math.max(1, ...bars.map(b => b.matched + b.pending))

  const niceMax = Math.ceil(maxTotal / 4) * 4 || 4
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((niceMax / 4) * (4 - i)))

  const positionTip = useCallback((tip: HTMLDivElement, x: number, y: number) => {
    const GAP = 10
    const vw = window.innerWidth
    const vh = window.innerHeight
    const tw = tip.offsetWidth
    const th = tip.offsetHeight
    const placeLeft = x + GAP + tw > vw
    const placeUp = y + GAP + th > vh
    tip.style.left = placeLeft ? `${x - tw - GAP}px` : `${x + GAP}px`
    tip.style.top = placeUp ? `${y - th - GAP}px` : `${y + GAP}px`
  }, [])

  const moveTooltip = useCallback((e: React.MouseEvent) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    const tip = tipRef.current
    if (!tip) return
    positionTip(tip, e.clientX, e.clientY)
  }, [positionTip])

  const onLeave = useCallback(() => {
    setHoveredDay(null)
  }, [])

  // Show every Nth label to avoid overcrowding
  const labelInterval = bars.length > 20 ? 5 : bars.length > 10 ? 3 : 2

  const hoveredBar = hoveredDay != null ? bars.find(b => b.day === hoveredDay) : null

  // Sync display on hoveredBar change, then re-position with real dimensions
  useEffect(() => {
    const tip = tipRef.current
    if (!tip) return
    if (hoveredBar) {
      tip.style.display = 'block'
      // Re-position now that content is rendered and offsetWidth/Height are accurate
      positionTip(tip, lastMousePos.current.x, lastMousePos.current.y)
    } else {
      tip.style.display = 'none'
    }
  }, [hoveredBar, positionTip])

  return (
    <div className="relative select-none">
      <div className="flex">
        {/* Y-axis */}
        <div
          className="flex flex-col justify-between shrink-0 pr-1"
          style={{ width: Y_AXIS_W, height: CHART_H }}
        >
          {ticks.map(t => (
            <div key={t} className="text-[9px] tabular-nums text-right leading-none" style={{ color: 'var(--theme-text-muted)' }}>
              {t}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {ticks.map((_, i) => (
              <div
                key={i}
                style={{ borderTop: '1px solid var(--theme-border-light)' }}
              />
            ))}
          </div>

          {/* Bars */}
          <div className="relative flex items-end gap-[2px]" style={{ height: CHART_H }}>
            {bars.map(b => {
              const matchedH = Math.round((b.matched / niceMax) * CHART_H)
              const pendingH = Math.round((b.pending / niceMax) * CHART_H)
              const total = b.matched + b.pending
              const isHovered = hoveredDay === b.day
              return (
                <div
                  key={b.day}
                  className="flex flex-1 flex-col items-stretch gap-[1px] cursor-pointer"
                  style={{ height: CHART_H, justifyContent: 'flex-end' }}
                  onMouseEnter={(e) => { setHoveredDay(b.day); moveTooltip(e) }}
                  onMouseMove={(e) => { moveTooltip(e) }}
                  onMouseLeave={onLeave}
                >
                  {b.pending > 0 && (
                    <div
                      className="rounded-t-[2px] transition-opacity"
                      style={{ height: Math.max(3, pendingH), background: 'var(--theme-status-warning)', opacity: isHovered ? 1 : 0.85 }}
                    />
                  )}
                  {b.matched > 0 && (
                    <div
                      className="transition-opacity"
                      style={{
                        height: Math.max(3, matchedH),
                        background: 'var(--theme-status-success)',
                        borderRadius: b.pending === 0 ? '2px 2px 0 0' : '0',
                        opacity: isHovered ? 1 : 0.85,
                      }}
                    />
                  )}
                  {total === 0 && (
                    <div style={{ height: 3, background: 'var(--theme-border-light)', borderRadius: '2px 2px 0 0' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels: DD/MM */}
      <div className="flex gap-[2px]" style={{ marginLeft: Y_AXIS_W, height: X_AXIS_H }}>
        {bars.map((b, i) => (
          <div
            key={b.day}
            className="flex-1 text-center tabular-nums"
            style={{ fontSize: 9, color: 'var(--theme-text-muted)', lineHeight: `${X_AXIS_H}px` }}
          >
            {(i % labelInterval === 0 || i === bars.length - 1) ? formatDate(b.date, b.day) : ''}
          </div>
        ))}
      </div>

      {/* Tooltip — portaled to body, positioned via ref for zero-lag tracking */}
      {createPortal(
        <div
          ref={tipRef}
          className="fixed pointer-events-none z-50"
          style={{ display: 'none' }}
        >
          {hoveredBar && (
            <div
              className="px-2.5 py-1.5 rounded-lg text-[11px] tabular-nums whitespace-nowrap"
              style={{
                background: 'var(--theme-bg-primary)',
                border: '1px solid var(--theme-border-default)',
                color: 'var(--theme-text-primary)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <div className="font-semibold mb-0.5">{formatDate(hoveredBar.date, hoveredBar.day)}</div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-sm" style={{ background: 'var(--theme-status-success)' }} />
                Ghép: {hoveredBar.matched}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-sm" style={{ background: 'var(--theme-status-warning)' }} />
                Chờ: {hoveredBar.pending}
              </div>
              <div className="mt-0.5 pt-0.5 font-semibold" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
                Tổng: {hoveredBar.matched + hoveredBar.pending}
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}
