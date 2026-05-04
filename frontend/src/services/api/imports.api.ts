import { api } from './client'

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
    tractor_plate?: string
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
  tractor_plate?: string
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
  skipped_duplicates: number
  errors: string[]
  template_id?: number | null
}

export interface SavedTemplate {
  id: number
  client_id: number | null
  template_name: string
  structure_hash: string
  sheet_name: string
  header_row_index: number
  last_used_at: string
  column_count: number
}

// ──────────────────────────────────────────────────────────────────────────
// API
// ──────────────────────────────────────────────────────────────────────────

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

export async function listImportTemplates(clientId: number): Promise<SavedTemplate[]> {
  const res = await api.get('/imports/customer-excel/templates', { params: { client_id: clientId } })
  return res.data as SavedTemplate[]
}
