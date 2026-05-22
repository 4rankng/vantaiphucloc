import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useVendorReconImports(vendorId?: number) {
  return useQuery({
    queryKey: queryKeys.vendorReconImports(vendorId),
    queryFn: () => listVendorReconciliationImports(vendorId).then(r => r.success ? r.data : []),
  })
}


export function useVendorReconImport(importId: number | null) {
  return useQuery({
    queryKey: queryKeys.vendorReconImport(importId ?? 0),
    queryFn: () => getVendorReconciliationImport(importId!).then(r => r.success ? r.data : null),
    enabled: importId != null,
  })
}


export function useUploadVendorReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      file: File
      vendorId: number
      periodFrom: string
      periodTo: string
      notes?: string
    }) => uploadVendorReconciliation(args.file, args.vendorId, args.periodFrom, args.periodTo, args.notes).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
    },
  })
}


export function useUpdateVendorReconRow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ importId, rowId, payload }: { importId: number; rowId: number; payload: RowUpdatePayload }) =>
      updateVendorReconRow(importId, rowId, payload).then(unwrap),
    onSuccess: (_data, { importId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.vendorReconImport(importId) })
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
    },
  })
}


export function useApplyVendorReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (importId: number) => applyVendorReconciliation(importId).then(unwrap),
    onSuccess: (_data, importId) => {
      qc.invalidateQueries({ queryKey: queryKeys.vendorReconImport(importId) })
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
      qc.invalidateQueries({ queryKey: ['vendor-summary'] })
    },
  })
}


export function useDiscardVendorReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (importId: number) => discardVendorReconciliation(importId).then(unwrap),
    onSuccess: (_data, importId) => {
      qc.invalidateQueries({ queryKey: queryKeys.vendorReconImport(importId) })
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
    },
  })
}


export function useExportVendorTrips() {
  return useMutation({
    mutationFn: async (args: { vendorId: number; dateFrom: string; dateTo: string }) => {
      const blob = await exportVendorTripsExcel(args.vendorId, args.dateFrom, args.dateTo)
      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DoiSoat_NhaXe_${args.vendorId}_${args.dateFrom}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  })
}

