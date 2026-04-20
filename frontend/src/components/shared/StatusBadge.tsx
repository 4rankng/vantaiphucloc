import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'neutral'

interface StatusBadgeProps {
  variant: BadgeVariant
  label: string
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-navy-100 text-navy-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
  gold: 'bg-gold-100 text-gold-600',
  neutral: 'bg-gray-100 text-gray-600',
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide',
      variants[variant],
      className
    )}>
      {label}
    </span>
  )
}
