import { api } from './client'
import { safeRequest } from '@/lib/safe-request'
import type { ApiResponse } from '@/data/domain'

export interface AsyncJobResult {
  jobId: string
  message: string
}

export interface DriverEarnings {
  driverId: number
  driverName: string
  startDate: string
  endDate: string
  matchedOrderCount: number
  baseSalary: number
  totalSalary: number
  unmatchedSalary: number
  totalAllowance: number
  totalEarnings: number
}

export interface DriverBaseSalary {
  id: number
  driverId: number
  baseSalary: number
  effectiveFrom: string
  note: string | null
}

export interface SetDriverBaseSalaryInput {
  baseSalary: number
  effectiveFrom: string
  note?: string | null
}

export function getDriverEarnings(
  driverId: number,
  startDate: string,
  endDate: string,
): Promise<ApiResponse<DriverEarnings>> {
  return safeRequest(() => api.get(`/salary/earnings/${driverId}`, {
    params: { start_date: startDate, end_date: endDate },
  }))
}

export function getMyEarnings(
  startDate: string,
  endDate: string,
): Promise<ApiResponse<DriverEarnings>> {
  return safeRequest(() => api.get('/driver/earnings', {
    params: { start_date: startDate, end_date: endDate },
  }))
}

export function getSalaryConfig(): Promise<ApiResponse<{ fromDay: number; toDay: number }>> {
  return safeRequest(() => api.get('/salary/config'))
}

export function updateSalaryConfig(
  data: { from_day: number; to_day: number },
): Promise<ApiResponse<{ fromDay: number; toDay: number }>> {
  return safeRequest(() => api.put('/salary/config', data))
}

export function calculateSalary(
  driverId: number | undefined,
  startDate: string,
  endDate: string,
): Promise<ApiResponse<AsyncJobResult[]>> {
  return safeRequest(() => {
    const payload: Record<string, unknown> = {
      start_date: startDate,
      end_date: endDate,
    }
    if (driverId != null) payload.driver_id = driverId
    return api.post('/salary/calculate', payload)
  })
}

export function getSalaryDashboard(
  periodStart: string,
  periodEnd: string,
): Promise<ApiResponse<Record<string, unknown>[]>> {
  return safeRequest(() => {
    const params = new URLSearchParams()
    params.append('start_date', periodStart)
    params.append('end_date', periodEnd)
    return api.get(`/salary/dashboard?${params.toString()}`)
  })
}

export async function exportSalaryExcel(
  startDate: string,
  endDate: string,
): Promise<Blob> {
  const params = new URLSearchParams()
  params.append('start_date', startDate)
  params.append('end_date', endDate)
  const res = await api.get(`/salary/export?${params.toString()}`, { responseType: 'blob' })
  return res.data
}

export function getDriverBaseSalaryHistory(
  driverId: number,
): Promise<ApiResponse<DriverBaseSalary[]>> {
  return safeRequest(() => api.get(`/salary/drivers/${driverId}/base-salary`))
}

export function setDriverBaseSalary(
  driverId: number,
  payload: SetDriverBaseSalaryInput,
): Promise<ApiResponse<DriverBaseSalary>> {
  return safeRequest(() => api.post(`/salary/drivers/${driverId}/base-salary`, {
    base_salary: payload.baseSalary,
    effective_from: payload.effectiveFrom,
    note: payload.note ?? null,
  }))
}

export interface DriverSalaryRecord {
  id: number
  driverId: number
  driverName: string | null
  driverUsername: string | null
  fromDate: string
  toDate: string
  basicSalary: number
  bonusSalary: number
  allowance: number
  note: string | null
}

export interface DriverSalaryUpdateInput {
  basicSalary?: number
  allowance?: number
  note?: string | null
}

export function getSalaryPeriod(
  fromDate: string,
  toDate: string,
): Promise<ApiResponse<DriverSalaryRecord[]>> {
  return safeRequest(() => api.get(`/salary/periods/${fromDate}/${toDate}`))
}

export function upsertDriverSalary(
  driverId: number,
  fromDate: string,
  toDate: string,
  data: DriverSalaryUpdateInput,
): Promise<ApiResponse<DriverSalaryRecord>> {
  return safeRequest(() => api.put(
    `/salary/periods/${fromDate}/${toDate}/${driverId}`,
    {
      basic_salary: data.basicSalary,
      allowance: data.allowance,
      note: data.note ?? null,
    },
  ))
}

export function initializeSalaryPeriod(
  fromDate: string,
  toDate: string,
): Promise<ApiResponse<DriverSalaryRecord[]>> {
  return safeRequest(() => api.post(`/salary/periods/${fromDate}/${toDate}/initialize`))
}
