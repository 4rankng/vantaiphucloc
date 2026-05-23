import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'
import type {
  VendorRoutePricingCreatePayload,
  VendorRoutePricingUpdatePayload,
} from '@/services/api/vendorRoutePricings.api'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useVendorRoutePricings(filters?: {
  vendorId?: number
  workType?: string
}) {
  return useQuery({
    queryKey: queryKeys.vendorRoutePricingsFiltered(filters),
    queryFn: async () => {
      const res = await apiClient.getVendorRoutePricings(filters)
      return res.items ?? []
    },
  })
}

export function useCreateVendorRoutePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: VendorRoutePricingCreatePayload) =>
      apiClient.createVendorRoutePricing(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-route-pricings'] })
    },
  })
}

export function useUpdateVendorRoutePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: VendorRoutePricingUpdatePayload
    }) => apiClient.updateVendorRoutePricing(id, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-route-pricings'] })
    },
  })
}

export function useDeleteVendorRoutePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteVendorRoutePricing(id).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-route-pricings'] })
    },
  })
}
