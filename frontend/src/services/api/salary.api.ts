import { api } from './client'
import { toCamel, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

export interface AsyncJobResult {
  jobId: string
  message: string
}

export interface JobStatus {
  jobId: string
  status: 'queued' | 'in_progress' | 'complete' | 'not_found'
  result: Record<string, unknown> | null
}

export interface DriverEarnings {
  driverId: number
  driverName: string
  startDate: string
  endDate: string
  matchedOrderCount: number
  totalSalary: number
  totalAllowance: number
  totalEarnings: number
}

export async function getDriverEarnings(
  driverId: number,
  startDate: string,
  endDate: string,
): Promise<ApiResponse<DriverEarnings>> {
  try {
    const res = await api.get(`/salary/earnings/${driverId}`, {
      params: { start_date: startDate, end_date: endDate },
    })
    return ok(toCamel<DriverEarnings>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getMyEarnings(
  startDate: string,
  endDate: string,
): Promise<ApiResponse<DriverEarnings>> {
  try {
    const res = await api.get('/driver/earnings', {
      params: { start_date: startDate, end_date: endDate },
    })
    return ok(toCamel<DriverEarnings>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getSalaryConfig(): Promise<ApiResponse<{ fromDay: number; toDay: number }>> {
  try {
    const res = await api.get('/salary/config')
    return ok(toCamel<{ fromDay: number; toDay: number }>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateSalaryConfig(
  data: { from_day: number; to_day: number },
): Promise<ApiResponse<{ fromDay: number; toDay: number }>> {
  try {
    const res = await api.put('/salary/config', data)
    return ok(toCamel<{ fromDay: number; toDay: number }>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function calculateSalary(
  driverId: number | undefined,
  startDate: string,
  endDate: string,
): Promise<ApiResponse<AsyncJobResult[]>> {
  try {
    const payload: Record<string, unknown> = {
      start_date: startDate,
      end_date: endDate,
    }
    if (driverId != null) payload.driver_id = driverId
    const res = await api.post('/salary/calculate', payload)
    return ok(toCamel<AsyncJobResult[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getJobStatus(jobId: string): Promise<ApiResponse<JobStatus>> {
  try {
    const res = await api.get(`/jobs/${jobId}`)
    return ok(toCamel<JobStatus>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getSalaryDashboard(
  periodStart: string,
  periodEnd: string,
): Promise<ApiResponse<Record<string, unknown>[]>> {
    try {
      const params = new URLSearchParams()
      params.append('start_date', periodStart)
      params.append('end_date', periodEnd)
      const res = await api.get(`/salary/dashboard?${params.toString()}`)
      return ok(toCamel<Record<string, unknown>[]>(res.data))
  } catch (err) {
    return fail(err)
  }
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
