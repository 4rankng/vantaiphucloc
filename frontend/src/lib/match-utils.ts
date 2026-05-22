import type { DeliveredTripStatus } from '@/data/domain'
import type { PillVariant } from '@/components/shared/Pill'

export function formatMatchDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [, m, d] = dateStr.split('-')
  if (!d) return dateStr
  return `${d}/${m}`
}

export function scoreColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0
  if (pct >= 0.8) return 'var(--success)'
  if (pct >= 0.5) return 'var(--warning)'
  return 'var(--danger)'
}

export function getDeliveredTripStatusBadge(status: DeliveredTripStatus): { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; label: string } {
  switch (status) {
    case 'PENDING': return { variant: 'warning', label: 'Chờ ghép' }
    case 'MATCHED': return { variant: 'success', label: 'Đã ghép' }
    case 'COMPLETED': return { variant: 'success', label: 'Hoàn thành' }
    case 'CANCELLED': return { variant: 'danger', label: 'Huỷ' }
  }
}

export function statusVariant(badge: ReturnType<typeof getDeliveredTripStatusBadge>): PillVariant {
  switch (badge.variant) {
    case 'success': return 'success'
    case 'warning': return 'warn'
    case 'danger':  return 'danger'
    case 'info':    return 'info'
    default:        return 'neutral'
  }
}
