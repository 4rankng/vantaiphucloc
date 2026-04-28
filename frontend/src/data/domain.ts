export type Role = 'superadmin' | 'director' | 'accountant' | 'driver'
export type TrailerType = '20FT' | '40FT'
export type JobStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ClientType = 'company' | 'individual'
export type WorkType = 'E20' | 'E40' | 'F20' | 'F40'
export type WorkOrderStatus = 'PENDING' | 'PRICED' | 'MATCHED'
export type TripOrderStatus = 'DRAFT' | 'CONFIRMED' | 'INVOICED' | 'CANCELLED'
export type SalaryPeriodStatus = 'OPEN' | 'CALCULATED' | 'PAID'

export interface ContainerItem {
  containerNumber: string
  workType: WorkType
  photoUrl: string
  photoLat?: number | null
  photoLng?: number | null
  photoTimestamp?: string | null
}

export const WORK_TYPES: WorkType[] = ['E20', 'E40', 'F20', 'F40']

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  E20: 'E20 (Container rỗng 20ft)',
  E40: 'E40 (Container rỗng 40ft)',
  F20: 'F20 (Container hàng 20ft)',
  F40: 'F40 (Container hàng 40ft)',
}

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'SuperAdmin',
  director: 'Giám đốc',
  accountant: 'Kế toán',
  driver: 'Tài xế',
}

// ─── Vehicles (Real plates) ──────────────────────────────────────────────────
// TODO: Add when vehicle management feature is implemented
// export interface Tractor { ... }
// export interface Trailer { ... }

export interface Driver {
  id: string
  username: string
  phone: string
  tractorPlate: string | null
  vendor: string | null
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  type: ClientType
  taxCode?: string
  address?: string
  phone: string
  contactPerson?: string
  outstandingDebt: number
}

// TODO: Add when partner management feature is implemented
// export interface Partner { ... }

// TODO: Add when job management feature is implemented
// export interface Job { ... }

// TODO: Add when alert system feature is implemented
// export interface Alert { ... }

// TODO: Add when expense tracking feature is implemented
// export interface ExpenseItem { ... }

// TODO: Add when invoicing feature is implemented
// export interface Invoice { ... }

// TODO: Add when ledger feature is implemented
// export interface LedgerEntry { ... }

export interface RoutePrice {
  route: string
  type20ft: number
  type40ft: number
  isTwoWay?: boolean
}

// TODO: Add when reporting feature is implemented
// export interface MonthlyRevenue { ... }

// TODO: Add when period close feature is implemented
// export interface PeriodClose { ... }

export interface WorkOrder {
  id: string
  containers: ContainerItem[]
  clientId: string
  clientName: string
  route: string
  driverId: string
  driverName: string
  tractorPlate: string
  gpsLat: number
  gpsLng: number
  gpsAddress?: string
  unitPrice: number
  driverSalary: number
  allowance: number
  earning: number
  pricingId?: string
  createdAt: string
  status: WorkOrderStatus
  /** True when created offline, not yet synced to server */
  pendingSync?: boolean
}

export interface PricingLine {
  workType: WorkType
  quantity: number
}

export interface Pricing {
  id: string
  clientId: string
  clientName: string
  workType: WorkType
  route: string
  lines: PricingLine[]
  unitPrice: number
  driverSalary: number
  allowance: number
  createdAt: string
  updatedAt: string
}

export interface TripOrder {
  id: string
  tripDate: string
  clientId: string
  clientName: string
  workType: WorkType
  route: string
  tractorPlate: string
  driverId: string
  driverName: string
  containerNumber: string
  pricingId: string
  unitPrice: number
  driverSalary: number
  allowance: number
  revenue: number
  matchedWorkOrderIds: string[]
  status: TripOrderStatus
  createdAt: string
}

export interface SalaryPeriod {
  id: string
  driverId: string
  driverName: string
  startDate: string
  endDate: string
  workOrderCount: number
  pricePerOrder: number
  totalSalary: number
  totalAllowance: number
  totalDeduction: number
  netPay: number
  status: SalaryPeriodStatus
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' ₫'
}

export function formatCurrencyFull(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' ₫'
}

export function formatCurrencyShort(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' ₫'
}

export function getContainerBadgeColor(type: TrailerType): string {
  switch (type) {
    case '20FT': return 'bg-blue-100 text-blue-700'
    case '40FT': return 'bg-emerald-100 text-emerald-700'
  }
}

export function getJobStatusBadge(status: JobStatus): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  switch (status) {
    case 'DRAFT': return { variant: 'neutral', label: 'Nháp' }
    case 'PLANNED': return { variant: 'warning', label: 'Lên kế hoạch' }
    case 'IN_PROGRESS': return { variant: 'success', label: 'Đang chạy' }
    case 'COMPLETED': return { variant: 'info', label: 'Hoàn thành' }
    case 'CANCELLED': return { variant: 'danger', label: 'Huỷ' }
  }
}

export function getWorkOrderStatusBadge(status: WorkOrderStatus): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  switch (status) {
    case 'PENDING': return { variant: 'warning', label: 'Chờ đối soát' }
    case 'PRICED': return { variant: 'success', label: 'Đã tính giá' }
    case 'MATCHED': return { variant: 'info', label: 'Đã đối soát' }
  }
}

export function getTripOrderStatusBadge(status: TripOrderStatus): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  switch (status) {
    case 'DRAFT': return { variant: 'neutral', label: 'Nháp' }
    case 'CONFIRMED': return { variant: 'success', label: 'Đã xác nhận' }
    case 'INVOICED': return { variant: 'info', label: 'Đã xuất hoá đơn' }
    case 'CANCELLED': return { variant: 'danger', label: 'Đã huỷ' }
  }
}

export function getSalaryStatusBadge(status: SalaryPeriodStatus): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  switch (status) {
    case 'OPEN': return { variant: 'warning', label: 'Chờ tính' }
    case 'CALCULATED': return { variant: 'info', label: 'Đã tính' }
    case 'PAID': return { variant: 'success', label: 'Đã trả' }
  }
}
