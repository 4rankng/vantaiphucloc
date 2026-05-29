import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { invalidateDeliveredTripDeps } from '@/hooks/query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useBulkImportAndMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, clientId }: { file: File; clientId?: number }) =>
      apiClient.bulkImportAndMatch(file, clientId).then(unwrap),
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}


export function useParsePreview() {
  return useMutation({
    mutationFn: ({ file }: { file: File }) =>
      apiClient.parsePreview(file).then(unwrap),
  })
}

export function usePreviewCustomerExcel() {
  return useMutation({
    mutationFn: (args: {
      file: File
      clientId?: number
      defaultTripDate?: string
      sheetName?: string
      headerRowIndex?: number
    }) => apiClient.previewCustomerExcel(args),
  })
}

export function useCommitCustomerExcel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof apiClient.commitCustomerExcel>[0]) =>
      apiClient.commitCustomerExcel(body),
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}

export function useUploadVendorReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, vendorId }: { file: File; vendorId: number }) =>
      apiClient.uploadVendorReconciliation(file, vendorId).then(unwrap),
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}

export function usePreviewVendorReconciliation() {
  return useMutation({
    mutationFn: ({ file, vendorId }: { file: File; vendorId: number }) =>
      apiClient.previewVendorReconciliation(file, vendorId).then(unwrap),
  })
}

export function useCommitVendorReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { vendorId: number; rows: Record<string, unknown>[] }) =>
      apiClient.commitVendorReconciliation(body.vendorId, body.rows).then(unwrap),
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}

export function useUploadDriverReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file }: { file: File }) =>
      apiClient.uploadDriverReconciliation(file).then(unwrap),
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}

export function usePreviewDriverReconciliation() {
  return useMutation({
    mutationFn: ({ file }: { file: File }) =>
      apiClient.previewDriverReconciliation(file).then(unwrap),
  })
}

export function useCommitDriverReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { rows: Record<string, unknown>[] }) =>
      apiClient.commitDriverReconciliation(body.rows).then(unwrap),
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}


export function useExportDoiSoatExcel() {
  return useMutation({
    mutationFn: (params: { clientId: number; dateFrom: string; dateTo: string }) =>
      apiClient.exportDoiSoatExcel(params.clientId, params.dateFrom, params.dateTo),
  })
}


export function useToggleTripConfirmation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookedTripId: number) => apiClient.toggleTripConfirmation(bookedTripId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
    },
  })
}
