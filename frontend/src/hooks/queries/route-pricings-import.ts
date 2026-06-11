import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query-keys'
import {
  previewRoutePricingImport,
  commitRoutePricingImport,
  type RoutePricingImportCommitRow,
} from '@/services/api/routePricings.api'

export function usePreviewRoutePricingImport() {
  return useMutation({
    mutationFn: (file: File) => previewRoutePricingImport(file),
  })
}

export function useCommitRoutePricingImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rows: RoutePricingImportCommitRow[]) =>
      commitRoutePricingImport(rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.routePricings })
    },
  })
}
