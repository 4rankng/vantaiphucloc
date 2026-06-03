import { api } from './client'
import { toCamel, toSnake, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

export interface OperationTypeDTO {
  id: number
  name: string
  label: string
  isActive: boolean
}

export async function getOperationTypes(): Promise<ApiResponse<OperationTypeDTO[]>> {
  try {
    const res = await api.get('/operation-types')
    return ok(toCamel<OperationTypeDTO[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createOperationType(data: { name: string; label: string }): Promise<ApiResponse<OperationTypeDTO>> {
  try {
    const res = await api.post('/operation-types', toSnake(data))
    return ok(toCamel<OperationTypeDTO>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateOperationType(id: number, data: { name?: string; label?: string; isActive?: boolean }): Promise<ApiResponse<OperationTypeDTO>> {
  try {
    const res = await api.put(`/operation-types/${id}`, toSnake(data))
    return ok(toCamel<OperationTypeDTO>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteOperationType(id: number): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/operation-types/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
