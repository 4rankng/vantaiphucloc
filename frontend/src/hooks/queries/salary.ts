import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'
import type { DriverSalaryUpdateInput } from '@/services/api/salary.api'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useDriverEarnings(driverId: number, startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.driverEarnings(driverId, startDate, endDate),
    queryFn: async () => {
      const res = await apiClient.getDriverEarnings(driverId, startDate, endDate)
      return res.success ? res.data : null
    },
    enabled: !!driverId && !!startDate && !!endDate,
  })
}


export function useMyEarnings(startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.myEarnings(startDate, endDate),
    queryFn: async () => {
      const res = await apiClient.getMyEarnings(startDate, endDate)
      return res.success ? res.data : null
    },
    enabled: !!startDate && !!endDate,
  })
}


export function useSalaryDashboard(periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: ['salary-dashboard', periodStart, periodEnd],
    queryFn: async () => {
      const res = await apiClient.getSalaryDashboard(periodStart, periodEnd)
      return res.success ? res.data : []
    },
    enabled: !!periodStart && !!periodEnd,
  })
}


export function useExportSalaryExcel() {
  return useMutation({
    mutationFn: ({ startDate, endDate }: { startDate: string; endDate: string }) =>
      apiClient.exportSalaryExcel(startDate, endDate),
  })
}


export function useCalculateSalary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ driverId, startDate, endDate }: { driverId?: number; startDate: string; endDate: string }) =>
      apiClient.calculateSalary(driverId, startDate, endDate).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-earnings'] })
      qc.invalidateQueries({ queryKey: ['my-earnings'] })
      qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
    },
  })
}


export function useSalaryConfig() {
  return useQuery({
    queryKey: queryKeys.salaryConfig,
    queryFn: async () => {
      const res = await apiClient.getSalaryConfig()
      return res.success ? res.data : null
    },
  })
}


export function useUpdateSalaryConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { from_day: number; to_day: number }) => apiClient.updateSalaryConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.salaryConfig })
      qc.invalidateQueries({ queryKey: ['driver-earnings'] })
      qc.invalidateQueries({ queryKey: ['my-earnings'] })
      qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
    },
  })
}


export function useDriverBaseSalaryHistory(driverId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.driverBaseSalary(driverId ?? 0),
    queryFn: async () => {
      const res = await apiClient.getDriverBaseSalaryHistory(driverId!)
      return res.success ? res.data : []
    },
    enabled: !!driverId,
  })
}


export function useSetDriverBaseSalary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      driverId,
      baseSalary,
      effectiveFrom,
      note,
    }: {
      driverId: number
      baseSalary: number
      effectiveFrom: string
      note?: string | null
    }) =>
      apiClient
        .setDriverBaseSalary(driverId, { baseSalary, effectiveFrom, note })
        .then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-base-salary'] })
      qc.invalidateQueries({ queryKey: ['driver-earnings'] })
      qc.invalidateQueries({ queryKey: ['my-earnings'] })
      qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
      qc.invalidateQueries({ queryKey: ['salary-period'] })
    },
  })
}


export function useSalaryPeriod(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: queryKeys.salaryPeriod(fromDate, toDate),
    queryFn: async () => {
      const res = await apiClient.getSalaryPeriod(fromDate, toDate)
      return res.success ? res.data : []
    },
    enabled: !!fromDate && !!toDate,
  })
}


export function useUpsertDriverSalary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      driverId,
      fromDate,
      toDate,
      data,
    }: {
      driverId: number
      fromDate: string
      toDate: string
      data: DriverSalaryUpdateInput
    }) =>
      apiClient
        .upsertDriverSalary(driverId, fromDate, toDate, data)
        .then(unwrap),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.salaryPeriod(variables.fromDate, variables.toDate) })
      qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
    },
  })
}


export function useInitializeSalaryPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fromDate, toDate }: { fromDate: string; toDate: string }) =>
      apiClient.initializeSalaryPeriod(fromDate, toDate).then(unwrap),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.salaryPeriod(variables.fromDate, variables.toDate) })
      qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
    },
  })
}

