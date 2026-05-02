import { cn } from '@/lib/utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'neutral'

interface StatusBadgeProps {
  variant: BadgeVariant
  label: string
  className?: string
  size?: 'sm' | 'md'
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  default: { bg: 'var(--theme-bg-tertiary)', text: 'var(--theme-text-secondary)', dot: 'var(--theme-text-muted)' },
  success: { bg: 'var(--theme-status-success-light)', text: 'var(--theme-status-success-text)', dot: 'var(--theme-status-success)' },
  warning: { bg: 'var(--theme-status-warning-light)', text: 'var(--theme-status-warning-text)', dot: 'var(--theme-status-warning)' },
  danger:  { bg: 'var(--theme-status-error-light)', text: 'var(--theme-status-error-text)', dot: 'var(--theme-status-error)' },
  info:    { bg: 'var(--theme-status-info-light)', text: 'var(--theme-status-info-text)', dot: 'var(--theme-status-info)' },
  gold:    { bg: 'var(--theme-status-warning-light)', text: 'var(--theme-status-warning-text)', dot: 'var(--theme-status-warning)' },
  neutral: { bg: 'var(--theme-bg-tertiary)', text: 'var(--theme-text-muted)', dot: 'var(--theme-text-muted)' },
}

export function StatusBadge({ variant, label, className, size = 'md' }: StatusBadgeProps) {
  const styles = variantStyles[variant]
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        className
      )}
      style={{ background: styles.bg, color: styles.text }}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full" 
        style={{ background: styles.dot }}
      />
      {label}
    </span>
  )
}
