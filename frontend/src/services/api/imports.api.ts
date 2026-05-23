import { api } from './client'
import { toCamel, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'


// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface CanonicalFieldDef {
  name: string
  label: string
  required: boolean
  description: string
}

export interface CanonicalSchema {
  fields: CanonicalFieldDef[]
  skip_field: string
}

export interface ColumnMappingDto {
  column_index: number
  header_text: string
  canonical_field: string | null
  confidence: number
  source: string
  reason: string
  sample_values: string[]
}

export interface ParsedRowDto {
  source_row_index: number
  values: {
    container_no: string
    container_size: string
    freight_kind: string
    work_type: string
    container_type_iso?: string
    gross_weight_kg?: number | null
    seal_no?: string
    pickup_location?: string
    dropoff_location?: string
    pickup_date?: string | null
    dropoff_date?: string | null
    trip_date?: string | null
    customer_ref?: string
    consignee?: string
    commodity?: string
    driver_name?: string
    vessel?: string
    freight_charge?: number | null
    remarks?: string
  }
}

export interface RejectedRowDto {
  source_row_index: number
  reasons: string[]
  raw: Record<string, unknown>
}

export interface LocationResolutionDto {
  raw: string
  match_kind: 'exact_name' | 'exact_alias' | 'fuzzy_auto' | 'fuzzy_ambiguous' | 'new'
  location_id: number | null
  location_name: string | null
  review_needed: boolean
  suggestions: { location_id: number; name: string; score: number }[]
}

export interface PreviewResultDto {
  filename: string
  sheet_name: string
  sheet_alternatives: { sheet_name: string; score: number; container_hits: number; header_synonym_hits: number }[]
  header_row_index: number
  structure_hash: string
  column_mappings: ColumnMappingDto[]
  accepted: ParsedRowDto[]
  rejected: RejectedRowDto[]
  stats: Record<string, number>
  warnings: string[]
  template_used?: boolean
  location_resolutions?: Record<string, LocationResolutionDto>
}

export interface CommitRow {
  container_no: string
  container_size: string
  freight_kind: string
  work_type: string
  container_type_iso?: string
  gross_weight_kg?: number | null
  seal_no?: string
  pickup_location?: string
  dropoff_location?: string
  pickup_date?: string | null
  dropoff_date?: string | null
  trip_date: string
  customer_ref?: string
  consignee?: string
  commodity?: string
  driver_name?: string
  vessel?: string
  freight_charge?: number | null
  remarks?: string
}

export interface CommitRequest {
  client_id: number
  rows: CommitRow[]
  overwrite_duplicates?: boolean
  save_template_as?: string
  structure_hash?: string
  sheet_name?: string
  header_row_index?: number
  column_mapping?: ColumnMappingDto[]
}

export interface CommitResponse {
  created: number
  containers_created?: number
  grouped_trips?: number
  skipped_duplicates: number
  locations_created?: number
  locations_review_flagged?: number
  errors: string[]
  template_id?: number | null
  created_trip_ids?: number[]
}

export interface ApplyPricingByIdsResponse {
  priced: number
  unpriced: number
  unpriced_trip_ids: number[]
}

// ──────────────────────────────────────────────────────────────────────────
// API
// ──────────────────────────────────────────────────────────────────────────

export interface SheetInfo {
  name: string
  score: number
  container_hits: number
  n_rows: number
  is_auto_selected: boolean
}

export async function listExcelSheets(file: File): Promise<SheetInfo[]> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post('/imports/customer-excel/sheets', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data as SheetInfo[]
}

export async function getCanonicalSchema(): Promise<CanonicalSchema> {
  const res = await api.get('/imports/customer-excel/schema')
  return res.data as CanonicalSchema
}

