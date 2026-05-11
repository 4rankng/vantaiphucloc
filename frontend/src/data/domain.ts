export type Role = 'superadmin' | 'director' | 'accountant' | 'driver'
export type TrailerType = '20FT' | '40FT'
export type JobStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type PartnerType = 'client' | 'vendor' | 'both'
export type PartnerRole = 'shipping_line' | 'factory' | 'transport' | 'other'
export type WorkType = 'E20' | 'E40' | 'F20' | 'F40'
export type WorkOrderStatus = 'PENDING' | 'MATCHED'
export type TripOrderStatus = 'PENDING' | 'MATCHED'

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
  fullName: string | null
  phone: string
  vehiclePlate: string | null
  createdAt: string
  updatedAt: string
}

export interface Vehicle {
  id: number
  plate: string
  driverId: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Partner {
  id: number
  code?: string
  name: string
  partnerType: PartnerType
  partnerRole?: PartnerRole
  taxCode?: string
  address?: string
  phone?: string
  contactPerson?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  /** Frontend-only display field: 'company' | 'individual'.
   *  Not stored in the backend — derived from the partner name heuristic. */
  type?: 'company' | 'individual'
}

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

// ─── Read-DTO summaries (nested in API responses) ──────────────────────────
// Domain DB stores only FKs; backend composes these via batch JOIN. See
// BizLogic.md §4 for the rationale.

export interface PartnerSummary {
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
}

export interface VehicleSummary {
  id: number
  plate: string
}

// TODO: Add when reporting feature is implemented
// export interface MonthlyRevenue { ... }

// TODO: Add when period close feature is implemented
// export interface PeriodClose { ... }

export interface WorkOrder {
  id: number
  code?: string
  containers: ContainerItem[]
  partner: PartnerSummary
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
  driver: DriverSummary
  vehicleId?: number | null
  gpsLat: number
  gpsLng: number
  gpsAddress?: string
  unitPrice: number
  driverSalary: number
  allowance: number
  pricingId?: number
  /** Explicit trip execution date (YYYY-MM-DD). Falls back to createdAt if absent. */
  tripDate?: string | null
  createdAt: string
  status: WorkOrderStatus
  matchedTripCount?: number
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
  partner: PartnerSummary
  workType: WorkType
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
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
  partner: PartnerSummary
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
  containers: TripOrderContainerItem[]
  pricingId: number
  unitPrice: number
  driverSalary: number
  allowance: number
  matchedWorkOrderIds: number[]
  status: TripOrderStatus
  createdAt: string
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

// ─── Match Suggestions ────────────────────────────────────────────────────────

export type MatchConfidence = 'full' | 'partial' | 'none'

export interface CriterionBreakdown {
  name: string
  label: string
  match: boolean
  woValue: string | null
  toValue: string | null
}

export interface MatchSuggestion {
  tripOrder: TripOrder
  confidence: MatchConfidence
  matchedFields: string[]
  score: number
  criteria: CriterionBreakdown[]
  matchScore: number
  maxScore: number
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
  criteria: CriterionBreakdown[]
  matchScore: number
  maxScore: number
}

export interface SuggestWosResponse {
  tripOrderId: number
  suggestions: WOSuggestion[]
}

// ─── Match Scores (lightweight for master list) ────────────────────────────────

export interface WorkOrderMatchScore {
  workOrderId: number
  bestScore: number
  bestMatchScore: number
  maxScore: number
  suggestionCount: number
}

export interface MatchScoresResponse {
  scores: WorkOrderMatchScore[]
}

// ─── Bulk Match ────────────────────────────────────────────────────────────────

export interface BulkMatchPair {
  workOrderId: number
  tripOrderId: number
}

export interface BulkMatchResult {
  workOrderId: number
  tripOrderId: number
  success: boolean
  error: string | null
}

export interface BulkMatchResponse {
  matched: BulkMatchResult[]
  errors: string[]
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

export interface Location {
  id: number
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type LocationAliasStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'MERGED'

export interface LocationAlias {
  id: number
  locationId: number
  alias: string
  aliasNormalized: string
  source: string
  status: LocationAliasStatus
  confirmedById?: number | null
  confirmedAt?: string | null
  rejectedById?: number | null
  rejectedAt?: string | null
  mergeTargetLocationId?: number | null
  note?: string | null
  createdAt: string
  createdById?: number | null
}

export interface MergeLocationsResponse {
  sourceLocationId: number
  targetLocationId: number
  aliasesMoved: number
  fkUpdates: Record<string, number>
}

export interface Setting {
  key: string
  value: string
  updatedAt: string
}

export interface DriverEarnings {
  driverId: number
  driverName: string | null
  startDate: string
  endDate: string
  matchedOrderCount: number
  totalSalary: number
  totalAllowance: number
  totalEarnings: number
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return '—'
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
    case 'COMPLETED': return { variant: 'success', label: 'Đã khớp' }
    case 'CANCELLED': return { variant: 'danger', label: 'Huỷ' }
  }
}

export function getWorkOrderStatusBadge(status: WorkOrderStatus): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  switch (status) {
    case 'PENDING': return { variant: 'warning', label: 'Chờ ghép' }
    case 'MATCHED': return { variant: 'success', label: 'Đã khớp' }
  }
}

export function getTripOrderStatusBadge(status: TripOrderStatus): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  switch (status) {
    case 'PENDING': return { variant: 'warning', label: 'Chờ ghép' }
    case 'MATCHED': return { variant: 'success', label: 'Đã khớp' }
  }
}

export function getSalaryStatusBadge(status: string): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  return { variant: 'neutral', label: status }
}
