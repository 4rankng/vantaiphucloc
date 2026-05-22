import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function usePricings(filters?: { clientId?: number; workType?: ContType; route?: string; pickupLocationId?: number; dropoffLocationId?: number }) {
  return useQuery({
    queryKey: queryKeys.pricingsFiltered(filters),
    queryFn: async () => {
      const res = await apiClient.getPricings(filters)
      return res.success ? res.data : []
    },
  })
}


export function useCreatePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PricingCreatePayload) => apiClient.createPricing(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricings'] }) },
  })
}


export function useUpdatePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PricingUpdatePayload }) => apiClient.updatePricing(id, data).then(unwrap),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['pricings'] })
      const previous = qc.getQueriesData<Pricing[]>({ queryKey: ['pricings'] })
      qc.setQueriesData<Pricing[]>({ queryKey: ['pricings'] }, (old) =>
        old?.map(p => p.id === id ? { ...p, ...data } : p),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricings'] }) },
  })
}


export function useDeletePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deletePricing(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricings'] }) },
  })
}


export function usePreviewPricing() {
  return useMutation({
    mutationFn: (args: { file: File; format?: PricingFormat; clientId?: number }) =>
      apiClient.previewCustomerPricing(args),
  })
}


export function useCommitPricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PricingCommitRequest) => apiClient.commitCustomerPricing(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricings'] })
    },
  })
}

