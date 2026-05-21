export type Role = 'superadmin' | 'director' | 'accountant' | 'driver'
export type JobStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ContType = 'E20' | 'E40' | 'F20' | 'F40'
export type DeliveredTripStatus = 'PENDING' | 'MATCHED' | 'COMPLETED' | 'CANCELLED'
export type BookedTripStatus = 'DRAFT' | 'PENDING' | 'MATCHED' | 'COMPLETED' | 'CONFIRMED' | 'CANCELLED'

export interface ContainerItem {
  id: number
  containerNumber: string
  contType: ContType
  photoUrl?: string | null
  photoLat?: number | null
  photoLng?: number | null
  photoTimestamp?: string | null
  photoAddress?: string | null
}

export const CONT_TYPES: ContType[] = ['E20', 'E40', 'F20', 'F40']

export const CONT_TYPE_LABELS: Record<ContType, string> = {
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
  reconciliations: Array<{
    importId: number
    periodFrom: string
    periodTo: string
    containerCount: number
    status: string
  }>
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

// TODO: Add when reporting feature is implemented
// export interface MonthlyRevenue { ... }

// TODO: Add when period close feature is implemented
// export interface PeriodClose { ... }

export type OperationType = 'XUAT_NHAP_TAU' | 'CHUYEN_BAI' | 'LAY_VO_HA_HANG' | 'CHAY_SA_LAN' | 'DONG_KHO'

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  XUAT_NHAP_TAU: 'Xuất / Nhập tàu',
  CHUYEN_BAI: 'Chuyển bãi',
  LAY_VO_HA_HANG: 'Lấy vỏ hạ hàng',
  CHAY_SA_LAN: 'Chạy sà lan',
  DONG_KHO: 'Đóng kho',
}

export const OPERATION_TYPE_OPTIONS: { value: OperationType; label: string }[] =
  (Object.entries(OPERATION_TYPE_LABELS) as [OperationType, string][]).map(
    ([value, label]) => ({ value, label }),
  )

export interface DeliveredTrip {
  id: number
  containers: ContainerItem[]
  client: ClientSummary
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
  driver?: DriverSummary | null
  vendorId?: number | null
  vehicle?: VehicleSummary | null
  vessel?: string | null
  operationType?: OperationType | null
  workType?: string | null
  gpsLat?: number | null
  gpsLng?: number | null
  gpsAddress?: string | null
  revenue: number
  driverSalary: number
  allowance: number
  tripDate?: string | null
  createdAt: string
  updatedAt: string
  status: DeliveredTripStatus
  matchedTripCount?: number
  bookedTripId?: number | null
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
  client: ClientSummary
  workType: ContType
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
  operationType?: OperationType | null
  lines: PricingLine[]
  createdAt: string
  updatedAt: string
}

export interface BookedTripContainerItem {
  id: number
  containerNumber: string
  contType: ContType
}

export interface BookedTrip {
  id: number
  tripDate: string
  client: ClientSummary
  pickupLocation: LocationSummary
  dropoffLocation: LocationSummary
  containers: BookedTripContainerItem[]
  vessel: string | null
  operationType?: OperationType | null
  workType?: string | null
  revenue: number
  matchedDeliveredTripIds: number[]
  status: BookedTripStatus
  createdAt: string
  updatedAt: string
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
  deliveredTripValue: string | null
  bookedTripValue: string | null
  fuzzy?: boolean
}

export interface MatchSuggestion {
  bookedTrip: BookedTrip
  containerId: number
  confidence: MatchConfidence
  matchedFields: string[]
  score: number
  criteria: CriterionBreakdown[]
  matchScore: number
  maxScore: number
  matchWarnings?: string[]
}

export interface SuggestMatchesResponse {
  deliveredTripId: number
  suggestions: MatchSuggestion[]
}

export interface WOSuggestion {
  deliveredTrip: DeliveredTrip
  confidence: MatchConfidence
  matchedFields: string[]
  score: number
  criteria: CriterionBreakdown[]
  matchScore: number
  maxScore: number
  matchWarnings?: string[]
}

export interface SuggestWosResponse {
  bookedTripId: number
  suggestions: WOSuggestion[]
}

// ─── Match Scores (lightweight for master list) ────────────────────────────────

export interface DeliveredTripMatchScore {
  deliveredTripId: number
  bestScore: number
  bestMatchScore: number
  maxScore: number
  suggestionCount: number
}

