import { api } from './client'
import { toCamel, ok, fail } from './utils'
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

// ───────────────────────────────────────────────────────────────────────────
// Driver base salary (append-only history per driver)
// ───────────────────────────────────────────────────────────────────────────

export async function getDriverBaseSalaryHistory(
  driverId: number,
): Promise<ApiResponse<DriverBaseSalary[]>> {
  try {
    const res = await api.get(`/salary/drivers/${driverId}/base-salary`)
    return ok(toCamel<DriverBaseSalary[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function setDriverBaseSalary(
  driverId: number,
  payload: SetDriverBaseSalaryInput,
): Promise<ApiResponse<DriverBaseSalary>> {
  try {
    const res = await api.post(`/salary/drivers/${driverId}/base-salary`, {
      base_salary: payload.baseSalary,
      effective_from: payload.effectiveFrom,
      note: payload.note ?? null,
    })
    return ok(toCamel<DriverBaseSalary>(res.data))
  } catch (err) {
    return fail(err)
  }
}


// ───────────────────────────────────────────────────────────────────────────
// Driver salary period records (per-driver, per-period)
// ───────────────────────────────────────────────────────────────────────────

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

export async function getSalaryPeriod(
  fromDate: string,
  toDate: string,
): Promise<ApiResponse<DriverSalaryRecord[]>> {
  try {
    const res = await api.get(`/salary/periods/${fromDate}/${toDate}`)
    return ok(toCamel<DriverSalaryRecord[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function upsertDriverSalary(
  driverId: number,
  fromDate: string,
  toDate: string,
  data: DriverSalaryUpdateInput,
): Promise<ApiResponse<DriverSalaryRecord>> {
  try {
    const res = await api.put(
      `/salary/periods/${fromDate}/${toDate}/${driverId}`,
      {
        basic_salary: data.basicSalary,
        allowance: data.allowance,
        note: data.note ?? null,
      },
    )
    return ok(toCamel<DriverSalaryRecord>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function initializeSalaryPeriod(
  fromDate: string,
  toDate: string,
): Promise<ApiResponse<DriverSalaryRecord[]>> {
  try {
    const res = await api.post(`/salary/periods/${fromDate}/${toDate}/initialize`)
    return ok(toCamel<DriverSalaryRecord[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}
