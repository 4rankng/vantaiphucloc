import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useReconciliationImports(clientId?: number) {
  return useQuery({
    queryKey: queryKeys.reconciliationImports(clientId),
    queryFn: async () => {
      const res = await apiClient.listReconciliationImports(clientId)
      return res.success ? res.data : []
    },
  })
}


export function useReconciliationImport(importId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.reconciliationImport(importId ?? 0),
    queryFn: async () => {
      const res = await apiClient.getReconciliationImport(importId!)
      return res.success ? res.data : null
    },
    enabled: !!importId,
  })
}


export function usePreviewReconciliationImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      payload: Parameters<typeof apiClient.previewReconciliationImport>[0],
    ) => apiClient.previewReconciliationImport(payload).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reconciliation-imports'] })
    },
  })
}


export function useCommitReconciliationImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (importId: number) =>
      apiClient.commitReconciliationImport(importId).then(unwrap),
    onSuccess: (_data, importId) => {
      qc.invalidateQueries({ queryKey: ['reconciliation-imports'] })
      qc.invalidateQueries({ queryKey: queryKeys.reconciliationImport(importId) })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
    },
  })
}


export function useUpdateRowVerdict() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      importId,
      rowId,
      payload,
    }: {
      importId: number
      rowId: number
      payload: { action: 'accept' | 'dispute' | 'edit'; amount?: number | null; note?: string | null }
    }) => apiClient.updateRowVerdict(importId, rowId, payload).then(unwrap),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.reconciliationImport(vars.importId) })
    },
  })
}


export function useUploadCustomerResponse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      clientId,
      periodStart,
      periodEnd,
      file,
    }: {
      clientId: number
      periodStart: string
      periodEnd: string
      file: File
    }) =>
      apiClient.uploadCustomerResponse(clientId, periodStart, periodEnd, file).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reconciliation-imports'] })
    },
  })
}

