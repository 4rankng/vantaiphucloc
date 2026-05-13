/**
 * Customer reconciliation import API.
 *
 * Workflow:
 *   1. Frontend (or future Excel parser) produces `ParsedRow[]` from the
 *      customer's reply file.
 *   2. POST /preview persists rows + resolves each to a TripOrder id by
 *      (partner_id, container_number, trip_date).
 *   3. POST /{id}/commit marks the import as APPLIED.
 */

import { api } from './client'
import { toCamel, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

export type CustomerVerdict = 'MATCHED' | 'REJECTED' | 'UNKNOWN'
export type ImportStatus = 'PARSED' | 'APPLIED'
export type RowApplyStatus = 'PENDING' | 'APPLIED' | 'UNRESOLVED' | 'FAILED' | 'SKIPPED'

export interface ParsedRowInput {
  containerNumber: string | null
  tripDate: string | null
  customerStatus: CustomerVerdict
  customerNote?: string | null
}

export interface ImportPreviewRequest {
  partnerId: number
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
}

export interface ReconciliationImport {
  id: number
  partnerId: number
  partnerName: string | null
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
      partner_id: payload.partnerId,
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
  partnerId?: number,
  limit = 50,
): Promise<ApiResponse<ReconciliationImport[]>> {
  try {
    const params: Record<string, number> = { limit }
    if (partnerId != null) params.partner_id = partnerId
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
