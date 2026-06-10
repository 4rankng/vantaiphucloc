import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ScanLine, Sparkles, Cpu, Zap } from 'lucide-react'
import { animate, stagger, createScope } from 'animejs'

interface AIScanningOverlayProps {
  visible: boolean
  imageSrc?: string | null
  title?: string
  subtitle?: string
}

export function AIScanningOverlay({
  visible,
  imageSrc,
  title = 'AI đang nhận diện số container…',
  subtitle = 'Vui lòng đợi trong giây lát',
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

      animate('[data-bracket]', {
        opacity: [0.5, 1],
        scale: [0.95, 1.05],
        duration: 1400,
        loop: true,
        alternate: true,
        delay: stagger(100),
        ease: 'inOutSine',
      })

      animate('[data-particle]', {
        translateY: [-20, 20],
        opacity: [0, 0.8, 0],
        scale: [0.5, 1, 0.5],
        duration: 2000,
        loop: true,
        delay: stagger(120, { from: 'center' }),
        ease: 'inOutSine',
      })

      animate('[data-holo-bar]', {
        translateX: ['-100%', '200%'],
        duration: 1800,
        loop: true,
        delay: stagger(200),
        ease: 'inOutQuad',
      })

      animate('[data-glow-ring]', {
        scale: [1, 1.08],
        opacity: [0.4, 0.8],
        duration: 2000,
        loop: true,
        alternate: true,
        ease: 'inOutSine',
      })

      animate('[data-float-icon]', {
        translateY: [-6, 6],
        rotate: [-5, 5],
        duration: 3000,
        loop: true,
        alternate: true,
        ease: 'inOutSine',
      })

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
        background: 'radial-gradient(ellipse at center, rgba(8,12,24,0.95) 0%, rgba(2,4,10,0.99) 70%)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div
        data-float-icon
        className="mb-3 flex items-center gap-2"
        style={{ willChange: 'transform' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--theme-brand-primary) 20%, transparent)',
            border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 40%, transparent)',
            boxShadow: '0 0 20px color-mix(in srgb, var(--theme-brand-primary) 30%, transparent)',
          }}
        >
          <Cpu className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--theme-brand-primary) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 35%, transparent)',
          }}
        >
          <Zap className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
        </div>
      </div>

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
        <div
          data-glow-ring
          className="absolute -inset-6 rounded-3xl pointer-events-none"
          style={{
            border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 25%, transparent)',
            boxShadow: '0 0 60px color-mix(in srgb, var(--theme-brand-primary) 20%, transparent), inset 0 0 60px color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)',
            willChange: 'transform, opacity',
          }}
        />

        <div
          className="absolute -inset-3 rounded-2xl pointer-events-none"
          style={{
            border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 15%, transparent)',
          }}
        />

        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            border: '2px solid color-mix(in srgb, var(--theme-brand-primary) 60%, transparent)',
            boxShadow: '0 0 40px color-mix(in srgb, var(--theme-brand-primary) 30%, transparent), inset 0 0 0 1px rgba(255,255,255,0.05)',
            background: '#080c18',
          }}
        >
          {imageSrc ? (
            <img
              ref={imageRef}
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

          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(color-mix(in srgb, var(--theme-brand-primary) 40%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--theme-brand-primary) 40%, transparent) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {holoBars.map(bar => (
            <div
              key={bar.id}
              data-holo-bar
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${bar.top}%`,
                height: '1px',
                background: 'linear-gradient(90deg, transparent 0%, var(--theme-brand-primary) 50%, transparent 100%)',
                opacity: 0.15,
                willChange: 'transform',
              }}
            />
          ))}

          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--theme-brand-primary) 12%, transparent) 50%, transparent 100%)',
            }}
          />

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
                    color: 'var(--theme-brand-primary)',
                    filter: 'drop-shadow(0 0 4px color-mix(in srgb, var(--theme-brand-primary) 80%, transparent))',
                  }}
                />
              ) : (
                <span
                  className="block rounded-full"
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    background: 'var(--theme-brand-primary)',
                    boxShadow: '0 0 6px var(--theme-brand-primary)',
                  }}
                />
              )}
            </span>
          ))}

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
                  'linear-gradient(90deg, transparent 5%, var(--theme-brand-primary) 30%, rgba(255,255,255,0.9) 50%, var(--theme-brand-primary) 70%, transparent 95%)',
                boxShadow:
                  '0 0 16px var(--theme-brand-primary), 0 0 40px color-mix(in srgb, var(--theme-brand-primary) 50%, transparent)',
              }}
            />
            <div
              className="w-full"
              style={{
                height: '80px',
                marginTop: '-1px',
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--theme-brand-primary) 25%, transparent) 0%, transparent 100%)',
                opacity: 0.7,
              }}
            />
          </div>

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
                borderColor: 'var(--theme-brand-primary)',
                filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--theme-brand-primary) 70%, transparent))',
                willChange: 'transform, opacity',
                ...getBracketBorders(pos),
              }}
            />
          ))}

          <div
            className="absolute top-3 right-3 px-2 py-1 rounded-lg pointer-events-none"
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 40%, transparent)',
            }}
          >
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              {scanProgress}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center max-w-[320px]">
        <p
          className="text-[15px] font-bold leading-snug"
          style={{ color: '#fff', textShadow: '0 1px 12px rgba(0,0,0,0.4)' }}
        >
          {title}
        </p>
        <p className="text-[12px] mt-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {subtitle}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 h-5">
          <span
            key={currentStatus}
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{
              color: 'var(--theme-brand-primary)',
              textShadow: '0 0 8px color-mix(in srgb, var(--theme-brand-primary) 50%, transparent)',
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
          className="mt-4 h-1 rounded-full overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--theme-brand-primary) 15%, transparent)',
            width: 200,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${scanProgress}%`,
              background: 'linear-gradient(90deg, var(--theme-brand-primary), color-mix(in srgb, var(--theme-brand-primary) 70%, #fff))',
              boxShadow: '0 0 8px var(--theme-brand-primary)',
              transition: 'width 0.3s ease-out',
            }}
          />
        </div>
      </div>
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
        background: 'var(--theme-brand-primary)',
        animationDelay: `${delay}s`,
        boxShadow: '0 0 4px var(--theme-brand-primary)',
      }}
    />
  )
}
