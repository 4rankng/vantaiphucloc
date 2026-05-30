export type PillVariant = 'success' | 'warn' | 'danger' | 'info' | 'neutral' | 'accent'

interface PillStyles {
  background: string
  color: string
  dotColor: string
}

export const PILL_STYLES: Record<PillVariant, PillStyles> = {
  success: { background: 'var(--success-soft)', color: 'var(--success)', dotColor: 'var(--success)' },
  warn:    { background: 'var(--warning-soft)', color: 'var(--warning)', dotColor: 'var(--warning)' },
  danger:  { background: 'var(--danger-soft)', color: 'var(--danger)', dotColor: 'var(--danger)' },
  info:    { background: 'var(--info-soft)', color: 'var(--info)', dotColor: 'var(--info)' },
  neutral: { background: 'var(--surface-3)', color: 'var(--ink-2)', dotColor: 'var(--ink-3)' },
  accent:  { background: 'var(--accent-soft)', color: 'var(--accent-ink)', dotColor: 'var(--accent)' },
}
