export type Role = 'superadmin' | 'director' | 'accountant' | 'driver'
export type TrailerType = '20FT' | '40FT'
export type JobStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ClientType = 'company' | 'individual'
export type WorkType = 'E20' | 'E40' | 'F20' | 'F40'
export type WorkOrderStatus = 'PENDING' | 'MATCHED' | 'COMPLETED'
export type TripOrderStatus = 'DRAFT' | 'PENDING' | 'COMPLETED' | 'CANCELLED'
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
  id: number
  username: string
  phone: string
  tractorPlate: string | null
  vendor: string | null
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: number
  code?: string
  name: string
  type: ClientType
  taxCode?: string
  address?: string
  phone: string
  contactPerson?: string
  outstandingDebt: number
  isActive?: boolean
  createdAt?: string
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
  id?: number
  route: string
  pickupLocation?: string
  dropoffLocation?: string
  type20ft: number
  type40ft: number
  isTwoWay?: boolean
}

// TODO: Add when reporting feature is implemented
// export interface MonthlyRevenue { ... }

// TODO: Add when period close feature is implemented
// export interface PeriodClose { ... }

export interface WorkOrder {
  id: number
  code?: string
  containers: ContainerItem[]
  clientId: number
  clientName: string
  clientCode?: string
  route: string
  pickupLocation?: string
  dropoffLocation?: string
  driverId: number
  driverName: string
  tractorPlate: string
  gpsLat: number
  gpsLng: number
  gpsAddress?: string
  unitPrice: number
  driverSalary: number
  allowance: number
  earning: number
  pricingId?: number
  createdAt: string
  status: WorkOrderStatus
  /** True when created offline, not yet synced to server */
  pendingSync?: boolean
}

export interface PricingLine {
  id?: number
  quantity: number
  unitPrice: number
  driverSalary: number
  allowance: number
}

export interface Pricing {
  id: number
  clientId: number
  clientName: string
  workType: WorkType
  route: string
  pickupLocation?: string
  dropoffLocation?: string
  lines: PricingLine[]
  createdAt: string
  updatedAt: string
}

export interface TripOrderContainerItem {
  containerNumber: string
  workType: WorkType
}

export interface TripOrder {
  id: number
  code?: string
  tripDate: string
  clientId: number
  clientName: string
  workType?: WorkType
  route: string
  pickupLocation?: string
  dropoffLocation?: string
  tractorPlate: string
  driverId: number
  driverName: string
  containerNumber?: string
  containers: TripOrderContainerItem[]
  pricingId: number
  unitPrice: number
  driverSalary: number
  allowance: number
  revenue: number
  matchedWorkOrderIds: number[]
  status: TripOrderStatus
  isConfirmed: boolean
  confirmedBy?: number
  confirmedAt?: string
  createdAt: string
}

export interface SalaryPeriod {
  id: number
  driverId: number
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

// ─── Match Suggestions ────────────────────────────────────────────────────────

export type MatchConfidence = 'full' | 'partial' | 'none'

export interface MatchSuggestion {
  tripOrder: TripOrder
  confidence: MatchConfidence
  matchedFields: string[]
  score: number
}

export interface SuggestMatchesResponse {
  workOrderId: number
  suggestions: MatchSuggestion[]
}

export interface WOSuggestion {
  workOrder: WorkOrder
  confidence: MatchConfidence
  matchedFields: string[]
  score: number
}

export interface SuggestWosResponse {
  tripOrderId: number
  suggestions: WOSuggestion[]
}

// ─── Reconciliation ────────────────────────────────────────────────────────────

export interface ReconciliationResult {
  containerNumber: string
  normalizedNumber: string
  workOrderId?: number
  tripOrderId?: number
  status: 'confirmed' | 'pending' | 'rejected'
  isDuplicate: boolean
  matchType: 'exact' | 'partial' | 'none'
}

export interface ReconciliationUploadResponse {
  success: boolean
  data: {
    totalContainers: number
    duplicatesFound: number
    confirmed: number
    pending: number
    results: ReconciliationResult[]
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return '— ₫'
  return amount.toLocaleString('vi-VN') + ' ₫'
}

// formatCurrencyFull and formatCurrencyShort removed — identical to formatCurrency
// Use formatCurrency everywhere instead.
export { formatCurrency as formatCurrencyFull }
export { formatCurrency as formatCurrencyShort }

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
    case 'MATCHED': return { variant: 'info', label: 'Đã đối soát (chờ giá)' }
    case 'COMPLETED': return { variant: 'success', label: 'Hoàn thành' }
  }
}

export function getTripOrderStatusBadge(status: TripOrderStatus): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  switch (status) {
    case 'DRAFT': return { variant: 'neutral', label: 'Nháp' }
    case 'PENDING': return { variant: 'warning', label: 'Chờ đối soát' }
    case 'COMPLETED': return { variant: 'success', label: 'Hoàn thành' }
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
