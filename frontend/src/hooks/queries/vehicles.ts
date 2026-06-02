import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useVehicles(activeOnly = true) {
  return useQuery({
    queryKey: queryKeys.vehicles(activeOnly),
    queryFn: async () => {
      const res = await apiClient.getVehicles(activeOnly)
      return res.success ? res.data : []
    },
  })
}


export function useCreateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (plate: string) => {
      const res = await apiClient.createVehicle(plate)
      return unwrap(res)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: queryKeys.vehicleDrivers })
    },
  })
}


export function useVehicleDrivers() {
  return useQuery({
    queryKey: queryKeys.vehicleDrivers,
    queryFn: async () => {
      const res = await apiClient.getVehicleDrivers({ activeOnly: true })
      return res.success ? res.data : []
    },
  })
}


export function useAddVehicleDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ vehicleId, driverId, effectiveFrom }: { vehicleId: number; driverId: number; effectiveFrom?: string }) => {
      const res = await apiClient.addVehicleDriver(vehicleId, driverId, effectiveFrom)
      return unwrap(res)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vehicleDrivers })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })
}


export function useRemoveVehicleDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.removeVehicleDriver(id)
      return unwrap(res)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vehicleDrivers })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['drivers'] })
      qc.invalidateQueries({ queryKey: ['drivers-paged'] })
    },
  })
}


export function useDeleteVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteVehicle(id).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: queryKeys.vehicleDrivers })
    },
  })
}

