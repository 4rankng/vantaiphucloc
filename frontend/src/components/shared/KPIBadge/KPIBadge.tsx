'use client'

import { cn } from '@/lib/utils'

interface KPIBadgeProps {
  value: string
  label?: string
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
}

const VARIANT_STYLES: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  neutral: 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)]',
}

export function KPIBadge({ value, label, variant = 'neutral', size = 'md' }: KPIBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-semibold',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      VARIANT_STYLES[variant],
    )}>
      {value}
      {label && <span className="font-normal opacity-70">{label}</span>}
    </span>
  )
}
