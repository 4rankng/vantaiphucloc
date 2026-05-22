import type { AuditLogEntry } from '@/services/api/audit.api'

export { daysInMonth } from './date-utils'

export const compact = (n: number) =>
  n >= 1e9
    ? (n / 1e9).toFixed(2) + ' tỷ'
    : n >= 1e6
    ? (n / 1e6).toFixed(1) + ' tr'
    : n.toLocaleString('vi-VN')

export const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']

export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export const ACTIVITY_LABELS: Record<string, Record<string, string>> = {
  CREATE: {
    work_orders: 'tạo phiếu chuyến',
    trip_orders: 'tạo đơn hàng',
    trip_order_work_orders: 'ghép chuyến',
    reconciliations: 'ghép chuyến',
    clients: 'tạo khách hàng',
    locations: 'tạo địa điểm',
    routes: 'tạo cung đường',
    pricings: 'tạo bảng giá',
    users: 'tạo tài khoản',
  },
  CREATE_RECONCILIATION: {
    _default: 'ghép chuyến',
  },
  UPDATE: {
    work_orders: 'cập nhật phiếu chuyến',
    trip_orders: 'cập nhật đơn hàng',
    clients: 'cập nhật khách hàng',
    locations: 'cập nhật địa điểm',
    routes: 'cập nhật cung đường',
    pricings: 'cập nhật bảng giá',
    users: 'cập nhật tài khoản',
  },
  DELETE: {
    work_orders: 'xoá phiếu chuyến',
    trip_orders: 'xoá đơn hàng',
    clients: 'xoá khách hàng',
    locations: 'xoá địa điểm',
    routes: 'xoá cung đường',
    pricings: 'xoá bảng giá',
    users: 'xoá tài khoản',
  },
  MATCH: {
    trip_order_work_orders: 'ghép chuyến',
    work_orders: 'ghép chuyến',
    trip_orders: 'ghép chuyến',
    reconciliations: 'ghép chuyến',
    _default: 'ghép chuyến',
  },
  AUTO_MATCH: {
    reconciliations: 'tự động ghép chuyến',
    _default: 'tự động ghép chuyến',
  },
  BULK_MATCH: {
    reconciliations: 'ghép chuyến hàng loạt',
    _default: 'ghép chuyến hàng loạt',
  },
  UNMATCH: {
    reconciliations: 'bỏ ghép chuyến',
    _default: 'bỏ ghép chuyến',
  },
  CANCEL: {
    work_orders: 'huỷ phiếu chuyến',
    trip_orders: 'huỷ đơn hàng',
    _default: 'huỷ',
  },
  CONFIRM: {
    _default: 'xác nhận',
  },
}

export function formatActivityEntry(action: string, tableName: string): string {
  const tableMap = ACTIVITY_LABELS[action]
  if (tableMap) {
    return tableMap[tableName] ?? tableMap['_default'] ?? `${action.toLowerCase()} ${tableName}`
  }
  return `${action.toLowerCase()} ${tableName.replace(/_/g, ' ')}`
}

export function formatFinancialChange(log: AuditLogEntry): { label: string; old: number; new: number }[] | null {
  if (log.action !== 'UPDATE') return null
  try {
    const oldVal = JSON.parse(log.oldValue || '{}')
    const newVal = JSON.parse(log.newValue || '{}')
    const out: { label: string; old: number; new: number }[] = []

    const fieldMap: Record<string, string> = {
      revenue: 'Doanh thu',
      unit_price: 'Đơn giá',
      unitPrice: 'Đơn giá',
      driver_salary: 'Lương LX',
      driverSalary: 'Lương LX',
      allowance: 'Phụ cấp',
    }

    for (const [field, label] of Object.entries(fieldMap)) {
      if (newVal[field] !== undefined && oldVal[field] !== newVal[field]) {
        out.push({
          label,
          old: Number(oldVal[field] || 0),
          new: Number(newVal[field] || 0),
        })
      }
    }
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}
