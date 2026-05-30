import { RobotHead } from './RobotHead'
import { useTypewriter } from './useTypewriter'

interface RobotDialogHeroProps {
  /** Main bold title */
  title: string
  /** Subtitle — if provided, plays as typewriter while mouth opens/closes */
  subtitle?: string
  /** Typewriter speed in ms per character (default 18) */
  typewriterSpeed?: number
  /** Robot state */
  thinking?: boolean   // waiting for backend — red blinking antenna
  success?: boolean    // match found — green eyes
  error?: boolean      // error state — red eyes/mouth
  /**
   * External typing signal — when the caller drives the typewriter (e.g. body text)
   * and needs the robot mouth to sync with it.
   */
  _externalTyping?: boolean
  /** Extra content rendered below subtitle (e.g. ScanMessages, stat card) */
  children?: React.ReactNode
}

/* ── Sparkle particle ─────────────────────────────────────── */
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <span className="absolute pointer-events-none ai-twinkle" style={style} aria-hidden="true">
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
        <path d="M5 0 L5.55 3.85 L10 5 L5.55 6.15 L5 10 L4.45 6.15 L0 5 L4.45 3.85 Z"
          fill="white" fillOpacity="0.85" />
      </svg>
    </span>
  )
}

export function RobotDialogHero({
  title,
  subtitle,
  typewriterSpeed = 18,
  thinking = false,
  success = false,
  error = false,
  _externalTyping = false,
  children,
}: RobotDialogHeroProps) {
  const { displayed, done } = useTypewriter(subtitle ?? '', typewriterSpeed)
  const isTyping = _externalTyping || (!!displayed && !done)
  const talking = thinking || isTyping

  return (
    <div
      className="relative overflow-hidden flex flex-col items-center text-center px-6 pt-7 pb-6"
      style={{ background: 'linear-gradient(145deg, var(--theme-ai-accent-dark) 0%, var(--theme-ai-accent-dark) 40%, var(--theme-ai-accent-dark) 75%, var(--theme-ai-accent) 100%)' }}
    >
      {/* Scan line */}
      <div className="ai-scan-line absolute left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, var(--theme-ai-accent-light), transparent)', zIndex: 1 }} />

      {/* Grid dots */}
      <div className="absolute inset-0 pointer-events-none opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Sparkles */}
      <Particle style={{ top: '12%', left: '9%',   animationDelay: '0s'   }} />
      <Particle style={{ top: '18%', right: '11%', animationDelay: '0.7s', transform: 'scale(0.65)' }} />
      <Particle style={{ bottom: '18%', left: '14%', animationDelay: '1.4s', transform: 'scale(0.55)' }} />
      <Particle style={{ bottom: '12%', right: '16%', animationDelay: '0.3s' }} />
      <Particle style={{ top: '50%', left: '5%',   animationDelay: '1.1s', transform: 'scale(0.45)' }} />
      <Particle style={{ top: '48%', right: '6%',  animationDelay: '1.8s', transform: 'scale(0.6)' }} />

      {/* Robot */}
      <div style={{ zIndex: 2, marginBottom: 6 }}>
        <RobotHead talking={talking} typing={isTyping} thinking={thinking} success={success} error={error} />
      </div>

      {/* Title */}
      <h2 style={{ color: 'white', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
        {title}
      </h2>

      {/* Typewriter subtitle */}
      {subtitle !== undefined && (
        <p style={{
          color: 'rgba(196,181,253,0.85)', fontSize: 13, marginTop: 4, marginBottom: 0,
          minHeight: 20,
        }}>
          {displayed}
          {!done && displayed && (
            <span className="ai-cursor" style={{ color: 'var(--theme-ai-accent-light)', fontWeight: 700 }}>▋</span>
          )}
        </p>
      )}

      {/* Slot for extra content (scan messages, stat pills, etc.) */}
      {children}
    </div>
  )
}
