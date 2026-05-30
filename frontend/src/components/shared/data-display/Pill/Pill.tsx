import { PILL_STYLES, type PillVariant } from './variants'

export interface PillProps {
  variant?: PillVariant
  /** Show a leading colored dot. Defaults to true. */
  dot?: boolean
  className?: string
  children: React.ReactNode
}

export function Pill({ variant = 'neutral', dot = true, className = '', children }: PillProps) {
  const s = PILL_STYLES[variant]
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-full px-2 py-[3px] text-[11px] font-semibold uppercase whitespace-nowrap ${className}`}
      style={{ background: s.background, color: s.color, letterSpacing: '0.05em' }}
    >
      {dot && (
        <span
          aria-hidden
          className="inline-block rounded-full"
          style={{ width: 5, height: 5, background: s.dotColor }}
        />
      )}
      {children}
    </span>
  )
}
