import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  autoMatchPreview,
  confirmAutoMatch,
  aiSuggestMatch,
  unmatchTrip,
  syncPricing,
  type AutoMatchPreviewResponse,
  type ConfirmMatchResponse,
  type AISuggestionResponse,
  type UnmatchResponse,
  type SyncPricingResponse,
} from '@/services/api/autoMatch.api'
import { queryKeys, invalidateDeliveredTripDeps } from '@/hooks/query-keys'

export function useAutoMatchPreview() {
  return useMutation<AutoMatchPreviewResponse, Error, { dateFrom?: string; dateTo?: string }>({
    mutationFn: async (params) => {
      const res = await autoMatchPreview(params)
      if (!res.success) throw new Error(res.error || 'Auto-match preview failed')
      return res.data
    },
  })
}

export function useConfirmAutoMatch() {
  const qc = useQueryClient()
  return useMutation<
    ConfirmMatchResponse,
    Error,
    Array<{
      deliveredTripId: number
      bookedTripId: number
      syncSource?: string | null
      fieldChoices?: Record<string, 'delivered' | 'booked'> | null
    }>
  >({
    mutationFn: async (pairs) => {
      const res = await confirmAutoMatch(pairs)
      if (!res.success) throw new Error(res.error || 'Confirm matches failed')
      return res.data
    },
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}

export function useAISuggestMatch() {
  return useMutation<AISuggestionResponse, Error, number>({
    mutationFn: async (deliveredTripId) => {
      const res = await aiSuggestMatch(deliveredTripId)
      if (!res.success) throw new Error(res.error || 'AI Suggestion failed')
      return res.data
    },
  })
}

export function useUnmatchTrip() {
  const qc = useQueryClient()
  return useMutation<UnmatchResponse, Error, number>({
    mutationFn: async (deliveredTripId) => {
      const res = await unmatchTrip(deliveredTripId)
      if (!res.success) throw new Error(res.error || 'Unmatch failed')
      return res.data
    },
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}

export function useSyncPricing() {
  const qc = useQueryClient()
  return useMutation<SyncPricingResponse, Error, { dateFrom: string; dateTo: string }>({
    mutationFn: async (params) => {
      const res = await syncPricing(params)
      if (!res.success) throw new Error(res.error || 'Sync pricing failed')
      return res.data
    },
    onSuccess: () => invalidateDeliveredTripDeps(qc),
  })
}
