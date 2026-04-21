import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'teal'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  subtitle?: string
  variant?: Variant
  className?: string
  trend?: 'up' | 'down' | 'flat'
}

const variantStyles: Record<Variant, { iconBg: string; iconText: string; accent: string }> = {
  default:  { iconBg: '#f3f4f6', iconText: '#4b5563', accent: '' },
  success:  { iconBg: '#ecfdf5', iconText: '#10b981', accent: 'color: #10b981' },
  warning:  { iconBg: '#fffbeb', iconText: '#f59e0b', accent: 'color: #f59e0b' },
  danger:   { iconBg: '#fef2f2', iconText: '#ef4444', accent: 'color: #ef4444' },
  info:     { iconBg: '#eff6ff', iconText: '#3b82f6', accent: 'color: #3b82f6' },
  gold:     { iconBg: '#fffbeb', iconText: '#f59e0b', accent: 'color: #f59e0b' },
  teal:     { iconBg: '#f0fdfa', iconText: '#14b8a6', accent: 'color: #14b8a6' },
}

export function StatCard({ icon, label, value, subtitle, variant = 'default', className, trend }: StatCardProps) {
  const s = variantStyles[variant]

  return (
    <div
      className={cn('animate-fade-slide-up', className)}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: s.iconBg,
        }}
      >
        <span style={{ color: s.iconText, display: 'flex' }}>
          {icon}
        </span>
      </div>

      {/* Label */}
      <p
        className="mb-1"
        style={{
          fontSize: '13px',
          lineHeight: '1.4',
          fontWeight: 500,
          color: '#64748b',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </p>

      {/* Value */}
      <p
        className="font-display"
        style={{
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.025em',
          ...(s.accent ? { color: s.iconText } : { color: '#111827' }),
        }}
      >
        {value}
      </p>

      {/* Subtitle / Trend */}
      {(subtitle || trend) && (
        <p
          className="mt-1.5"
          style={{
            fontSize: '12px',
            lineHeight: '1.4',
            color: '#94a3b8',
          }}
        >
          {subtitle}
          {trend === 'up' && <span style={{ color: '#10b981' }}> ↑ Tăng</span>}
          {trend === 'down' && <span style={{ color: '#ef4444' }}> ↓ Giảm</span>}
          {trend === 'flat' && <span> → Ổn định</span>}
        </p>
      )}
    </div>
  )
}
