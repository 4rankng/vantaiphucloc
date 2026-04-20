import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  subtitle?: string
  variant?: 'default' | 'warning' | 'danger' | 'success'
  className?: string
}

export function StatCard({ icon, label, value, subtitle, variant = 'default', className }: StatCardProps) {
  const variantStyles = {
    default: 'border-l-[#0a2540]',
    warning: 'border-l-[#e8973b] bg-orange-50/30',
    danger: 'border-l-[#e53e3e] bg-red-50/30',
    success: 'border-l-[#d4a839] bg-amber-50/30',
  }

  return (
    <div className={cn(
      'bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(10,37,64,0.12)] border border-l-4 p-5',
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[hsl(220,10%,45%)] font-medium">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#0a1f33] font-['Manrope',sans-serif] tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-[hsl(220,10%,45%)]">{subtitle}</p>}
        </div>
        <div className="text-[#0a2540]/60 p-2">{icon}</div>
      </div>
    </div>
  )
}
