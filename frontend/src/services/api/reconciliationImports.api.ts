/**
 * Customer reconciliation import API.
 *
 * Workflow:
 *   1. Frontend (or future Excel parser) produces `ParsedRow[]` from the
 *      customer's reply file.
 *   2. POST /preview persists rows + resolves each to a TripOrder id by
 *      (client_id, container_number, trip_date).
 *   3. POST /{id}/commit marks the import as APPLIED.
 */

import { api } from './client'
import { toCamel, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

export type CustomerVerdict = 'MATCHED' | 'REJECTED' | 'UNKNOWN'
export type ImportStatus = 'PARSED' | 'APPLIED'
export type RowApplyStatus = 'PENDING' | 'APPLIED' | 'UNRESOLVED' | 'FAILED' | 'SKIPPED' | 'DISPUTED' | 'EDITED'
export type DiffClassification = 'ok' | 'rejected' | 'amount_changed' | 'container_changed' | 'added' | 'missing' | 'unknown' | null

export interface ParsedRowInput {
  containerNumber: string | null
  tripDate: string | null
  customerStatus: CustomerVerdict
  customerNote?: string | null
  customerAmount?: number | null
}

export interface ImportPreviewRequest {
  clientId: number
  periodStart: string
  periodEnd: string
  sourceFilename?: string | null
  rows: ParsedRowInput[]
}

export interface ReconciliationRow {
  id: number
  containerNumber: string | null
  tripDate: string | null
  customerStatus: CustomerVerdict
  customerNote: string | null
  resolvedTripOrderId: number | null
  applyStatus: RowApplyStatus
  applyMessage: string | null
  diffClassification: DiffClassification
  customerAmount: number | null
  ourAmount: number | null
}

export interface ReconciliationImport {
  id: number
  clientId: number
  clientName: string | null
  periodStart: string
  periodEnd: string
  sourceFilename: string | null
  status: ImportStatus
  summary: {
    total?: number
    matched?: number
    rejected?: number
    unknown?: number
    resolved?: number
    unresolved?: number
    missing?: number
    amountChanged?: number
  } | null
  uploadedAt: string
  appliedAt: string | null
  rows: ReconciliationRow[]
}

export async function previewReconciliationImport(
  payload: ImportPreviewRequest,
): Promise<ApiResponse<ReconciliationImport>> {
  try {
    const res = await api.post('/reconcile/customer-files/preview', {
      client_id: payload.clientId,
      period_start: payload.periodStart,
      period_end: payload.periodEnd,
      source_filename: payload.sourceFilename ?? null,
      rows: payload.rows.map((r) => ({
        container_number: r.containerNumber,
        trip_date: r.tripDate,
        customer_status: r.customerStatus,
        customer_note: r.customerNote ?? null,
      })),
    })
    return ok(toCamel<ReconciliationImport>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function commitReconciliationImport(
  importId: number,
): Promise<ApiResponse<ReconciliationImport>> {
  try {
    const res = await api.post(`/reconcile/customer-files/${importId}/commit`)
    return ok(toCamel<ReconciliationImport>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function listReconciliationImports(
  clientId?: number,
  limit = 50,
): Promise<ApiResponse<ReconciliationImport[]>> {
  try {
    const params: Record<string, number> = { limit }
    if (clientId != null) params.client_id = clientId
    const res = await api.get('/reconcile/customer-files', { params })
    return ok(toCamel<ReconciliationImport[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getReconciliationImport(
  importId: number,
): Promise<ApiResponse<ReconciliationImport>> {
  try {
    const res = await api.get(`/reconcile/customer-files/${importId}`)
    return ok(toCamel<ReconciliationImport>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export interface RowVerdictPayload {
  action: 'accept' | 'dispute' | 'edit'
  amount?: number | null
  note?: string | null
}

export async function updateRowVerdict(
  importId: number,
  rowId: number,
  payload: RowVerdictPayload,
): Promise<ApiResponse<ReconciliationRow>> {
  try {
    const res = await api.patch(
      `/reconcile/customer-files/${importId}/rows/${rowId}`,
      {
        action: payload.action,
        amount: payload.amount ?? null,
        note: payload.note ?? null,
      },
    )
    return ok(toCamel<ReconciliationRow>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function uploadCustomerResponse(
  clientId: number,
  periodStart: string,
  periodEnd: string,
  file: File,
): Promise<ApiResponse<ReconciliationImport>> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post(
      `/reconcile/customer-files/upload-response?client_id=${clientId}&period_start=${periodStart}&period_end=${periodEnd}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return ok(toCamel<ReconciliationImport>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export function getExportDoiSoatUrl(
  clientId: number,
  dateFrom: string,
  dateTo: string,
): string {
  const base = import.meta.env.VITE_API_BASE || '/api/v1'
  return `${base}/trip-orders/export-doi-soat?client_id=${clientId}&date_from=${dateFrom}&date_to=${dateTo}`
}
