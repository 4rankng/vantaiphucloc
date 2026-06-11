import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query-keys'
import {
  previewVendorRoutePricingImport,
  commitVendorRoutePricingImport,
  type VendorRoutePricingImportCommitRow,
} from '@/services/api/vendorRoutePricings.api'

export function usePreviewVendorRoutePricingImport() {
  return useMutation({
    mutationFn: (file: File) => previewVendorRoutePricingImport(file),
  })
}

export function useCommitVendorRoutePricingImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: VendorRoutePricingImportCommitRow[]) =>
      commitVendorRoutePricingImport(rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vendorRoutePricings })
    },
  })
}
