import { api } from './client'
import { toCamel, ok, fail, unwrapList } from './utils'
import type { ApiResponse } from '@/data/domain'

export type VendorType = 'company' | 'individual'

export interface Vendor {
  id: number
  name: string
  type?: VendorType
  phone?: string
  taxCode?: string
  address?: string
  contactPerson?: string
  createdAt: string
  updatedAt: string
}

export type VendorFormData = {
  name: string
  type?: VendorType
  phone?: string
  taxCode?: string
  address?: string
  contactPerson?: string
}

export async function getVendors(): Promise<ApiResponse<Vendor[]>> {
  try {
    const res = await api.get('/vendors')
    return ok(toCamel<Vendor[]>(unwrapList(res.data)))
  } catch (err) {
    return fail(err)
  }
}

export async function createVendor(data: VendorFormData): Promise<ApiResponse<Vendor>> {
  try {
    const res = await api.post('/vendors', {
      name: data.name,
      type: data.type ?? null,
      phone: data.phone ?? null,
      tax_code: data.taxCode ?? null,
      address: data.address ?? null,
      contact_person: data.contactPerson ?? null,
    })
    return ok(toCamel<Vendor>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateVendor(id: number, data: VendorFormData): Promise<ApiResponse<Vendor>> {
  try {
    const res = await api.put(`/vendors/${id}`, {
      name: data.name,
      type: data.type ?? null,
      phone: data.phone ?? null,
      tax_code: data.taxCode ?? null,
      address: data.address ?? null,
      contact_person: data.contactPerson ?? null,
    })
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
