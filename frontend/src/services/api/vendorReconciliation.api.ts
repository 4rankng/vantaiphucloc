/**
 * Vendor (xe ngoài) reconciliation API.
 *
 * Workflow:
 *   1. POST /vendor-reconciliation/upload — multipart, returns import + totals
 *   2. GET  /vendor-reconciliation/       — list imports
 *   3. GET  /vendor-reconciliation/{id}   — import header + rows
 *   4. PATCH /vendor-reconciliation/{id}/rows/{rowId} — update row verdict
 *   5. POST /vendor-reconciliation/{id}/apply  — write vendor_amount to WOs
 *   6. DELETE /vendor-reconciliation/{id}       — discard
 */

import { api } from './client'
import { toCamel, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VendorImportStatus = 'PENDING_REVIEW' | 'APPLIED' | 'DISCARDED'
export type VendorRowMatchStatus = 'MATCHED' | 'VENDOR_ONLY' | 'OUR_ONLY' | 'DISPUTED' | 'IGNORED'

export interface VendorReconRow {
  id: number
  importId: number
  containerNumber: string | null
  workType: string | null
  routeText: string | null
  tripDate: string | null
  vendorAmount: number | null
  matchStatus: VendorRowMatchStatus
  matchedWorkOrderId: number | null
  reviewerNote: string | null
}

export interface VendorReconTotals {
  total: number
  matched: number
  vendorOnly: number
  ourOnly: number
  disputed: number
}

export interface VendorReconImport {
  id: number
  vendorId: number
  vendorPartnerName: string
  periodFrom: string
  periodTo: string
  sourceFilename: string | null
  status: VendorImportStatus
  totals: VendorReconTotals | null
  notes: string | null
  uploadedAt: string
  uploadedBy: number | null
  appliedAt: string | null
  appliedBy: number | null
  rows: VendorReconRow[]
}

export interface UploadResult {
  importId: number
  vendorId: number
  status: VendorImportStatus
  totals: VendorReconTotals | null
  rowCount: number
}

export interface RowUpdatePayload {
  matchStatus?: VendorRowMatchStatus
  reviewerNote?: string | null
  matchedWorkOrderId?: number | null
  vendorAmount?: number | null
}

export interface ApplyResult {
  applied: number
  skipped: number
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function exportVendorTripsExcel(
  vendorId: number,
  dateFrom: string,
  dateTo: string,
): Promise<Blob> {
  const res = await api.get('/vendor-reconciliation/export', {
    params: { vendor_id: vendorId, date_from: dateFrom, date_to: dateTo },
    responseType: 'blob',
  })
  return res.data as Blob
}

export async function uploadVendorReconciliation(
  file: File,
  vendorId: number,
  periodFrom: string,
  periodTo: string,
  notes?: string,
): Promise<ApiResponse<UploadResult>> {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('vendor_id', String(vendorId))
    form.append('period_from', periodFrom)
    form.append('period_to', periodTo)
    if (notes) form.append('notes', notes)
    const res = await api.post('/vendor-reconciliation/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return ok(toCamel<UploadResult>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function listVendorReconciliationImports(
  vendorId?: number,
): Promise<ApiResponse<VendorReconImport[]>> {
  try {
    const params: Record<string, unknown> = {}
    if (vendorId != null) params.vendor_id = vendorId
    const res = await api.get('/vendor-reconciliation/', { params })
    return ok(toCamel<VendorReconImport[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getVendorReconciliationImport(
  importId: number,
): Promise<ApiResponse<VendorReconImport>> {
  try {
    const res = await api.get(`/vendor-reconciliation/${importId}`)
    return ok(toCamel<VendorReconImport>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateVendorReconRow(
  importId: number,
  rowId: number,
  payload: RowUpdatePayload,
): Promise<ApiResponse<Partial<VendorReconRow>>> {
  try {
    const body: Record<string, unknown> = {}
    if (payload.matchStatus !== undefined) body.match_status = payload.matchStatus
    if (payload.reviewerNote !== undefined) body.reviewer_note = payload.reviewerNote
    if (payload.matchedWorkOrderId !== undefined) body.matched_work_order_id = payload.matchedWorkOrderId
    if (payload.vendorAmount !== undefined) body.vendor_amount = payload.vendorAmount
    const res = await api.patch(`/vendor-reconciliation/${importId}/rows/${rowId}`, body)
    return ok(toCamel<Partial<VendorReconRow>>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function applyVendorReconciliation(
  importId: number,
): Promise<ApiResponse<ApplyResult>> {
  try {
    const res = await api.post(`/vendor-reconciliation/${importId}/apply`)
    return ok(toCamel<ApplyResult>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function discardVendorReconciliation(
  importId: number,
): Promise<ApiResponse<void>> {
  try {
    await api.delete(`/vendor-reconciliation/${importId}`)
    return ok(undefined)
  } catch (err) {
    return fail(err)
  }
}
