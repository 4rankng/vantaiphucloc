import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  autoMatchPreview,
  confirmAutoMatch,
  aiSuggestMatch,
  type AutoMatchPreviewResponse,
  type ConfirmMatchResponse,
  type AISuggestionResponse,
} from '@/services/api/autoMatch.api'
import { queryKeys } from '@/hooks/query-keys'

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
    Array<{ deliveredTripId: number; bookedTripId: number }>
  >({
    mutationFn: async (pairs) => {
      const res = await confirmAutoMatch(pairs)
      if (!res.success) throw new Error(res.error || 'Confirm matches failed')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
    },
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
