import { api } from './client'
import { toCamel, ok, fail, unwrapList } from './utils'
import type { ApiResponse } from '@/data/domain'

export interface Vendor {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

export async function getVendors(): Promise<ApiResponse<Vendor[]>> {
  try {
    const res = await api.get('/vendors')
    return ok(toCamel<Vendor[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createVendor(data: { name: string }): Promise<ApiResponse<Vendor>> {
  try {
    const res = await api.post('/vendors', { name: data.name })
    return ok(toCamel<Vendor>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateVendor(id: number, data: { name: string }): Promise<ApiResponse<Vendor>> {
  try {
    const res = await api.put(`/vendors/${id}`, { name: data.name })
    return ok(toCamel<Vendor>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteVendor(id: number): Promise<ApiResponse<null>> {
  try {
    await api.delete(`/vendors/${id}`)
    return ok(null)
  } catch (err) {
    return fail(err)
  }
}
