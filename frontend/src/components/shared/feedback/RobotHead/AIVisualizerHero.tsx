import { useMemo } from 'react'
import { AgentAudioVisualizerAura } from '@/components/agents-ui/agent-audio-visualizer-aura'
import type { AIAgentState } from '@/hooks/agents-ui/use-agent-audio-visualizer-aura'
import { useTypewriter } from './useTypewriter'

interface AIVisualizerHeroProps {
  /** Main bold title */
  title: React.ReactNode
  /** Subtitle — if provided, plays as typewriter */
  subtitle?: string
  /** Typewriter speed in ms per character (default 18) */
  typewriterSpeed?: number
  /** AI state */
  thinking?: boolean
  success?: boolean
  error?: boolean
  /**
   * External typing signal — when the caller drives the typewriter
   * and needs the visualizer to sync with it.
   */
  _externalTyping?: boolean
  /** Extra content rendered below subtitle */
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

/** Map AIVisualizerHero boolean props to AgentAudioVisualizerAura state */
function getAuraState(
  thinking: boolean,
  success: boolean,
  error: boolean,
  isTyping: boolean,
): AIAgentState {
  if (error) return 'connecting'
  if (thinking) return 'thinking'
  if (success) return 'speaking'
  if (isTyping) return 'speaking'
  return 'listening'
}

/** Map state to aura color override */
function getAuraColor(success: boolean, error: boolean): `#${string}` | undefined {
  if (success) return '#00B14F'  // green for success
  if (error) return '#EF4444'    // red for error
  return undefined               // use default cyan
}

export function AIVisualizerHero({
  title,
  subtitle,
  typewriterSpeed = 18,
  thinking = false,
  success = false,
  error = false,
  _externalTyping = false,
  children,
}: AIVisualizerHeroProps) {
  const { displayed, done } = useTypewriter(subtitle ?? '', typewriterSpeed)
  const isTyping = _externalTyping || (!!displayed && !done)

  const auraState = useMemo(
    () => getAuraState(thinking, success, error, isTyping),
    [thinking, success, error, isTyping],
  )

  const auraColor = useMemo(
    () => getAuraColor(success, error),
    [success, error],
  )

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

      {/* Aura Visualizer */}
      <div style={{ zIndex: 2, marginBottom: 6, width: 160, height: 160 }}>
        <AgentAudioVisualizerAura
          size="lg"
          state={auraState}
          color={auraColor ?? '#1FD5F9'}
          colorShift={0.15}
          themeMode="dark"
          className="w-full h-full"
        />
      </div>

      {/* Title */}
      {typeof title === 'string' ? (
        <h2 style={{ color: 'white', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          {title}
        </h2>
      ) : (
        title
      )}

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
