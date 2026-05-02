import { type ReactNode } from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Info,
  FileText,
  Loader2,
} from 'lucide-react'

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'draft'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'matched'
  | 'processing'

export type StatusSize = 'sm' | 'md' | 'lg'

export interface StatusBadgeProProps {
  /** Status variant determines colors and optional icon */
  variant: StatusVariant
  /** Text label to display */
  label: string
  /** Size of the badge */
  size?: StatusSize
  /** Show icon based on variant */
  showIcon?: boolean
  /** Custom icon override */
  icon?: ReactNode
  /** Pulse animation for attention */
  pulse?: boolean
  /** Additional className */
  className?: string
}

const VARIANT_STYLES: Record<
  StatusVariant,
  { bg: string; color: string; icon: typeof CheckCircle2 }
> = {
  success: {
    bg: 'var(--theme-status-success-light)',
    color: 'var(--theme-status-success)',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'var(--theme-status-warning-light)',
    color: 'var(--theme-status-warning)',
    icon: AlertTriangle,
  },
  error: {
    bg: 'var(--theme-status-error-light)',
    color: 'var(--theme-status-error)',
    icon: XCircle,
  },
  info: {
    bg: 'var(--theme-status-info-light)',
    color: 'var(--theme-status-info)',
    icon: Info,
  },
  neutral: {
    bg: 'var(--theme-bg-tertiary)',
    color: 'var(--theme-text-muted)',
    icon: FileText,
  },
  draft: {
    bg: 'var(--theme-bg-tertiary)',
    color: 'var(--theme-text-muted)',
    icon: FileText,
  },
  pending: {
    bg: 'var(--theme-status-warning-light)',
    color: 'var(--theme-status-warning)',
    icon: Clock,
  },
  completed: {
    bg: 'var(--theme-status-success-light)',
    color: 'var(--theme-status-success)',
    icon: CheckCircle2,
  },
  cancelled: {
    bg: 'var(--theme-status-error-light)',
    color: 'var(--theme-status-error)',
    icon: XCircle,
  },
  matched: {
    bg: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)',
    color: 'var(--theme-brand-primary)',
    icon: CheckCircle2,
  },
  processing: {
    bg: 'var(--theme-status-info-light)',
    color: 'var(--theme-status-info)',
    icon: Loader2,
  },
}

const SIZE_CLASSES: Record<StatusSize, { badge: string; icon: string }> = {
  sm: { badge: 'px-2 py-0.5 text-[10px] gap-1', icon: 'h-2.5 w-2.5' },
  md: { badge: 'px-2.5 py-1 text-xs gap-1.5', icon: 'h-3 w-3' },
  lg: { badge: 'px-3 py-1.5 text-sm gap-2', icon: 'h-4 w-4' },
}

export function StatusBadgePro({
  variant,
  label,
  size = 'md',
  showIcon = false,
  icon: customIcon,
  pulse = false,
  className = '',
}: StatusBadgeProProps) {
  const style = VARIANT_STYLES[variant]
  const sizeClass = SIZE_CLASSES[size]
  const Icon = style.icon

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${sizeClass.badge} ${
        pulse ? 'animate-badge-pulse' : ''
      } ${className}`}
      style={{
        background: style.bg,
        color: style.color,
      }}
    >
      {(showIcon || customIcon) && (
        <span className={`shrink-0 ${variant === 'processing' ? 'animate-spin' : ''}`}>
          {customIcon ?? <Icon className={sizeClass.icon} />}
        </span>
      )}
      {label}
    </span>
  )
}

// Convenience exports for common status mappings
export const STATUS_LABEL_MAP: Record<string, { variant: StatusVariant; label: string }> = {
  DRAFT: { variant: 'draft', label: 'Nháp' },
  PENDING: { variant: 'pending', label: 'Chờ xử lý' },
  COMPLETED: { variant: 'completed', label: 'Hoàn thành' },
  CANCELLED: { variant: 'cancelled', label: 'Đã huỷ' },
  MATCHED: { variant: 'matched', label: 'Đã ghép' },
  PROCESSING: { variant: 'processing', label: 'Đang xử lý' },
}

export function getStatusProps(status: string): { variant: StatusVariant; label: string } {
  return STATUS_LABEL_MAP[status] ?? { variant: 'neutral', label: status }
}
