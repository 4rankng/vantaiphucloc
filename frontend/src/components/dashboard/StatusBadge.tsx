type Status =
  | 'DRAFT'
  | 'PENDING'
  | 'MATCHED'
  | 'COMPLETED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'PAID'
  | 'OPEN'
  | 'CALCULATED'

const statusConfig: Record<Status, { label: string; bg: string; color: string }> = {
  DRAFT: {
    label: 'Nháp',
    bg: 'var(--theme-bg-tertiary)',
    color: 'var(--theme-text-muted)',
  },
  PENDING: {
    label: 'Chờ xử lý',
    bg: 'color-mix(in srgb, var(--theme-status-warning) 15%, transparent)',
    color: 'var(--theme-status-warning)',
  },
  MATCHED: {
    label: 'Đã ghép',
    bg: 'color-mix(in srgb, var(--theme-status-info, #3b82f6) 10%, transparent)',
    color: 'var(--theme-status-info, #3b82f6)',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    bg: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
    color: 'var(--theme-brand-primary)',
  },
  CONFIRMED: {
    label: 'Đã chốt',
    bg: 'var(--theme-brand-primary)',
    color: '#fff',
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'color-mix(in srgb, var(--theme-status-error) 10%, transparent)',
    color: 'var(--theme-status-error)',
  },
  PAID: {
    label: 'Đã trả',
    bg: 'var(--theme-brand-primary)',
    color: '#fff',
  },
  OPEN: {
    label: 'Đang mở',
    bg: 'var(--theme-bg-tertiary)',
    color: 'var(--theme-text-muted)',
  },
  CALCULATED: {
    label: 'Đã tính',
    bg: 'color-mix(in srgb, var(--theme-status-info, #3b82f6) 10%, transparent)',
    color: 'var(--theme-status-info, #3b82f6)',
  },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as Status]
  if (!cfg) return null
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}
