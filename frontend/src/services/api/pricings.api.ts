import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapList } from './utils'
import type { Pricing, PricingLine, ApiResponse, WorkType } from '@/data/domain'

export interface PricingCreatePayload {
  clientId: number
  workType: WorkType
  pickupLocationId: number
  dropoffLocationId: number
  lines: PricingLine[]
  shipperPartnerId?: number | null
  operationType?: string | null
}

export interface PricingUpdatePayload {
  clientId?: number
  workType?: WorkType
  pickupLocationId?: number
  dropoffLocationId?: number
  lines?: PricingLine[]
  shipperPartnerId?: number | null
  operationType?: string | null
}

export async function getPricings(
  filters?: { clientId?: number; workType?: WorkType; pickupLocationId?: number; dropoffLocationId?: number },
): Promise<ApiResponse<Pricing[]>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.clientId) params.client_id = String(filters.clientId)
    if (filters?.workType) params.work_type = filters.workType
    if (filters?.pickupLocationId) params.pickup_location_id = String(filters.pickupLocationId)
    if (filters?.dropoffLocationId) params.dropoff_location_id = String(filters.dropoffLocationId)
    const res = await api.get('/pricings', { params: { ...params, page_size: 200 } })
    return ok(toCamel<Pricing[]>(unwrapList(res.data)))
  } catch (err) {
    return fail(err)
  }
}

export async function createPricing(
  data: PricingCreatePayload,
): Promise<ApiResponse<Pricing>> {
  try {
    const res = await api.post('/pricings', toSnake(data))
    return ok(toCamel<Pricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updatePricing(id: number, data: PricingUpdatePayload): Promise<ApiResponse<Pricing>> {
  try {
    const res = await api.put(`/pricings/${id}`, toSnake(data))
    return ok(toCamel<Pricing>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deletePricing(id: number): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/pricings/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
