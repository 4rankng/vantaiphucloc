import { api } from './client'
import { toCamel, toSnake, ok, fail, isNetworkError, unwrapList } from './utils'
import { setCache, getCache } from '@/lib/offline-db'
import type { Client, ApiResponse } from '@/data/domain'

export async function getClients(): Promise<ApiResponse<Client[]>> {
  try {
    const res = await api.get('/clients')
    const data = toCamel<Client[]>(unwrapList(res.data))
    await setCache('clients', data)
    return ok(data)
  } catch (err) {
    const cached = await getCache<Client[]>('clients')
    if (isNetworkError(err) && cached) return ok(cached)
    return fail(err)
  }
}

export async function createClient(data: Omit<Client, 'id'>): Promise<ApiResponse<Client>> {
  try {
    const res = await api.post('/clients', toSnake(data))
    return ok(toCamel<Client>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateClient(id: number, data: Partial<Client>): Promise<ApiResponse<Client>> {
  try {
    const res = await api.put(`/clients/${id}`, toSnake(data))
    return ok(toCamel<Client>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteClient(id: number): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/clients/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
