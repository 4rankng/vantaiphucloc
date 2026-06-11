import { api } from './client'
import { safeRequest, toCamel, toSnake } from '@/lib/safe-request'
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

export function getOperationTypes(): Promise<ApiResponse<OperationTypeDTO[]>> {
  return safeRequest(() => api.get('/operation-types'))
}

export function createOperationType(data: { name: string; label: string }): Promise<ApiResponse<OperationTypeDTO>> {
  return safeRequest(() => api.post('/operation-types', toSnake(data)))
}

export function updateOperationType(id: number, data: { name?: string; label?: string; isActive?: boolean }): Promise<ApiResponse<OperationTypeDTO>> {
  return safeRequest(() => api.put(`/operation-types/${id}`, toSnake(data)))
}

export function deleteOperationType(id: number): Promise<ApiResponse<{ success: boolean }>> {
  return safeRequest(() => api.delete(`/operation-types/${id}`), () => ({ success: true }))
}

export function listOperationTypeAliases(
  params?: { operationTypeId?: number },
): Promise<ApiResponse<OperationTypeAliasDTO[]>> {
  return safeRequest(() => api.get('/operation-types/aliases', { params: toSnake(params ?? {}) }))
}

export function createOperationTypeAlias(
  operationTypeId: number,
  alias: string,
): Promise<ApiResponse<OperationTypeAliasDTO>> {
  return safeRequest(() => api.post('/operation-types/aliases', toSnake({ operationTypeId, alias })))
}

export function promoteOperationTypeAlias(aliasId: number): Promise<ApiResponse<OperationTypeAliasDTO>> {
  return safeRequest(() => api.post(`/operation-types/aliases/${aliasId}/promote`))
}

export function deleteOperationTypeAlias(aliasId: number): Promise<ApiResponse<{ success: boolean }>> {
  return safeRequest(() => api.delete(`/operation-types/aliases/${aliasId}`), () => ({ success: true }))
}
