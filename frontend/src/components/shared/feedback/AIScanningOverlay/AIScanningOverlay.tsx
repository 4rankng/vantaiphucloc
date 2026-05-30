import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, ScanLine } from 'lucide-react'

interface AIScanningOverlayProps {
  /** When true, the overlay is shown. */
  visible: boolean
  /** Captured photo (data URL or http URL) to display while scanning. */
  imageSrc?: string | null
  /** Headline text. Defaults to a Vietnamese 'AI đang nhận diện…' string. */
  title?: string
  /** Secondary helper line below the headline. */
  subtitle?: string
}

/**
 * AIScanningOverlay — fullscreen "AI is scanning" effect.
 *
 * Shown while the backend OCR request is in flight. Renders the captured
 * container photo with a moving scan line, animated corner brackets,
 * sparkle particles and a status caption — communicating "AI is looking
 * at your photo right now" to the driver.
 *
 * Mount/unmount is controlled by the `visible` prop; the component
 * portals into <body> so it sits above the page layout, sticky bars,
 * dialogs, etc. (z-index 150, below the 200-tier SuccessOverlay).
 */
export function AIScanningOverlay({
  visible,
  imageSrc,
  title = 'AI đang nhận diện số container…',
  subtitle = 'Vui lòng đợi trong giây lát',
}: AIScanningOverlayProps) {
  // Tick a counter so the rotating status messages cycle while scanning.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => setTick(t => t + 1), 1500)
    return () => clearInterval(id)
  }, [visible])

  // Natural aspect ratio of the captured photo. The scan frame resizes to
  // match this so the full image is visible (no center-crop) and the
  // brackets / scan line wrap the photo tightly. Default 1:1 until we know.
  const [aspectRatio, setAspectRatio] = useState(1)
  useEffect(() => {
    if (!visible || !imageSrc) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAspectRatio(1)
      return
    }
    const img = new window.Image()
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight)
      }
    }
    img.src = imageSrc
  }, [visible, imageSrc])

  // Deterministic pseudo-random sparkle positions — stable, lint-safe (no
  // Math.random in render), and visually indistinguishable from true random
  // at this small count. Seeded by index.
  const sparkles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin((i + 1) * 9.137 + n * 4.71) * 10000
          return x - Math.floor(x) // 0..1
        }
        return {
          id: i,
          top: r(1) * 100,
          left: r(2) * 100,
          delay: r(3) * 2,
          duration: 1.4 + r(4) * 1.4,
          size: 6 + r(5) * 10,
        }
      }),
    [],
  )

  if (!visible) return null

  const statusMessages = [
    'Đang phân tích hình ảnh…',
    'Trích xuất ký tự…',
    'Đối chiếu định dạng ISO 6346…',
    'Sắp xong rồi…',
  ]
  const currentStatus = statusMessages[tick % statusMessages.length]

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center px-6"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(8,12,24,0.92) 0%, rgba(2,4,10,0.98) 70%)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      {/* ── AI badge above the image ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 animate-[ai-fade-in_0.4s_ease-out]">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--theme-brand-primary)',
            boxShadow: '0 0 24px color-mix(in srgb, var(--theme-brand-primary) 60%, transparent)',
          }}
        >
          <Sparkles className="w-4 h-4 animate-[ai-pulse_1.6s_ease-in-out_infinite]" style={{ color: 'var(--theme-text-on-brand, #fff)' }} />
        </div>
        <span
          className="text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{
            color: 'var(--theme-brand-primary)',
            textShadow: '0 0 12px color-mix(in srgb, var(--theme-brand-primary) 50%, transparent)',
          }}
        >
          AI Scanner
        </span>
      </div>

      {/* ── Scan stage: image + scan line + brackets + sparkles ──────────
          Sized to the photo's natural aspect ratio so the *whole* image is
          visible — no center-crop. We constrain both width and height so
          tall portrait shots don't overflow the viewport, and the browser
          picks whichever bound is hit first. */}
      <div
        className="relative animate-[ai-scale-in_0.35s_cubic-bezier(0.16,1,0.3,1)]"
        style={{
          aspectRatio: `${aspectRatio}`,
          width: aspectRatio >= 1 ? 'min(86vw, 420px)' : 'auto',
          height: aspectRatio < 1 ? 'min(62vh, 540px)' : 'auto',
          maxWidth: '86vw',
          maxHeight: '62vh',
        }}
      >
        {/* Outer glow halo */}
        <div
          className="absolute -inset-4 rounded-2xl pointer-events-none animate-[ai-halo_2.4s_ease-in-out_infinite]"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--theme-brand-primary) 35%, transparent) 0%, transparent 70%)',
          }}
        />

        {/* The captured image (or a placeholder if absent) */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            border: '1.5px solid color-mix(in srgb, var(--theme-brand-primary) 70%, transparent)',
            boxShadow: '0 0 40px color-mix(in srgb, var(--theme-brand-primary) 35%, transparent), inset 0 0 0 1px rgba(255,255,255,0.05)',
            background: '#0a0f1e',
          }}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Đang nhận diện"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ filter: 'saturate(0.85) contrast(1.05) brightness(0.92)' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ScanLine className="w-14 h-14 opacity-30" style={{ color: 'var(--theme-brand-primary)' }} />
            </div>
          )}

          {/* Faint scan grid overlay (CSS lines) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25 mix-blend-screen"
            style={{
              backgroundImage:
                'linear-gradient(color-mix(in srgb, var(--theme-brand-primary) 40%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--theme-brand-primary) 40%, transparent) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Color tint sweep over the image */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--theme-brand-primary) 18%, transparent) 50%, transparent 100%)',
            }}
          />

          {/* Sparkle particles */}
          {sparkles.map(s => (
            <span
              key={s.id}
              className="absolute pointer-events-none animate-[ai-twinkle_var(--dur)_ease-in-out_infinite]"
              style={{
                top: `${s.top}%`,
                left: `${s.left}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                ['--dur' as string]: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
              }}
            >
              <Sparkles
                className="w-full h-full"
                style={{
                  color: 'var(--theme-brand-primary)',
                  filter: 'drop-shadow(0 0 4px color-mix(in srgb, var(--theme-brand-primary) 80%, transparent))',
                }}
              />
            </span>
          ))}

          {/* Moving scan line (vertical bounce) */}
          <div
            className="absolute left-0 right-0 pointer-events-none animate-[ai-scan-line_2.2s_ease-in-out_infinite]"
            style={{ height: '3px', top: 0 }}
          >
            <div
              className="w-full h-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, var(--theme-brand-primary) 50%, transparent 100%)',
                boxShadow:
                  '0 0 12px var(--theme-brand-primary), 0 0 28px color-mix(in srgb, var(--theme-brand-primary) 70%, transparent)',
              }}
            />
            {/* Soft trailing glow under the line */}
            <div
              className="w-full"
              style={{
                height: '60px',
                marginTop: '-1px',
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--theme-brand-primary) 30%, transparent) 0%, transparent 100%)',
                opacity: 0.6,
              }}
            />
          </div>

          {/* Corner brackets — 4 corners, animated subtle pulse */}
          {(['tl', 'tr', 'bl', 'br'] as const).map(pos => (
            <Bracket key={pos} corner={pos} />
          ))}
        </div>
      </div>

      {/* ── Caption block ───────────────────────────────────────────────── */}
      <div className="mt-7 text-center max-w-[320px] animate-[ai-fade-in_0.5s_0.1s_ease-out_both]">
        <p
          className="text-[15px] font-bold leading-snug"
          style={{ color: 'var(--theme-text-on-brand)', textShadow: '0 1px 12px rgba(0,0,0,0.4)' }}
        >
          {title}
        </p>
        <p className="text-[12px] mt-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {subtitle}
        </p>

        {/* Rotating status line + animated dots */}
        <div className="mt-4 flex items-center justify-center gap-2 h-5">
          <span
            key={currentStatus /* re-key forces fade-in on change */}
            className="text-[11px] font-semibold uppercase tracking-wider animate-[ai-status-in_0.3s_ease-out]"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            {currentStatus}
          </span>
          <span className="inline-flex gap-1 ml-0.5">
            <Dot delay={0} />
            <Dot delay={0.15} />
            <Dot delay={0.3} />
          </span>
        </div>
      </div>

      {/* ── Keyframes (scoped) ──────────────────────────────────────────── */}
      <style>{`
        @keyframes ai-scan-line {
          0%   { top: 0%;   opacity: 0.2; }
          10%  { opacity: 1; }
          50%  { top: calc(100% - 3px); opacity: 1; }
          60%  { opacity: 1; }
          100% { top: 0%;   opacity: 0.2; }
        }
        @keyframes ai-halo {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.04); }
        }
        @keyframes ai-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.15); opacity: 0.85; }
        }
        @keyframes ai-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.6) rotate(0deg); }
          50%      { opacity: 1; transform: scale(1) rotate(20deg); }
        }
        @keyframes ai-bracket-pulse {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        @keyframes ai-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ai-scale-in {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes ai-status-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ai-dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%           { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Local helpers                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

/** One animated corner bracket (L-shape) of the scan frame. */
function Bracket({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const positions: Record<typeof corner, React.CSSProperties> = {
    tl: { top: 8, left: 8, borderTop: '3px solid', borderLeft: '3px solid', borderTopLeftRadius: 12 },
    tr: { top: 8, right: 8, borderTop: '3px solid', borderRight: '3px solid', borderTopRightRadius: 12 },
    bl: { bottom: 8, left: 8, borderBottom: '3px solid', borderLeft: '3px solid', borderBottomLeftRadius: 12 },
    br: { bottom: 8, right: 8, borderBottom: '3px solid', borderRight: '3px solid', borderBottomRightRadius: 12 },
  }
  return (
    <span
      className="absolute pointer-events-none animate-[ai-bracket-pulse_1.8s_ease-in-out_infinite]"
      style={{
        width: 26,
        height: 26,
        borderColor: 'var(--theme-brand-primary)',
        filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--theme-brand-primary) 70%, transparent))',
        ...positions[corner],
      }}
    />
  )
}

/** One bouncing dot in the status row. */
function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block rounded-full animate-[ai-dot-bounce_1.2s_ease-in-out_infinite]"
      style={{
        width: 4,
        height: 4,
        background: 'var(--theme-brand-primary)',
        animationDelay: `${delay}s`,
      }}
    />
  )
}