export interface MatchScoresResponse {
  scores: DeliveredTripMatchScore[]
}

// ─── Auto-match (preview + confirm) ────────────────────────────────────

export interface AutoMatchCriterion {
  key: string
  label: string
  match: boolean
}

export interface AutoMatchDeliveredTripRef {
  id: number
  code: string | null
  plate: string | null
  date: string | null
  clientName: string | null
}

export interface AutoMatchBookedTripRef {
  id: number
  code: string | null
  clientName: string | null
  containers: BookedTripContainerItem[]
}

export interface AutoMatchCandidate {
  deliveredTripId: number
  bookedTripId: number
  score: number
  matchScore: number
  maxScore: number
  matchedFields: string[]
  criteria: AutoMatchCriterion[]
  suggestedDefault: boolean
  deliveredTripRef: AutoMatchDeliveredTripRef | null
  bookedTripRef: AutoMatchBookedTripRef | null
}

export interface UnmatchedDeliveredTripRef {
  id: number
  code: string | null
  plate: string | null
  date: string | null
}

export interface AutoMatchPreviewResponse {
  scannedDeliveredTripCount: number
  skippedAlreadyMatched: number
  candidates: AutoMatchCandidate[]
  unmatchedDeliveredTripRefs: UnmatchedDeliveredTripRef[]
  errors: string[]
}

export interface AutoMatchConfirmPair {
  deliveredTripId: number
  bookedTripId: number
}

export interface AutoMatchConfirmResult {
  deliveredTripId: number
  bookedTripId: number
  success: boolean
  error: string | null
}

export interface AutoMatchConfirmResponse {
  matched: AutoMatchConfirmResult[]
  failed: AutoMatchConfirmResult[]
  durationMs: number
}

export interface BulkMatchPair {
  deliveredTripId: number
  bookedTripId: number
}

export interface BulkMatchResult {
  deliveredTripId: number
  bookedTripId: number
  success: boolean
  error: string | null
}

export interface BulkMatchResponse {
  matched: BulkMatchResult[]
  errors: string[]
}

// ─── Batch Match for WO (1 WO → N BookedTrips) ──────────────────────────────────────

export interface BatchMatchForWOResult {
  bookedTripId: number
  success: boolean
  error: string | null
}

export interface BatchMatchForWOResponse {
  deliveredTripId: number
  results: BatchMatchForWOResult[]
}

export interface BatchMatchForTOResult {
  deliveredTripId: number
  success: boolean
  error: string | null
}

export interface BatchMatchForTOResponse {
  bookedTripId: number
  results: BatchMatchForTOResult[]
}

// ─── Reconciliation ────────────────────────────────────────────────────────────

export interface ReconciliationResult {
  containerNumber: string
  normalizedNumber: string
  deliveredTripId?: number
  bookedTripId?: number
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
  if (Math.abs(amount) >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M ₫'
  if (Math.abs(amount) >= 1_000) return (amount / 1_000).toFixed(1).replace(/\.0$/, '') + 'K ₫'
  return amount.toLocaleString('vi-VN') + ' ₫'
}

// formatCurrencyFull and formatCurrencyShort removed — identical to formatCurrency
// Use formatCurrency everywhere instead.
export { formatCurrency as formatCurrencyFull }
export { formatCurrency as formatCurrencyShort }

export function getJobStatusBadge(status: JobStatus): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  switch (status) {
    case 'DRAFT': return { variant: 'neutral', label: 'Nháp' }
    case 'PLANNED': return { variant: 'warning', label: 'Lên kế hoạch' }
    case 'IN_PROGRESS': return { variant: 'success', label: 'Đang chạy' }
    case 'COMPLETED': return { variant: 'success', label: 'Đã khớp' }
    case 'CANCELLED': return { variant: 'danger', label: 'Huỷ' }
  }
}

export function getBookedTripStatusBadge(status: BookedTripStatus): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  switch (status) {
    case 'DRAFT': return { variant: 'neutral', label: 'Nháp' }
    case 'PENDING': return { variant: 'warning', label: 'Chờ ghép' }
    case 'MATCHED': return { variant: 'success', label: 'Đã khớp' }
    case 'COMPLETED': return { variant: 'success', label: 'Hoàn thành' }
    case 'CONFIRMED': return { variant: 'info', label: 'Đã duyệt' }
    case 'CANCELLED': return { variant: 'danger', label: 'Huỷ' }
  }
}


