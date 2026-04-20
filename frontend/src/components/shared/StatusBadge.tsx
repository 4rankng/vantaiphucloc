import { cn } from '@/lib/utils'

type Status = 'active' | 'running' | 'warning' | 'alert' | 'idle' | 'completed' | 'loading' | 'waiting' | 'orphan' | 'pending' | 'paid' | 'overdue' | 'issued' | 'approved' | 'rejected'

interface StatusBadgeProps {
  status: Status
  label?: string
}

const statusConfig: Record<Status, { bg: string; text: string; defaultLabel: string }> = {
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700', defaultLabel: 'Hoạt động' },
  running: { bg: 'bg-emerald-100', text: 'text-emerald-700', defaultLabel: 'Đang chạy' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700', defaultLabel: 'Hoàn thành' },
  loading: { bg: 'bg-sky-100', text: 'text-sky-700', defaultLabel: 'Đang tải' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700', defaultLabel: 'Cảnh báo' },
  orphan: { bg: 'bg-orange-100', text: 'text-orange-700', defaultLabel: 'Mồ côi' },
  alert: { bg: 'bg-red-100', text: 'text-red-700', defaultLabel: 'Khẩn cấp' },
  idle: { bg: 'bg-gray-100', text: 'text-gray-600', defaultLabel: 'Rảnh' },
  waiting: { bg: 'bg-yellow-100', text: 'text-yellow-700', defaultLabel: 'Chờ xử lý' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', defaultLabel: 'Chờ duyệt' },
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', defaultLabel: 'Đã thu' },
  issued: { bg: 'bg-blue-100', text: 'text-blue-700', defaultLabel: 'Đã phát hành' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', defaultLabel: 'Quá hạn' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', defaultLabel: 'Đã duyệt' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', defaultLabel: 'Từ chối' },
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.idle
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase', config.bg, config.text)}>
      {label || config.defaultLabel}
    </span>
  )
}
