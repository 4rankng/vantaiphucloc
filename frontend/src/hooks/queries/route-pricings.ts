import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse, RoutePricing, PaginatedResult } from '@/data/domain'
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
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: queryKeys.routePricingsFiltered(filters),
    queryFn: async () => {
      const res = await apiClient.getRoutePricings({
        page: filters?.page,
        pageSize: filters?.pageSize ?? 100,
        clientId: filters?.clientId,
        workType: filters?.workType,
      })
      return res
    },
  })
}

export function useCreateRoutePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RoutePricingCreatePayload) =>
      apiClient.createRoutePricing(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.routePricings })
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
      await qc.cancelQueries({ queryKey: queryKeys.routePricings })
      const previous = qc.getQueriesData<PaginatedResult<RoutePricing>>({
        queryKey: queryKeys.routePricings,
      })
      qc.setQueriesData<PaginatedResult<RoutePricing>>({ queryKey: queryKeys.routePricings }, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((rp) =>
            rp.id === id
              ? {
                  ...rp,
                  ...data,
                  pickupLocation: data.pickupLocationId ? rp.pickupLocation : rp.pickupLocation,
                  dropoffLocation: data.dropoffLocationId ? rp.dropoffLocation : rp.dropoffLocation,
                }
              : rp,
          ),
        }
      })
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
      qc.invalidateQueries({ queryKey: queryKeys.routePricings })
    },
  })
}

export function useDeleteRoutePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteRoutePricing(id).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.routePricings })
    },
  })
}
