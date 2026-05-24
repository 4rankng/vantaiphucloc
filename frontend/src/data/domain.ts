export type Role = 'superadmin' | 'director' | 'accountant' | 'driver'
export type ContType = 'E20' | 'E40' | 'F20' | 'F40'

export const CONT_TYPES: ContType[] = ['E20', 'E40', 'F20', 'F40']

export const CONT_TYPE_LABELS: Record<ContType, string> = {
  E20: 'E20 (Container rỗng 20ft)',
  E40: 'E40 (Container rỗng 40ft)',
  F20: 'F20 (Container hàng 20ft)',
  F40: 'F40 (Container hàng 40ft)',
}

// Work types — container types + operation types (Tác nghiệp)
export type WorkType = ContType | 'CHẠY SÀ LAN' | 'CHUYỂN BÃI' | 'ĐÓNG KHO' | 'LẤY VỎ HẠ HÀNG' | 'XUẤT/NHẬP TÀU'

export const WORK_TYPES: WorkType[] = [...CONT_TYPES, 'CHẠY SÀ LAN', 'CHUYỂN BÃI', 'ĐÓNG KHO', 'LẤY VỎ HẠ HÀNG', 'XUẤT/NHẬP TÀU']

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  ...CONT_TYPE_LABELS,
  'CHẠY SÀ LAN': 'Chạy sà lan',
  'CHUYỂN BÃI': 'Chuyển bãi',
  'ĐÓNG KHO': 'Đóng kho',
  'LẤY VỎ HẠ HÀNG': 'Lấy vỏ hạ hàng',
  'XUẤT/NHẬP TÀU': 'Xuất / Nhập tàu',
}

const _normWt = (s: string) =>
  s.toUpperCase().replace(/[_\s\-/]+/g, ' ').replace(/[ĐĐ]/g, 'D').normalize('NFD').replace(/[̀-ͯ]/g, '')

// Pre-built reverse map: normalized key → label (handles DB values like "CHUYEN_BAI")
const _workTypeLookup: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const key of WORK_TYPES) {
    m.set(_normWt(key), WORK_TYPE_LABELS[key])
  }
  return m
})()

export function getWorkTypeLabel(wt: string | null | undefined): string | undefined {
  if (!wt) return undefined
  // Direct match first
  const direct = WORK_TYPE_LABELS[wt as WorkType]
  if (direct) return direct
  return _workTypeLookup.get(_normWt(wt))
}

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'SuperAdmin',
  director: 'Giám đốc',
  accountant: 'Kế toán',
  driver: 'Tài xế',
}

export interface Driver {
  id: number
  username: string
  fullName: string | null
  phone: string
  vehiclePlate: string | null
  createdAt: string
  updatedAt: string
}

export interface Vehicle {
  id: number
  plate: string
  driverId?: number | null
  vendorId?: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: number
  code?: string
  name: string
  taxCode?: string
  address?: string
  phone?: string
  contactPerson?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  type?: 'company' | 'individual'
}

export interface Vendor {
  id: number
  code?: string
  name: string
  taxCode?: string
  address?: string
  phone?: string
  contactPerson?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  type?: 'company' | 'individual'
}

export interface VendorSummary {
  id: number
  name: string
}

export interface VendorSummaryStats {
  vendor: Pick<Vendor, 'id' | 'name' | 'phone' | 'taxCode' | 'address' | 'contactPerson'>
  stats: {
    tripCount: number
    containerCount: number
    totalPaid: number
    totalAmount: number
  }
  drivers: Array<{
    plate: string
    tripCount: number
    containerCount: number
    totalPaid: number
  }>
}

// ─── Read-DTO summaries (nested in API responses) ──────────────────────────
// Domain DB stores only FKs; backend composes these via batch JOIN. See
// BizLogic.md §4 for the rationale.

export interface ClientSummary {
  id: number
  code?: string | null
  name: string
}

export interface LocationSummary {
  id: number
  name: string
}

export interface DriverSummary {
  id: number
  name: string
  phone?: string | null
  vehicle?: VehicleSummary | null
}

export interface VehicleSummary {
  id: number
  plate: string
}

export interface DeliveredTrip {
  id: number
  contNumber: string | null
  contType: ContType | null
  client: ClientSummary
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
  driver?: DriverSummary | null
  vendor?: VendorSummary | null
  vendorId?: number | null
  vehiclePlate?: string | null
  vessel?: string | null
  workType?: WorkType | null
  revenue: number
  driverSalary: number
  tripDate?: string | null
  createdAt: string
  updatedAt: string
  bookedTripId: number | null
  pendingSync?: boolean
}


export interface PricingLine {
  id?: number
  quantity: number
  unitPrice: number
  driverSalary: number
}

export interface Pricing {
  id: number
  client: ClientSummary
  workType: ContType
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
  lines: PricingLine[]
  createdAt: string
  updatedAt: string
}

export interface BookedTrip {
  id: number
  tripDate: string
  client: ClientSummary
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
  contNumber: string | null
  contType: ContType | null
  vessel: string | null
  vehiclePlate?: string | null
  workType?: WorkType | null
  matchedDeliveredTripIds: number[]
  matched: boolean
  createdAt: string
  updatedAt: string
}


export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export interface Location {
  id: number
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LocationAlias {
  id: number
  locationId: number
  locationName?: string | null
  alias: string
  aliasNormalized: string
  source: string
  createdAt: string
  createdById?: number | null
}

export interface MergeLocationsResponse {
  sourceLocationId: number
  targetLocationId: number
  aliasesMoved: number
  fkUpdates: Record<string, number>
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return '—'
  return amount.toLocaleString('vi-VN') + ' ₫'
}

export function compactCurrency(amount: number | undefined | null): string {
  if (amount == null) return '—'
  if (Math.abs(amount) >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr ₫'
  if (Math.abs(amount) >= 1_000) return (amount / 1_000).toFixed(1).replace(/\.0$/, '') + 'K ₫'
  return amount.toLocaleString('vi-VN') + ' ₫'
}

export { formatCurrency as formatCurrencyFull }
export { formatCurrency as formatCurrencyShort }

// ─── Route Pricing (Cước tuyến) ────────────────────────────────────────────

export interface RoutePricing {
  id: number
  client: ClientSummary
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
  workType: WorkType
  f20Price: number | null
  f40Price: number | null
  e20Price: number | null
  e40Price: number | null
  f20DriverSalary: number | null
  f40DriverSalary: number | null
  e20DriverSalary: number | null
  e40DriverSalary: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface VendorRoutePricing {
  id: number
  vendor: { id: number; name: string; code?: string }
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
  workType: WorkType
  f20Price: number | null
  f40Price: number | null
  e20Price: number | null
  e40Price: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}
