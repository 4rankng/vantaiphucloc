import type { BadgeVariant } from '@/components/shared/StatusBadge'

export const tripStatusVariant = (s: string): BadgeVariant =>
  s === 'IN_PROGRESS' ? 'success' : s === 'COMPLETED' ? 'info' : s === 'PLANNED' ? 'warning' : s === 'CANCELLED' ? 'danger' : 'neutral'

export const vehicleStatusMap: Record<string, { variant: BadgeVariant; label: string }> = {
  running: { variant: 'success', label: 'Đang chạy' },
  idle: { variant: 'warning', label: 'Rảnh' },
  maintenance: { variant: 'danger', label: 'Bảo dưỡng' },
  in_use: { variant: 'success', label: 'Đang dùng' },
}

export const invoiceStatusVariant = (s: string): BadgeVariant =>
  s === 'PAID' ? 'success' : s === 'ISSUED' ? 'info' : s === 'OVERDUE' ? 'danger' : 'warning'

export const invoiceStatusLabel = (s: string) =>
  s === 'PAID' ? 'Đã thu' : s === 'ISSUED' ? 'Đã PH' : s === 'OVERDUE' ? 'Quá hạn' : 'Nháp'

export const expenseStatusVariant = (s: string): BadgeVariant =>
  s === 'APPROVED' ? 'success' : s === 'DRAFT' ? 'warning' : s === 'REJECTED' ? 'danger' : 'neutral'

export const expenseStatusLabel = (s: string) =>
  s === 'APPROVED' ? 'Đã duyệt' : s === 'DRAFT' ? 'Chờ duyệt' : s === 'REJECTED' ? 'Từ chối' : s
