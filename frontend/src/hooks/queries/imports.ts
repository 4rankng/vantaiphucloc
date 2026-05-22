import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useBulkImportAndMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, clientId }: { file: File; clientId?: number }) =>
      apiClient.bulkImportAndMatch(file, clientId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useAIParsePreview() {
  return useMutation({
    mutationFn: ({ file }: { file: File }) =>
      apiClient.aiParsePreview(file).then(unwrap),
  })
}


export function useUploadCustomerExcel() {
  return useMutation({
    mutationFn: ({ file, clientId, dateFrom, dateTo }: {
      file: File
      clientId: number
      dateFrom?: string
      dateTo?: string
    }) => apiClient.uploadCustomerExcel(file, clientId, dateFrom, dateTo),
  })
}


export function useExportReconciliationExcel() {
  return useMutation({
    mutationFn: ({ clientId, dateFrom, dateTo }: {
      clientId: number
      dateFrom?: string
      dateTo?: string
    }) => apiClient.exportReconciliationExcel(clientId, dateFrom, dateTo),
  })
}


export function useExportDoiSoatExcel() {
  return useMutation({
    mutationFn: (params: { clientId: number; dateFrom: string; dateTo: string }) =>
      apiClient.exportDoiSoatExcel(params.clientId, params.dateFrom, params.dateTo),
  })
}


export function useUpdateContainerNumber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, containerId, containerNumber }: {
      tripId: number
      containerId: number
      containerNumber: string
    }) => apiClient.updateContainerNumber(tripId, containerId, containerNumber).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
    },
  })
}


export function useToggleTripConfirmation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookedTripId: number) => apiClient.toggleTripConfirmation(bookedTripId).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booked-trips'] }) },
  })
}

