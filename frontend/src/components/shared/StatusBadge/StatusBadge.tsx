import { cn } from '@/lib/utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'neutral'

interface StatusBadgeProps {
  variant: BadgeVariant
  label: string
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger:  'bg-red-50 text-red-700',
  info:    'bg-sky-50 text-sky-700',
  gold:    'bg-amber-50 text-amber-700',
  neutral: 'bg-gray-100 text-gray-600',
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
      variants[variant],
      className
    )}>
      {label}
    </span>
  )
}
