/**
 * CargoConstellationsCanvas
 * ─────────────────────────
 * Animated generative-art background: container routes rendered as
 * bezier-arc particle streams between network nodes (ports & depots).
 *
 * Pure vanilla Canvas 2D — no external dependencies.
 * White particles on a transparent canvas so it overlays any background.
 *
 * Props
 *   seed          – deterministic RNG seed (same seed = same layout)
 *   nodeCount     – number of network nodes (ports + depots)
 *   particleCount – simultaneous container particles in motion
 */

import { useEffect, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NodeData {
  x: number
  y: number
  isPort: boolean
  r: number        // base radius
  phase: number    // pulse phase offset
  spd: number      // pulse speed
}

interface PartData {
  sx: number; sy: number     // source
  dx: number; dy: number     // destination
  cx1: number; cy1: number   // bezier cp1
  cx2: number; cy2: number   // bezier cp2
  t: number                  // progress 0–1
  spd: number                // progress-per-frame speed
  alpha: number              // base opacity
  sz: number                 // particle radius
  bright: boolean            // priority container flag
  px: number; py: number     // previous position (for trail line)
  curX: number; curY: number // current position
  hasPrev: boolean           // whether prev is valid
}

// ─── Seeded PRNG (Mulberry32) ────────────────────────────────────────────────

function makePRNG(seed: number) {
  let s = seed >>> 0
  return function rng(): number {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Cubic Bézier at t ───────────────────────────────────────────────────────

function cubicBez(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3
}

// ─── Build a fresh particle travelling between two nodes ─────────────────────

function spawnParticle(nodes: NodeData[], rand: () => number, W: number, startT = 0): PartData {
  const n = nodes.length
  const si = Math.floor(rand() * n)
  let di = Math.floor(rand() * n)
  for (let i = 0; i < 20 && di === si; i++) di = Math.floor(rand() * n)

  const src = nodes[si]
  const dst = nodes[di]
  const ddx = dst.x - src.x
  const ddy = dst.y - src.y
  const len = Math.hypot(ddx, ddy)

  // Arc curvature: proportional to distance, random sign
  const curv = (rand() - 0.5) * 0.84
  const amp  = Math.min(len / Math.max(W, 1), 0.5)
  const distF = 1.55 - 0.9 * Math.min(len / Math.max(W, 1), 1)

  return {
    sx: src.x, sy: src.y,
    dx: dst.x, dy: dst.y,
    cx1: src.x + ddx * 0.3 + ddy * curv * amp * 2.2,
    cy1: src.y + ddy * 0.3 - ddx * curv * amp * 2.2,
    cx2: src.x + ddx * 0.7 + ddy * curv * amp * 2.2,
    cy2: src.y + ddy * 0.7 - ddx * curv * amp * 2.2,
    t: startT,
    spd: (rand() * 0.0045 + 0.003) * distF,
    alpha: 0.45 + rand() * 0.55,
    sz: 1.2 + rand() * 2.0,
    bright: rand() < 0.07,   // 7% are priority / express containers
    px: src.x, py: src.y,
    curX: src.x, curY: src.y,
    hasPrev: false,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface CargoConstellationsCanvasProps {
  seed?: number
  nodeCount?: number
  particleCount?: number
  className?: string
  style?: React.CSSProperties
}

export function CargoConstellationsCanvas({
  seed = 888,
  nodeCount = 11,
  particleCount = 75,
  className,
  style,
}: CargoConstellationsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const ctx = el.getContext('2d')
    if (!ctx) return

    // Respect reduced-motion preference (render one static frame, no RAF loop)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let alive = true
    let rafId = 0

    // ── Canvas sizing ────────────────────────────────────────────────────────
    let W = 0
    let H = 0
    let dpr = 1

    const applySize = () => {
      dpr = Math.min(window.devicePixelRatio ?? 1, 2)
      W   = el.offsetWidth
      H   = el.offsetHeight
      el.width  = W * dpr
      el.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // ── Initial setup ────────────────────────────────────────────────────────
    applySize()

    const rng = makePRNG(seed)

    // Build nodes with Poisson-disc-like min-distance constraint
    const nodes: NodeData[] = []
    const margin  = Math.min(W, H) * 0.09
    const minDist = Math.min(W, H) * 0.16

    let tries = 0
    while (nodes.length < nodeCount && tries++ < nodeCount * 120) {
      const x = margin + rng() * (W - margin * 2)
      const y = margin + rng() * (H - margin * 2)
      const ok = nodes.every(n => Math.hypot(x - n.x, y - n.y) >= minDist)
      if (ok) {
        // Nodes near the canvas edge become "ports" (larger, with rings)
        const edgeFrac = Math.min(x, W - x, y, H - y) / (Math.min(W, H) * 0.45)
        const isPort   = edgeFrac < 0.28 || rng() < 0.18
        nodes.push({
          x, y, isPort,
          r:     isPort ? 5 + rng() * 4 : 2.5 + rng() * 2,
          phase: rng() * Math.PI * 2,
          spd:   0.011 + rng() * 0.011,
        })
      }
    }

    // Build initial particles (staggered t so they don't all depart together)
    const parts: PartData[] = Array.from({ length: particleCount }, () =>
      spawnParticle(nodes, rng, W, rng())
    )

    // ── Draw loop ────────────────────────────────────────────────────────────
    let frame = 0

    const tick = () => {
      if (!alive) return
      frame++

      ctx.clearRect(0, 0, W, H)

      // — Connection lines (faint arcs between nearby nodes) —
      const maxConnDist = W * 0.55
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ni = nodes[i]
          const nj = nodes[j]
          const d  = Math.hypot(ni.x - nj.x, ni.y - nj.y)
          if (d > maxConnDist) continue

          const ff = 1 - d / maxConnDist
          ctx.beginPath()
          ctx.moveTo(ni.x, ni.y)
          const mx = (ni.x + nj.x) / 2
          const my = (ni.y + nj.y) / 2
          ctx.quadraticCurveTo(
            mx - (nj.y - ni.y) * 0.07,
            my + (nj.x - ni.x) * 0.07,
            nj.x, nj.y,
          )
          ctx.strokeStyle = `rgba(255,255,255,${(0.07 * ff * ff).toFixed(3)})`
          ctx.lineWidth   = 0.5
          ctx.stroke()
        }
      }

      // — Particles —
      for (const p of parts) {
        // Advance
        p.px   = p.curX
        p.py   = p.curY
        p.t   += p.spd

        // Route complete → respawn on a new random route
        if (p.t >= 1) {
          Object.assign(p, spawnParticle(nodes, Math.random, W))
          p.hasPrev = false
          continue
        }

        p.curX = cubicBez(p.sx, p.cx1, p.cx2, p.dx, p.t)
        p.curY = cubicBez(p.sy, p.cy1, p.cy2, p.dy, p.t)

        if (!p.hasPrev) { p.hasPrev = true; continue }

        // Sine-curve vitality: bright at mid-journey, fades at start/end
        const vit = Math.sin(p.t * Math.PI)

        if (p.bright) {
          // Express / priority container — brighter white, larger glow
          ctx.beginPath()
          ctx.moveTo(p.px, p.py)
          ctx.lineTo(p.curX, p.curY)
          ctx.strokeStyle = `rgba(255,255,255,${(0.7 * vit).toFixed(3)})`
          ctx.lineWidth   = p.sz * 0.7
          ctx.stroke()

          // Radial glow halo
          const g = ctx.createRadialGradient(p.curX, p.curY, 0, p.curX, p.curY, p.sz * 5)
          g.addColorStop(0, `rgba(255,255,255,${(0.22 * vit).toFixed(3)})`)
          g.addColorStop(1,  'rgba(255,255,255,0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(p.curX, p.curY, p.sz * 5, 0, Math.PI * 2)
          ctx.fill()

          // Core dot
          ctx.fillStyle = `rgba(255,255,255,${(p.alpha * vit).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(p.curX, p.curY, p.sz * 1.5, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Standard container — subtle white trail
          ctx.beginPath()
          ctx.moveTo(p.px, p.py)
          ctx.lineTo(p.curX, p.curY)
          ctx.strokeStyle = `rgba(255,255,255,${(p.alpha * vit * 0.42).toFixed(3)})`
          ctx.lineWidth   = p.sz * 0.42
          ctx.stroke()

          // Soft outer glow
          ctx.fillStyle = `rgba(255,255,255,${(0.07 * vit).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(p.curX, p.curY, p.sz * 3, 0, Math.PI * 2)
          ctx.fill()

          // Core dot
          ctx.fillStyle = `rgba(255,255,255,${(p.alpha * (0.5 + 0.5 * vit)).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(p.curX, p.curY, p.sz * 0.75, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // — Network nodes —
      for (const n of nodes) {
        const beat = 0.5 + 0.5 * Math.sin(frame * n.spd + n.phase)

        // Wide outer halo
        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 6)
        halo.addColorStop(0, `rgba(255,255,255,${(0.14 * beat).toFixed(3)})`)
        halo.addColorStop(1,  'rgba(255,255,255,0)')
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 7, 0, Math.PI * 2)
        ctx.fill()

        // Inner glow
        ctx.fillStyle = `rgba(255,255,255,${(0.3 + 0.22 * beat).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 2.2, 0, Math.PI * 2)
        ctx.fill()

        // Solid core
        ctx.fillStyle = `rgba(255,255,255,${(0.82 + 0.18 * beat).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()

        // Port nodes get a double-ring accent
        if (n.isPort) {
          ctx.strokeStyle = `rgba(255,255,255,${(0.22 * beat).toFixed(3)})`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r * 3.5, 0, Math.PI * 2)
          ctx.stroke()

          ctx.strokeStyle = `rgba(255,255,255,${(0.1 * beat).toFixed(3)})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r * 5.5, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      if (!reduced) {
        rafId = requestAnimationFrame(tick)
      }
    }

    rafId = requestAnimationFrame(tick)

    // ── Responsive resize — scale node & particle coords proportionally ──────
    const ro = new ResizeObserver(() => {
      if (!alive) return
      const prevW = W
      const prevH = H
      applySize()
      if (prevW === 0 || prevH === 0) return

      const sx = W / prevW
      const sy = H / prevH

      for (const n of nodes) {
        n.x *= sx
        n.y *= sy
      }
      for (const p of parts) {
        p.sx   *= sx;  p.sy   *= sy
        p.dx   *= sx;  p.dy   *= sy
        p.cx1  *= sx;  p.cy1  *= sy
        p.cx2  *= sx;  p.cy2  *= sy
        p.px   *= sx;  p.py   *= sy
        p.curX *= sx;  p.curY *= sy
      }
    })

    ro.observe(el)

    return () => {
      alive = false
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [seed, nodeCount, particleCount])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
      aria-hidden="true"
    />
  )
}
