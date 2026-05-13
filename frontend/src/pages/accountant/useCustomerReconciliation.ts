/**
 * State + handlers for the CustomerReconciliation page.
 *
 * Owns the upload form (partner / period / parsed rows) and the
 * preview/commit mutations. The page .tsx stays declarative.
 */

import { useCallback, useState } from 'react'
import { useToast } from '@/components/atoms/Toast'
import {
  useCommitReconciliationImport,
  usePartners,
  usePreviewReconciliationImport,
  useReconciliationImports,
} from '@/hooks/use-queries'
import type {
  ParsedRowInput,
  ReconciliationImport,
} from '@/services/api/reconciliationImports.api'

/**
 * Until the file parser ships, we let the accountant paste rows as
 * tab/comma-separated text (one row per line). Format:
 *   container_number, trip_date (YYYY-MM-DD), KHỚP|TỪ_CHỐI|KHÔNG_RÕ, optional note
 *
 * Also accepts English: MATCHED|REJECTED|UNKNOWN.
 * This keeps the API surface stable so the Excel parser can plug in later
 * by emitting the same `ParsedRowInput[]` shape.
 */

const VI_STATUS_MAP: Record<string, ParsedRowInput['customerStatus']> = {
  MATCHED: 'MATCHED',
  REJECTED: 'REJECTED',
  UNKNOWN: 'UNKNOWN',
  KHỚP: 'MATCHED',
  KHÓP: 'MATCHED',
  'TỪ_CHỐI': 'REJECTED',
  'TỪ_CHỐI': 'REJECTED',
  'TỪ CHỐI': 'REJECTED',
  'TỪ CHỐI': 'REJECTED',
  'KHÔNG_RÕ': 'UNKNOWN',
  'KHÔNG RÕ': 'UNKNOWN',
  KHÔNGRO: 'UNKNOWN',
}

function normalizeStatus(raw: string): ParsedRowInput['customerStatus'] | null {
  const key = raw.trim().toUpperCase().replace(/\s+/g, ' ')
  return VI_STATUS_MAP[key] ?? VI_STATUS_MAP[key.replace(/ /g, '_')] ?? null
}

export function parseRowsFromText(raw: string): ParsedRowInput[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const rows: ParsedRowInput[] = []
  for (const line of lines) {
    const parts = line.split(/[\t,;]/).map((p) => p.trim())
    if (parts.length < 3) continue
    const [container, tripDate, status, ...rest] = parts
    const normalized = normalizeStatus(status)
    if (!normalized) continue
    rows.push({
      containerNumber: container || null,
      tripDate: tripDate || null,
      customerStatus: normalized,
      customerNote: rest.join(' ').trim() || null,
    })
  }
  return rows
}

export function useCustomerReconciliation() {
  const toast = useToast()

  const [partnerId, setPartnerId] = useState<number | null>(null)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [filename, setFilename] = useState('')
  const [rawRows, setRawRows] = useState('')
  const [preview, setPreview] = useState<ReconciliationImport | null>(null)

  const { data: partners = [], isLoading: loadingPartners } = usePartners({
    partnerType: 'client',
  })
  const { data: history = [], isLoading: loadingHistory } =
    useReconciliationImports(partnerId ?? undefined)

  const previewMutation = usePreviewReconciliationImport()
  const commitMutation = useCommitReconciliationImport()

  const handlePreview = useCallback(async () => {
    if (!partnerId || !periodStart || !periodEnd) {
      toast.error('Thiếu thông tin', 'Chọn khách hàng và kỳ trước khi gửi')
      return
    }
    const rows = parseRowsFromText(rawRows)
    if (rows.length === 0) {
      toast.error('Không có dòng nào', 'Vui lòng dán dữ liệu hợp lệ')
      return
    }
    try {
      const result = await previewMutation.mutateAsync({
        partnerId,
        periodStart,
        periodEnd,
        sourceFilename: filename || null,
        rows,
      })
      setPreview(result)
      toast.success(
        'Đã phân tích',
        `${result.summary?.resolved ?? 0}/${result.summary?.total ?? 0} dòng tìm thấy chuyến khớp`,
      )
    } catch (e) {
      toast.error('Lỗi', e instanceof Error ? e.message : 'Không thể phân tích')
    }
  }, [
    filename,
    partnerId,
    periodEnd,
    periodStart,
    previewMutation,
    rawRows,
    toast,
  ])

  const handleCommit = useCallback(async () => {
    if (!preview) return
    try {
      const result = await commitMutation.mutateAsync(preview.id)
      setPreview(result)
      toast.success('Đã ghi nhận đối soát')
    } catch (e) {
      toast.error('Lỗi', e instanceof Error ? e.message : 'Không thể commit')
    }
  }, [commitMutation, preview, toast])

  const reset = useCallback(() => {
    setPartnerId(null)
    setPeriodStart('')
    setPeriodEnd('')
    setFilename('')
    setRawRows('')
    setPreview(null)
  }, [])

  return {
    fields: {
      partnerId,
      periodStart,
      periodEnd,
      filename,
      rawRows,
    },
    setPartnerId,
    setPeriodStart,
    setPeriodEnd,
    setFilename,
    setRawRows,
    partners,
    loadingPartners,
    history,
    loadingHistory,
    preview,
    isPreviewing: previewMutation.isPending,
    isCommitting: commitMutation.isPending,
    handlePreview,
    handleCommit,
    reset,
  }
}
