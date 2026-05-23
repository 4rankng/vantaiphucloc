import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse, RoutePricing } from '@/data/domain'
import type {
  RoutePricingCreatePayload,
  RoutePricingUpdatePayload,
} from '@/services/api/routePricings.api'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useRoutePricings(filters?: {
  clientId?: number
  workType?: string
}) {
  return useQuery({
    queryKey: queryKeys.routePricingsFiltered(filters),
    queryFn: async () => {
      const res = await apiClient.getRoutePricings(filters)
      return res.items ?? []
    },
  })
}

export function useCreateRoutePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RoutePricingCreatePayload) =>
      apiClient.createRoutePricing(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-pricings'] })
    },
  })
}

export function useUpdateRoutePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: RoutePricingUpdatePayload
    }) => apiClient.updateRoutePricing(id, data).then(unwrap),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['route-pricings'] })
      const previous = qc.getQueriesData<RoutePricing[]>({
        queryKey: ['route-pricings'],
      })
      qc.setQueriesData<RoutePricing[]>({ queryKey: ['route-pricings'] }, (old) =>
        old?.map((rp) =>
          rp.id === id
            ? { ...rp, ...data, pickupLocation: data.pickupLocationId ? rp.pickupLocation : rp.pickupLocation, dropoffLocation: data.dropoffLocationId ? rp.dropoffLocation : rp.dropoffLocation }
            : rp,
        ),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-pricings'] })
    },
  })
}

export function useDeleteRoutePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteRoutePricing(id).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['route-pricings'] })
    },
  })
}
