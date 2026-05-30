/* ── Shared RobotHead illustration ─────────────────────── */
export function RobotHead({
  talking = false,
  typing = false,
  thinking = false,
  success = false,
  error: hasError = false,
}: {
  talking?: boolean
  typing?: boolean
  thinking?: boolean
  success?: boolean
  error?: boolean
}) {
  const eyeFill    = hasError ? 'var(--theme-status-error)' : success ? 'var(--theme-status-success)' : 'var(--theme-ai-accent-light)'
  const headStroke = hasError ? 'rgba(248,113,113,0.5)' : 'var(--theme-ai-accent-light)'
  const antennaBg  = hasError ? 'var(--theme-status-error)' : thinking ? 'var(--theme-status-error)' : 'var(--theme-ai-accent-light)'
  const antennaClass = thinking
    ? 'robot-antenna robot-antenna-think'
    : talking
      ? 'robot-antenna robot-antenna-blink'
      : 'robot-antenna'

  return (
    <svg width="80" height="98" viewBox="0 -12 80 98" fill="none" aria-hidden="true">
      {/* Antenna stem */}
      <line x1="40" y1="4" x2="40" y2="16"
        stroke={thinking ? 'rgba(239,68,68,0.5)' : 'var(--theme-ai-accent-light)'}
        strokeWidth="2.5" strokeLinecap="round"/>
      {/* Antenna radiant glow (thinking only) */}
      {thinking && <circle cx="40" cy="4" r="11" fill="var(--theme-status-error)" className="robot-antenna-radiant"/>}
      {/* Antenna bulb */}
      <circle cx="40" cy="4" r="4.5" fill={antennaBg} className={antennaClass}/>

      {/* Head */}
      <rect x="8" y="15" width="64" height="55" rx="14"
        fill="rgba(45,27,105,0.85)" stroke={headStroke} strokeWidth="1.5"/>

      {/* Face screen */}
      <rect x="15" y="21" width="50" height="42" rx="9" fill="rgba(15,10,50,0.7)"/>

      {/* Left eye */}
      <rect x="20" y="29" width="16" height="11" rx="4" fill={eyeFill}
        className={talking || success ? 'robot-eye-glow robot-eye' : 'robot-eye'} fillOpacity="0.9"/>
      <rect x="22" y="31" width="5" height="3.5" rx="1.5" fill="rgba(255,255,255,0.45)"/>

      {/* Right eye */}
      <rect x="44" y="29" width="16" height="11" rx="4" fill={eyeFill}
        className={talking || success ? 'robot-eye-glow robot-eye-r' : 'robot-eye-r'} fillOpacity="0.9"/>
      <rect x="46" y="31" width="5" height="3.5" rx="1.5" fill="rgba(255,255,255,0.45)"/>

      {/* Mouth: flat line at rest, open/close loop while typewriting */}
      <rect
        x="24" y="48" width="32" height="8" rx="4"
        fill={hasError ? 'var(--theme-status-error)' : 'var(--theme-ai-accent-light)'}
        fillOpacity="0.9"
        className={`robot-mouth${typing ? ' robot-mouth-talk' : ''}`}
      />

      {/* Ear bolts */}
      <circle cx="8"  cy="42" r="5.5" fill="rgba(99,102,241,0.35)" stroke="var(--theme-ai-accent-light)" strokeWidth="1.2"/>
      <circle cx="8"  cy="42" r="2.2" fill="var(--theme-ai-accent-light)"/>
      <circle cx="72" cy="42" r="5.5" fill="rgba(99,102,241,0.35)" stroke="var(--theme-ai-accent-light)" strokeWidth="1.2"/>
      <circle cx="72" cy="42" r="2.2" fill="var(--theme-ai-accent-light)"/>
    </svg>
  )
}
