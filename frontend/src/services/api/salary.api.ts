import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapList } from './utils'
import type { SalaryPeriod, ApiResponse } from '@/data/domain'

export interface AsyncJobResult {
  jobId: string
  message: string
}

export interface JobStatus {
  jobId: string
  status: 'queued' | 'in_progress' | 'complete' | 'not_found'
  result: Record<string, unknown> | null
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

export async function getSalaryPeriods(driverId?: number): Promise<ApiResponse<SalaryPeriod[]>> {
  try {
    const params: Record<string, string> = {}
    if (driverId) params.driver_id = String(driverId)
    const res = await api.get('/salary', { params })
    return ok(toCamel<SalaryPeriod[]>(unwrapList(res.data)))
  } catch (err) {
    return fail(err)
  }
}

export async function getMySalaryPeriods(): Promise<ApiResponse<SalaryPeriod[]>> {
  try {
    const res = await api.get('/driver/salary')
    return ok(toCamel<SalaryPeriod[]>(unwrapList(res.data)))
  } catch (err) {
    return fail(err)
  }
}

export async function updateSalaryPeriod(
  id: number,
  data: Partial<SalaryPeriod>,
): Promise<ApiResponse<SalaryPeriod>> {
  try {
    const res = await api.put(`/salary/${id}`, toSnake(data))
    return ok(toCamel<SalaryPeriod>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getSalaryDashboard(
  periodStart: string,
  periodEnd: string,
): Promise<ApiResponse<any[]>> {
  try {
    const params = new URLSearchParams()
    params.append('period_start', periodStart)
    params.append('period_end', periodEnd)
    const res = await api.get(`/salary/dashboard?${params.toString()}`)
    return ok(toCamel<any[]>(res.data))
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
