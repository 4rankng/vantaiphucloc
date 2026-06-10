import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ScanLine, Sparkles, Cpu, Zap } from 'lucide-react'
import { animate, stagger, createScope } from 'animejs'

interface AIScanningOverlayProps {
  visible: boolean
  imageSrc?: string | null
  title?: string
  subtitle?: string
  /** Container numbers already detected — shown as animated HUD badges. */
  detectedNumbers?: string[]
}

// HUD color palette
const CYAN = '#00f0ff'
const CYAN_DIM = `${CYAN}40`
const GOLD = '#ffb800'
const BRAND = 'var(--theme-brand-primary)'

export function AIScanningOverlay({
  visible,
  imageSrc,
  title = 'AI đang nhận diện số container…',
  subtitle = 'Vui lòng đợi trong giây lát',
  detectedNumbers = [],
}: AIScanningOverlayProps) {
  const [tick, setTick] = useState(0)
  const [scanProgress, setScanProgress] = useState(0)
  const scopeRef = useRef<HTMLDivElement>(null)
  const scanLineRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const bracketRefs = useRef<(HTMLSpanElement | null)[]>([])
  const progressRef = useRef({ val: 0 })

  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => setTick(t => t + 1), 1500)
    return () => clearInterval(id)
  }, [visible])

  const [aspectRatio, setAspectRatio] = useState(1)
  useEffect(() => {
    if (!visible || !imageSrc) {
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

  useEffect(() => {
    if (!visible || !scopeRef.current) return

    const scope = createScope({ root: scopeRef.current }).add(() => {
      // Vertical scan line
      animate('[data-scan-line]', {
        translateY: ['0%', '100%'],
        duration: 2200,
        loop: true,
        alternate: true,
        ease: 'inOutSine',
        onUpdate: (anim) => {
          setScanProgress(Math.round(anim.progress))
        },
      })

      // Horizontal radar sweep
      animate('[data-radar-h]', {
        translateX: ['-2%', '102%'],
        duration: 3400,
        loop: true,
        ease: 'inOutSine',
      })

      // Corner brackets pulse
      animate('[data-bracket]', {
        opacity: [0.5, 1],
        scale: [0.95, 1.05],
        duration: 1400,
        loop: true,
        alternate: true,
        delay: stagger(100),
        ease: 'inOutSine',
      })

      // Particles
      animate('[data-particle]', {
        translateY: [-20, 20],
        opacity: [0, 0.8, 0],
        scale: [0.5, 1, 0.5],
        duration: 2000,
        loop: true,
        delay: stagger(120, { from: 'center' }),
        ease: 'inOutSine',
      })

      // Holo bars
      animate('[data-holo-bar]', {
        translateX: ['-100%', '200%'],
        duration: 1800,
        loop: true,
        delay: stagger(200),
        ease: 'inOutQuad',
      })

      // Glow ring
      animate('[data-glow-ring]', {
        scale: [1, 1.08],
        opacity: [0.4, 0.8],
        duration: 2000,
        loop: true,
        alternate: true,
        ease: 'inOutSine',
      })

      // Floating icons
      animate('[data-float-icon]', {
        translateY: [-6, 6],
        rotate: [-5, 5],
        duration: 3000,
        loop: true,
        alternate: true,
        ease: 'inOutSine',
      })

      // Hex reticle rotation
      animate('[data-hex]', {
        rotate: 360,
        duration: 20000,
        loop: true,
        ease: 'linear',
      })

      // Data ticker scroll
      animate('[data-ticker]', {
        translateX: [0, '-50%'],
        duration: 12000,
        loop: true,
        ease: 'linear',
      })

      // Data stream entrance lines
      animate('[data-stream-h]', {
        width: ['0%', '42%'],
        opacity: [0, 0.8, 0],
        duration: 800,
        delay: stagger(80),
        ease: 'outQuad',
      })

      animate('[data-stream-v]', {
        height: ['0%', '35%'],
        opacity: [0, 0.8, 0],
        duration: 800,
        delay: stagger(80),
        ease: 'outQuad',
      })

      // Progress
      animate(progressRef.current, {
        val: 100,
        duration: 8000,
        ease: 'linear',
        onUpdate: () => {
          setScanProgress(Math.round(progressRef.current.val))
        },
      })
    })

    return () => scope.revert()
  }, [visible])

  useEffect(() => {
    if (!visible) {
      progressRef.current.val = 0
      setScanProgress(0)
    }
  }, [visible])

  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin((i + 1) * 9.137 + n * 4.71) * 10000
          return x - Math.floor(x)
        }
        return {
          id: i,
          top: r(1) * 100,
          left: r(2) * 100,
          size: 2 + r(5) * 4,
          isIcon: i % 3 === 0,
        }
      }),
    [],
  )

  const holoBars = useMemo(
    () => Array.from({ length: 5 }, (_, i) => ({
      id: i,
      top: 15 + i * 17,
    })),
    [],
  )

  // Ticker data — simulated hex readout
  const tickerData = useMemo(
    () => Array.from({ length: 32 }, (_, i) =>
      ((i * 0x3F + 0xA1) & 0xFF).toString(16).toUpperCase().padStart(2, '0')
    ).join(' '),
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
      ref={scopeRef}
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center px-6"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(5,10,21,0.96) 0%, rgba(2,4,10,0.99) 70%)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      {/* Floating AI icons */}
      <div
        data-float-icon
        className="mb-3 flex items-center gap-2"
        style={{ willChange: 'transform' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `color-mix(in srgb, ${CYAN} 20%, transparent)`,
            border: `1px solid color-mix(in srgb, ${CYAN} 40%, transparent)`,
            boxShadow: `0 0 20px color-mix(in srgb, ${CYAN} 30%, transparent)`,
          }}
        >
          <Cpu className="w-5 h-5" style={{ color: CYAN }} />
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `color-mix(in srgb, ${CYAN} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${CYAN} 35%, transparent)`,
          }}
        >
          <Zap className="w-5 h-5" style={{ color: CYAN }} />
        </div>
      </div>

      {/* Data stream entrance lines */}
      {[0, 1, 2, 3].map(i => (
        <div
          key={`h-${i}`}
          data-stream-h
          className="absolute pointer-events-none"
          style={{
            top: `${18 + i * 18}%`,
            left: 0,
            height: 1,
            background: `linear-gradient(90deg, ${CYAN}, transparent)`,
            willChange: 'width, opacity',
          }}
        />
      ))}
      {[0, 1, 2, 3].map(i => (
        <div
          key={`v-${i}`}
          data-stream-v
          className="absolute pointer-events-none"
          style={{
            left: `${20 + i * 20}%`,
            top: 0,
            width: 1,
            background: `linear-gradient(180deg, ${CYAN}, transparent)`,
            willChange: 'height, opacity',
          }}
        />
      ))}

      {/* Scan frame */}
      <div
        className="relative"
        style={{
          aspectRatio: `${aspectRatio}`,
          width: aspectRatio >= 1 ? 'min(86vw, 420px)' : 'auto',
          height: aspectRatio < 1 ? 'min(62vh, 540px)' : 'auto',
          maxWidth: '86vw',
          maxHeight: '62vh',
        }}
      >
        {/* Outer glow ring */}
        <div
          data-glow-ring
          className="absolute -inset-6 rounded-3xl pointer-events-none"
          style={{
            border: `1px solid ${CYAN_DIM}`,
            boxShadow: `0 0 60px color-mix(in srgb, ${CYAN} 25%, transparent), inset 0 0 60px color-mix(in srgb, ${CYAN} 8%, transparent)`,
            willChange: 'transform, opacity',
          }}
        />

        {/* Middle ring */}
        <div
          className="absolute -inset-3 rounded-2xl pointer-events-none"
          style={{
            border: `1px solid color-mix(in srgb, ${CYAN} 15%, transparent)`,
          }}
        />

        {/* Hexagonal reticle — rotates slowly */}
        <div
          data-hex
          className="absolute pointer-events-none"
          style={{
            inset: '-24px',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: `1.5px solid ${CYAN_DIM}`,
            willChange: 'transform',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              border: '1px solid transparent',
              backgroundImage: `linear-gradient(var(--hex-bg, transparent), transparent), linear-gradient(${CYAN}40, ${CYAN}20)`,
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          />
        </div>

        {/* Main scan frame */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            border: `2px solid ${CYAN}99`,
            boxShadow: `0 0 40px color-mix(in srgb, ${CYAN} 30%, transparent), inset 0 0 0 1px rgba(255,255,255,0.05)`,
            background: 'radial-gradient(ellipse at center, #0d1420 0%, #060a14 100%)',
          }}
        >
          {/* Captured photo */}
          {imageSrc ? (
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Đang nhận diện"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ filter: 'saturate(0.9) contrast(1.08) brightness(1.05)' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ScanLine className="w-14 h-14 opacity-30" style={{ color: CYAN }} />
            </div>
          )}

          {/* Grid overlay — pulses */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                `linear-gradient(${CYAN}20 1px, transparent 1px), linear-gradient(90deg, ${CYAN}20 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              opacity: 0.15,
            }}
          />

          {/* Holo bars */}
          {holoBars.map(bar => (
            <div
              key={bar.id}
              data-holo-bar
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${bar.top}%`,
                height: '1px',
                background: `linear-gradient(90deg, transparent 0%, ${CYAN} 50%, transparent 100%)`,
                opacity: 0.15,
                willChange: 'transform',
              }}
            />
          ))}

          {/* Tint sweep — soft light instead of overlay */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-soft-light"
            style={{
              background:
                `linear-gradient(180deg, transparent 0%, color-mix(in srgb, ${CYAN} 8%, transparent) 50%, transparent 100%)`,
            }}
          />

          {/* Particles */}
          {particles.map(p => (
            <span
              key={p.id}
              data-particle
              className="absolute pointer-events-none"
              style={{
                top: `${p.top}%`,
                left: `${p.left}%`,
                willChange: 'transform, opacity',
              }}
            >
              {p.isIcon ? (
                <Sparkles
                  className="w-3 h-3"
                  style={{
                    color: CYAN,
                    filter: `drop-shadow(0 0 4px color-mix(in srgb, ${CYAN} 80%, transparent))`,
                  }}
                />
              ) : (
                <span
                  className="block rounded-full"
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    background: CYAN,
                    boxShadow: `0 0 6px ${CYAN}`,
                  }}
                />
              )}
            </span>
          ))}

          {/* Vertical scan line */}
          <div
            ref={scanLineRef}
            data-scan-line
            className="absolute left-0 right-0 pointer-events-none"
            style={{ height: '3px', top: 0, willChange: 'transform' }}
          >
            <div
              className="w-full h-full"
              style={{
                background:
                  `linear-gradient(90deg, transparent 5%, ${CYAN} 30%, rgba(255,255,255,0.9) 50%, ${CYAN} 70%, transparent 95%)`,
                boxShadow:
                  `0 0 20px ${CYAN}, 0 0 50px color-mix(in srgb, ${CYAN} 50%, transparent)`,
              }}
            />
            <div
              className="w-full"
              style={{
                height: '100px',
                marginTop: '-1px',
                background:
                  `linear-gradient(180deg, color-mix(in srgb, ${CYAN} 20%, transparent) 0%, transparent 100%)`,
                opacity: 0.7,
              }}
            />
          </div>

          {/* Horizontal radar sweep */}
          <div
            data-radar-h
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ width: '3px', left: 0, willChange: 'transform' }}
          >
            <div
              className="w-full h-full"
              style={{
                background:
                  `linear-gradient(180deg, transparent 5%, ${CYAN} 30%, rgba(255,255,255,0.8) 50%, ${CYAN} 70%, transparent 95%)`,
                boxShadow:
                  `0 0 14px ${CYAN}, 0 0 40px color-mix(in srgb, ${CYAN} 40%, transparent)`,
              }}
            />
            <div
              className="h-full"
              style={{
                width: '80px',
                marginLeft: '-1px',
                background:
                  `linear-gradient(90deg, color-mix(in srgb, ${CYAN} 15%, transparent) 0%, transparent 100%)`,
                opacity: 0.6,
              }}
            />
          </div>

          {/* Corner brackets */}
          {(['tl', 'tr', 'bl', 'br'] as const).map((pos, i) => (
            <span
              key={pos}
              data-bracket
              ref={el => { bracketRefs.current[i] = el }}
              className="absolute pointer-events-none"
              style={{
                width: 30,
                height: 30,
                ...getBracketPosition(pos),
                borderColor: CYAN,
                filter: `drop-shadow(0 0 10px color-mix(in srgb, ${CYAN} 70%, transparent))`,
                willChange: 'transform, opacity',
                ...getBracketBorders(pos),
              }}
            />
          ))}

          {/* Progress badge */}
          <div
            className="absolute top-3 right-3 px-2 py-1 rounded-lg pointer-events-none"
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: `1px solid color-mix(in srgb, ${CYAN} 40%, transparent)`,
            }}
          >
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: CYAN }}
            >
              {scanProgress}%
            </span>
          </div>

          {/* Data ticker strip at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-5 overflow-hidden pointer-events-none"
            style={{ maskImage: 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)' }}
          >
            <div
              data-ticker
              className="whitespace-nowrap"
              style={{ willChange: 'transform' }}
            >
              <span
                className="text-[8px] font-mono tracking-widest"
                style={{ color: `${CYAN}50` }}
              >
                {tickerData}&nbsp;&nbsp;&nbsp;{tickerData}&nbsp;&nbsp;&nbsp;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detected numbers — animated HUD badges */}
      {detectedNumbers.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {detectedNumbers.map((num, i) => (
            <span
              key={`${num}-${i}`}
              className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-lg font-mono text-sm font-bold tracking-wider"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${CYAN} 15%, transparent), color-mix(in srgb, ${GOLD} 10%, transparent))`,
                border: `1.5px solid ${CYAN}60`,
                color: '#fff',
                textShadow: `0 0 8px ${CYAN}`,
                boxShadow: `0 0 12px ${CYAN_DIM}, inset 0 0 8px color-mix(in srgb, ${CYAN} 10%, transparent)`,
                animation: `ai-number-reveal 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.15}s both`,
              }}
            >
              {num}
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: GOLD,
                  boxShadow: `0 0 6px ${GOLD}`,
                }}
              />
            </span>
          ))}
        </div>
      )}

      {/* Caption block */}
      <div className="mt-4 text-center max-w-[320px]">
        <p
          className="text-[15px] font-bold leading-snug"
          style={{ color: '#fff', textShadow: `0 1px 12px ${CYAN}40` }}
        >
          {title}
        </p>
        <p className="text-[12px] mt-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {subtitle}
        </p>

        <div className="mt-3 flex items-center justify-center gap-2 h-5">
          <span
            key={currentStatus}
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{
              color: CYAN,
              textShadow: `0 0 8px color-mix(in srgb, ${CYAN} 50%, transparent)`,
            }}
          >
            {currentStatus}
          </span>
          <span className="inline-flex gap-1 ml-0.5">
            <Dot delay={0} />
            <Dot delay={0.15} />
            <Dot delay={0.3} />
          </span>
        </div>

        <div
          className="mt-3 h-1 rounded-full overflow-hidden"
          style={{
            background: `color-mix(in srgb, ${CYAN} 15%, transparent)`,
            width: 200,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${scanProgress}%`,
              background: `linear-gradient(90deg, ${CYAN}, color-mix(in srgb, ${CYAN} 70%, #fff))`,
              boxShadow: `0 0 8px ${CYAN}`,
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>
      </div>

      {/* Inline keyframes for number reveal */}
      <style>{`
        @keyframes ai-number-reveal {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.85);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
      `}</style>
    </div>,
    document.body,
  )
}

function getBracketPosition(corner: 'tl' | 'tr' | 'bl' | 'br'): React.CSSProperties {
  switch (corner) {
    case 'tl': return { top: 8, left: 8 }
    case 'tr': return { top: 8, right: 8 }
    case 'bl': return { bottom: 8, left: 8 }
    case 'br': return { bottom: 8, right: 8 }
  }
}

function getBracketBorders(corner: 'tl' | 'tr' | 'bl' | 'br'): React.CSSProperties {
  const base: React.CSSProperties = { borderRadius: 0 }
  switch (corner) {
    case 'tl': return { ...base, borderTop: '3px solid', borderLeft: '3px solid', borderTopLeftRadius: 12 }
    case 'tr': return { ...base, borderTop: '3px solid', borderRight: '3px solid', borderTopRightRadius: 12 }
    case 'bl': return { ...base, borderBottom: '3px solid', borderLeft: '3px solid', borderBottomLeftRadius: 12 }
    case 'br': return { ...base, borderBottom: '3px solid', borderRight: '3px solid', borderBottomRightRadius: 12 }
  }
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block rounded-full animate-[ai-dot-bounce_1.2s_ease-in-out_infinite]"
      style={{
        width: 4,
        height: 4,
        background: CYAN,
        animationDelay: `${delay}s`,
        boxShadow: `0 0 4px ${CYAN}`,
      }}
    />
  )
}