export async function previewCustomerExcel(args: {
  file: File
  clientId?: number
  defaultTripDate?: string
  sheetName?: string
  headerRowIndex?: number
}): Promise<PreviewResultDto> {
  const fd = new FormData()
  fd.append('file', args.file)
  if (args.clientId != null) fd.append('client_id', String(args.clientId))
  if (args.defaultTripDate) fd.append('default_trip_date', args.defaultTripDate)
  if (args.sheetName) fd.append('sheet_name', args.sheetName)
  if (args.headerRowIndex != null) fd.append('header_row_index', String(args.headerRowIndex))
  const res = await api.post('/imports/customer-excel/preview', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data as PreviewResultDto
}

export async function commitCustomerExcel(body: CommitRequest): Promise<CommitResponse> {
  const res = await api.post('/imports/customer-excel/commit', body)
  return res.data as CommitResponse
}

export async function applyPricingToTripIds(
  tripIds: number[],
): Promise<ApplyPricingByIdsResponse> {
  const res = await api.post('/imports/customer-excel/apply-pricing', {
    trip_ids: tripIds,
  })
  return res.data as ApplyPricingByIdsResponse
}

// ──────────────────────────────────────────────────────────────────────────
// Customer pricing (bảng giá) import
// ──────────────────────────────────────────────────────────────────────────

export type PricingFormat = 'pan' | 'hap' | 'newway'

export interface PricingPreviewRow {
  pickup_location: string
  dropoff_location: string
  work_type: string
  unit_price: number
  old_unit_price?: number | null
  quantity: number
  driver_salary: number
  allowance: number
  note: string
}

export interface PricingPreviewResponse {
  filename: string
  format: PricingFormat
  sheet_name: string
  rows: PricingPreviewRow[]
  warnings: string[]
  stats: { row_count: number; unique_routes: number }
  location_resolutions: Record<string, LocationResolutionDto>
  supported_formats: PricingFormat[]
}

export interface PricingCommitRequest {
  client_id: number
  rows: PricingPreviewRow[]
  update_existing_lines?: boolean
}

export interface PricingCommitResponse {
  pricings_created: number
  pricings_existing: number
  lines_created: number
  lines_updated: number
  lines_existing: number
  skipped_no_locations: number
  locations_created: number
}

export async function previewCustomerPricing(args: {
  file: File
  format?: PricingFormat
  clientId?: number
}): Promise<PricingPreviewResponse> {
  const fd = new FormData()
  fd.append('file', args.file)
  if (args.format) fd.append('format', args.format)
  if (args.clientId) fd.append('client_id', String(args.clientId))
  const res = await api.post('/imports/customer-pricing/preview', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data as PricingPreviewResponse
}

export async function commitCustomerPricing(
  body: PricingCommitRequest,
): Promise<PricingCommitResponse> {
  const res = await api.post('/imports/customer-pricing/commit', body)
  return res.data as PricingCommitResponse
}

export interface VendorImportResponse {
  totalRows: number
  created: number
  matched: number
  fraudSkipped: number
  errors: string[]
  details: Record<string, unknown>[]
}

export async function uploadVendorReconciliation(file: File, vendorId: number): Promise<ApiResponse<VendorImportResponse>> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('vendor_id', String(vendorId))
    const res = await api.post('/vendor-reconciliation/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<VendorImportResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function previewVendorReconciliation(
  file: File,
  vendorId: number,
): Promise<ApiResponse<PreviewResultDto>> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('vendor_id', String(vendorId))
    const res = await api.post('/vendor-reconciliation/preview', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<PreviewResultDto>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function commitVendorReconciliation(
  vendorId: number,
  rows: Record<string, unknown>[],
): Promise<ApiResponse<VendorImportResponse>> {
  try {
    const res = await api.post('/vendor-reconciliation/commit', {
      vendor_id: vendorId,
      rows,
    })
    return ok(toCamel<VendorImportResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export interface DriverImportResponse {
  totalRows: number
  created: number
  matched: number
  fraudSkipped: number
  errors: string[]
  details: Record<string, unknown>[]
}

export interface DriverCommitResponse {
  created: number
  matched: number
  fraudSkipped: number
  errors: string[]
  details: Record<string, unknown>[]
}

export async function uploadDriverReconciliation(file: File): Promise<ApiResponse<DriverImportResponse>> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post('/driver-reconciliation/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<DriverImportResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function previewDriverReconciliation(file: File): Promise<ApiResponse<PreviewResultDto>> {
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post('/driver-reconciliation/preview', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<PreviewResultDto>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function commitDriverReconciliation(
  rows: Record<string, unknown>[],
): Promise<ApiResponse<DriverCommitResponse>> {
  try {
    const res = await api.post('/driver-reconciliation/commit', { rows })
    return ok(toCamel<DriverCommitResponse>(res.data))
  } catch (err) {
    return fail(err)
  }
}

