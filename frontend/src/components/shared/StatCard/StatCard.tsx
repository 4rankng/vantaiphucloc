import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'teal'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string
  unit?: string
  subtitle?: string
  variant?: Variant
  className?: string
  trend?: { direction: 'up' | 'down' | 'flat'; value?: string }
  sparkline?: number[]
}

const variantStyles: Record<Variant, { iconBg: string; iconText: string }> = {
  default: { iconBg: '#f3f4f6', iconText: '#4b5563' },
  success: { iconBg: '#ecfdf5', iconText: '#059669' },
  warning: { iconBg: '#fffbeb', iconText: '#d97706' },
  danger:  { iconBg: '#fef2f2', iconText: '#ef4444' },
  info:    { iconBg: '#eff6ff', iconText: '#3b82f6' },
  gold:    { iconBg: '#fffbeb', iconText: '#d97706' },
  teal:    { iconBg: '#f0fdfa', iconText: '#0d9488' },
}

export function StatCard({
  icon, label, value, unit, subtitle, variant = 'default',
  className, trend, sparkline,
}: StatCardProps) {
  const s = variantStyles[variant]

  return (
    <div
      className={cn('transition-shadow duration-150 hover:shadow-md cursor-default', className)}
      style={{
        background: '#ffffff',
        border: '1px solid #f0f0f0',
        borderRadius: '12px',
        padding: '14px 16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      {/* Top row: icon + label */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: s.iconBg,
          }}
        >
          <span style={{ color: s.iconText, display: 'flex' }}>
            {icon}
          </span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748b',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            lineHeight: 1.2,
          }}
        >
          {label}
        </span>
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-mono-num"
          style={{
            fontSize: 'clamp(20px, 4vw, 28px)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: '#111827',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: '#94a3b8',
              lineHeight: 1,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Trend + Subtitle */}
      {(trend || subtitle) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {trend && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: trend.direction === 'up' ? '#059669' : trend.direction === 'down' ? '#ef4444' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
              {trend.value && <span>{trend.value}</span>}
            </span>
          )}
          {subtitle && (
            <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.2 }}>
              {subtitle}
            </span>
          )}
        </div>
      )}

      {/* Mini sparkline */}
      {sparkline && sparkline.length > 0 && (
        <div className="flex items-end gap-[2px] mt-2" style={{ height: '16px' }}>
          {sparkline.map((v, i) => {
            const max = Math.max(...sparkline)
            const h = max > 0 ? Math.max(3, (v / max) * 16) : 3
            return (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: `${h}px`,
                  borderRadius: '1px',
                  background: i === sparkline.length - 1 ? s.iconText : '#e5e7eb',
                  transition: 'height 0.3s ease',
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
