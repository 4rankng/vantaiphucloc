import { api } from './client'
import { toCamel, toSnake, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

export interface OperationTypeDTO {
  id: number
  name: string
  label: string
  isActive: boolean
}

export interface OperationTypeAliasDTO {
  id: number
  operationTypeId: number
  operationTypeName?: string | null
  alias: string
  aliasNormalized: string
  source: string
  createdAt: string
  createdById?: number | null
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

// ── Alias CRUD ──────────────────────────────────────────────────────────────

export async function listOperationTypeAliases(
  params?: { operationTypeId?: number },
): Promise<ApiResponse<OperationTypeAliasDTO[]>> {
  try {
    const res = await api.get('/operation-types/aliases', { params: toSnake(params ?? {}) })
    return ok(toCamel<OperationTypeAliasDTO[]>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createOperationTypeAlias(
  operationTypeId: number,
  alias: string,
): Promise<ApiResponse<OperationTypeAliasDTO>> {
  try {
    const res = await api.post('/operation-types/aliases', toSnake({ operationTypeId, alias }))
    return ok(toCamel<OperationTypeAliasDTO>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function promoteOperationTypeAlias(
  aliasId: number,
): Promise<ApiResponse<OperationTypeAliasDTO>> {
  try {
    const res = await api.post(`/operation-types/aliases/${aliasId}/promote`)
    return ok(toCamel<OperationTypeAliasDTO>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteOperationTypeAlias(
  aliasId: number,
): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/operation-types/aliases/${aliasId}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
