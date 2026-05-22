import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useReconcile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deliveredTripId, bookedTripId }: { deliveredTripId: number; bookedTripId: number }) =>
      apiClient.reconcile(deliveredTripId, bookedTripId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useUnmatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deliveredTripId, bookedTripId }: { deliveredTripId: number; bookedTripId: number }) =>
      apiClient.unmatch(deliveredTripId, bookedTripId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useSuggestMatches(deliveredTripId: number | null) {
  return useQuery({
    queryKey: queryKeys.suggestMatches(deliveredTripId!),
    queryFn: async () => {
      const res = await apiClient.suggestMatches(deliveredTripId!)
      return res.success ? res.data : null
    },
    enabled: deliveredTripId !== null,
  })
}


export function useSuggestWosForTrip(bookedTripId: number | null) {
  return useQuery({
    queryKey: queryKeys.suggestWos(bookedTripId!),
    queryFn: async () => {
      const res = await apiClient.suggestWosForTrip(bookedTripId!)
      return res.success ? res.data : null
    },
    enabled: bookedTripId !== null,
  })
}


export function useAutoMatch() {
  return useMutation({
    mutationFn: ({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) =>
      apiClient.autoMatchPreview(dateFrom, dateTo).then(unwrap),
  })
}


export function useAutoMatchConfirm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pairs: { deliveredTripId: number; bookedTripId: number }[]) =>
      apiClient.autoMatchConfirm(pairs).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useMatchScores(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: queryKeys.matchScores(dateFrom, dateTo),
    queryFn: async () => {
      const res = await apiClient.getMatchScores(dateFrom, dateTo)
      return res.success ? res.data : null
    },
    enabled: !!dateFrom || !!dateTo,
  })
}


export function useBulkMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pairs: BulkMatchPair[]) => apiClient.bulkMatch(pairs).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useBatchReconcileForWO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deliveredTripId, bookedTripIds }: { deliveredTripId: number; bookedTripIds: number[] }) =>
      apiClient.batchReconcileForWO(deliveredTripId, bookedTripIds).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useBatchReconcileForTO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookedTripId, deliveredTripIds }: { bookedTripId: number; deliveredTripIds: number[] }) =>
      apiClient.batchReconcileForTO(bookedTripId, deliveredTripIds).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useSearchBookedTrips(q: string, deliveredTripId: number | null) {
  return useQuery({
    queryKey: ['booked-trips-search', q, deliveredTripId],
    queryFn: async () => {
      const res = await searchBookedTrips(q, deliveredTripId!)
      return res.success ? res.data : null
    },
    enabled: !!deliveredTripId && q.trim().length >= 2,
  })
}

