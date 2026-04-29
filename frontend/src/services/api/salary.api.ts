import { api } from './client'
import { normalizeMany, normalizeOne, toSnake, ok, fail } from './utils'
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
  driverId: string,
  startDate: string,
  endDate: string,
): Promise<ApiResponse<AsyncJobResult>> {
  try {
    const res = await api.post('/salary/calculate', {
      driver_id: driverId,
      start_date: startDate,
      end_date: endDate,
    })
    return ok(normalizeOne<AsyncJobResult>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getJobStatus(jobId: string): Promise<ApiResponse<JobStatus>> {
  try {
    const res = await api.get(`/jobs/${jobId}`)
    return ok(normalizeOne<JobStatus>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function getSalaryPeriods(driverId?: string): Promise<ApiResponse<SalaryPeriod[]>> {
  try {
    const params: Record<string, string> = {}
    if (driverId) params.driver_id = driverId
    const res = await api.get('/salary', { params })
    return ok(normalizeMany<SalaryPeriod>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateSalaryPeriod(
  id: string,
  data: Partial<SalaryPeriod>,
): Promise<ApiResponse<SalaryPeriod>> {
  try {
    const res = await api.put(`/salary/${id}`, toSnake(data))
    return ok(normalizeOne<SalaryPeriod>(res.data))
  } catch (err) {
    return fail(err)
  }
}
