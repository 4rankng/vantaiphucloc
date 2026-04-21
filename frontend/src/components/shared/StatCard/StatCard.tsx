import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal' | 'gold'

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

// ONE color system — muted, sophisticated, consistent
const variantMap: Record<Variant, { iconBg: string; iconColor: string; trendColor: string }> = {
  default:  { iconBg: '#f1f5f9', iconColor: '#64748b', trendColor: '#64748b' },
  success:  { iconBg: '#ecfdf5', iconColor: '#059669', trendColor: '#059669' },
  warning:  { iconBg: '#fffbeb', iconColor: '#d97706', trendColor: '#d97706' },
  danger:   { iconBg: '#fef2f2', iconColor: '#dc2626', trendColor: '#dc2626' },
  info:     { iconBg: '#eff6ff', iconColor: '#2563eb', trendColor: '#2563eb' },
  teal:     { iconBg: '#f0fdfa', iconColor: '#0d9488', trendColor: '#0d9488' },
  gold:     { iconBg: '#fffbeb', iconColor: '#d97706', trendColor: '#d97706' },
}

export function StatCard({
  icon, label, value, unit, subtitle, variant = 'default',
  className, trend, sparkline,
}: StatCardProps) {
  const v = variantMap[variant]

  return (
    <div
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-[0.98]',
        className,
      )}
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        // Single consistent shadow system — no neumorphism, no material
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        border: '1px solid #f1f5f9',
      }}
    >
      {/* Row 1: Label (small, muted, uppercase) — establishes hierarchy */}
      <div className="flex items-center justify-between mb-3">
        <p
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#94a3b8',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1,
            margin: 0,
          }}
        >
          {label}
        </p>
        {/* Icon — small, subtle, background-tinted only */}
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: v.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: v.iconColor, display: 'flex', lineHeight: 0 }}>
            {icon}
          </span>
        </div>
      </div>

      {/* Row 2: Value — THE hero element, everything else supports it */}
      <div className="flex items-baseline gap-1">
        <span
          className="font-mono-num"
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#94a3b8',
              lineHeight: 1,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Row 3: Trend + Subtitle — supporting info only */}
      {(trend || subtitle || sparkline) && (
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {trend && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: v.trendColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
                {trend.value}
              </span>
            )}
            {subtitle && (
              <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1 }}>
                {subtitle}
              </span>
            )}
          </div>

          {/* Sparkline — tiny, subtle, background context */}
          {sparkline && sparkline.length > 0 && (
            <div className="flex items-end gap-[1.5px]" style={{ height: '14px' }}>
              {sparkline.map((val, i) => {
                const max = Math.max(...sparkline)
                const h = max > 0 ? Math.max(2, (val / max) * 14) : 2
                return (
                  <div
                    key={i}
                    style={{
                      width: '3px',
                      height: `${h}px`,
                      borderRadius: '1px',
                      background: i === sparkline.length - 1 ? v.iconColor : '#e2e8f0',
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
