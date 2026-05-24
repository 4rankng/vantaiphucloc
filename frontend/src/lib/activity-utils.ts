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
    delivered_trips: 'tạo chuyến giao',
    clients: 'tạo khách hàng',
    locations: 'tạo địa điểm',
    location_aliases: 'tạo alias địa điểm',
    pricings: 'tạo bảng giá',
    pricing_lines: 'tạo dòng giá',
    route_pricings: 'tạo giá tuyến',
    vendor_route_pricings: 'tạo giá tuyến nhà xe',
    users: 'tạo tài khoản',
    vendors: 'tạo nhà xe',
    vehicles: 'tạo xe',
    vehicle_drivers: 'gán lái xe',
    vehicle_expenses: 'tạo chi phí xe',
    driver_salaries: 'tạo lương',
    driver_salary_configs: 'tạo cấu hình lương',
    booked_trips: 'tạo lệnh vận chuyển',
    settings: 'cập nhật cấu hình',
  },
  UPDATE: {
    delivered_trips: 'cập nhật chuyến giao',
    clients: 'cập nhật khách hàng',
    locations: 'cập nhật địa điểm',
    location_aliases: 'cập nhật alias địa điểm',
    pricings: 'cập nhật bảng giá',
    pricing_lines: 'cập nhật dòng giá',
    route_pricings: 'cập nhật giá tuyến',
    vendor_route_pricings: 'cập nhật giá tuyến nhà xe',
    users: 'cập nhật tài khoản',
    vendors: 'cập nhật nhà xe',
    vehicles: 'cập nhật xe',
    vehicle_drivers: 'cập nhật gán lái xe',
    vehicle_expenses: 'cập nhật chi phí xe',
    driver_salaries: 'cập nhật lương',
    driver_salary_configs: 'cập nhật cấu hình lương',
    booked_trips: 'cập nhật lệnh vận chuyển',
    settings: 'cập nhật cấu hình',
  },
  DELETE: {
    delivered_trips: 'xoá chuyến giao',
    clients: 'xoá khách hàng',
    locations: 'xoá địa điểm',
    location_aliases: 'xoá alias địa điểm',
    pricings: 'xoá bảng giá',
    pricing_lines: 'xoá dòng giá',
    route_pricings: 'xoá giá tuyến',
    vendor_route_pricings: 'xoá giá tuyến nhà xe',
    users: 'xoá tài khoản',
    vendors: 'xoá nhà xe',
    vehicles: 'xoá xe',
    vehicle_drivers: 'xoá gán lái xe',
    vehicle_expenses: 'xoá chi phí xe',
    driver_salaries: 'xoá lương',
    driver_salary_configs: 'xoá cấu hình lương',
    booked_trips: 'xoá lệnh vận chuyển',
    settings: 'xoá cấu hình',
  },
  MATCH: {
    _default: 'ghép chuyến',
  },
  AUTO_MATCH: {
    _default: 'tự động ghép chuyến',
  },
  BULK_MATCH: {
    _default: 'ghép chuyến hàng loạt',
  },
  UNMATCH: {
    _default: 'bỏ ghép chuyến',
  },
  CANCEL: {
    _default: 'huỷ',
  },
  CONFIRM: {
    _default: 'xác nhận',
  },
}

/** Subject type prefix displayed before subjectName in audit messages. */
export const SUBJECT_PREFIX: Record<string, string> = {
  driver_salaries: 'lái xe',
  driver_salary_configs: 'lái xe',
  vehicles: 'xe',
  vehicle_drivers: '',
  vehicle_expenses: '',
  clients: 'khách hàng',
  vendors: 'nhà xe',
  locations: 'địa điểm',
  users: '',
  delivered_trips: '',
  booked_trips: '',
  pricings: '',
  route_pricings: '',
  vendor_route_pricings: '',
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
      driver_salary: 'Lương LX',
      basic_salary: 'Lương cơ bản',
      bonus_salary: 'Thưởng',
      allowance: 'Phụ cấp',
      base_salary: 'Lương cơ bản',
      amount: 'Số tiền',
      f20_price: 'Giá F20',
      f40_price: 'Giá F40',
      e20_price: 'Giá E20',
      e40_price: 'Giá E40',
      f20_driver_salary: 'Lương LX F20',
      f40_driver_salary: 'Lương LX F40',
      e20_driver_salary: 'Lương LX E20',
      e40_driver_salary: 'Lương LX E40',
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
