import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'gold' | 'info'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  subtitle?: string
  variant?: Variant
  className?: string
  trend?: 'up' | 'down' | 'flat'
}

const variantStyles: Record<Variant, { border: string; iconBg: string; accent: string }> = {
  default: { border: 'border-l-navy-800', iconBg: 'bg-navy-100 text-navy-700', accent: '' },
  success: { border: 'border-l-emerald-500', iconBg: 'bg-emerald-100 text-emerald-600', accent: 'text-emerald-600' },
  warning: { border: 'border-l-amber-500', iconBg: 'bg-amber-100 text-amber-600', accent: 'text-amber-600' },
  danger: { border: 'border-l-red-500', iconBg: 'bg-red-100 text-red-600', accent: 'text-red-600' },
  gold: { border: 'border-l-gold-400', iconBg: 'bg-gold-50 text-gold-600', accent: 'text-gold-600' },
  info: { border: 'border-l-sky-500', iconBg: 'bg-sky-100 text-sky-600', accent: 'text-sky-600' },
}

export function StatCard({ icon, label, value, subtitle, variant = 'default', className, trend }: StatCardProps) {
  const s = variantStyles[variant]
  return (
    <div className={cn(
      'bg-white rounded-xl border border-l-4 p-4 lg:p-5 shadow-sm animate-fade-slide-up',
      s.border,
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">{label}</p>
          <p className={cn('text-xl lg:text-2xl font-bold font-display tracking-tight', s.accent || 'text-navy-900')}>
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-gray-400 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg shrink-0', s.iconBg)}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium">
          {trend === 'up' && <span className="text-emerald-600">↑ Tăng</span>}
          {trend === 'down' && <span className="text-red-500">↓ Giảm</span>}
          {trend === 'flat' && <span className="text-gray-400">→ Ổn định</span>}
        </div>
      )}
    </div>
  )
}
