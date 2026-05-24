import { api } from './client'
import { toCamel, toSnake, ok, fail, unwrapList, unwrapPaginated } from './utils'
import type { ApiResponse, PaginatedResult } from '@/data/domain'
import type { Role } from '@/data/domain'

export type UserSortBy = 'username' | 'full_name' | 'role' | 'phone'
export type SortOrder = 'asc' | 'desc'

export interface UserFilters {
  search?: string
  role?: string
  sortBy?: UserSortBy
  sortOrder?: SortOrder
  page?: number
  pageSize?: number
}

export interface UserAccount {
  id: string
  username: string
  fullName: string | null
  phone: string | null
  cccd: string | null
  email?: string
  role: Role
  vendor: string
  isActive: boolean
  vehiclePlate: string | null
  createdAt: string
}

const DEFAULT_VENDOR = 'Vận Tải Phúc Lộc'

export function toUserAccount(raw: Record<string, unknown>): UserAccount {
  const camel = toCamel<Record<string, unknown>>(raw)
  return {
    id: String(camel.id),
    username: (camel.username as string) ?? '',
    fullName: (camel.fullName as string) ?? null,
    phone: (camel.phone as string) ?? null,
    cccd: (camel.cccd as string) ?? null,
    email: camel.email as string | undefined,
    role: camel.role as Role,
    vendor: (camel.vendor as string) || DEFAULT_VENDOR,
    isActive: camel.isActive as boolean,
    vehiclePlate: (camel.vehiclePlate as string) ?? null,
    createdAt: (camel.createdAt as string) ?? '',
  }
}

export async function getUsers(): Promise<ApiResponse<UserAccount[]>> {
  try {
    const res = await api.get('/users', { params: { page_size: 500 } })
    const items = unwrapList(res.data)
    const users = (items as Record<string, unknown>[]).map(toUserAccount)
    return ok(users)
  } catch (err) {
    return fail(err)
  }
}

export async function getUsersPaged(filters?: UserFilters): Promise<ApiResponse<PaginatedResult<UserAccount>>> {
  try {
    const params: Record<string, string> = {}
    if (filters?.search) params.search = filters.search
    if (filters?.role) params.role = filters.role
    if (filters?.sortBy) params.sort_by = filters.sortBy
    if (filters?.sortOrder) params.sort_order = filters.sortOrder
    params.page = String(filters?.page ?? 1)
    params.page_size = String(filters?.pageSize ?? 50)
    const res = await api.get('/users', { params })
    const result = unwrapPaginated<UserAccount>(res.data, (raw) => toUserAccount(raw as Record<string, unknown>))
    return ok(result)
  } catch (err) {
    return fail(err)
  }
}

export async function createUser(data: {
  username: string
  fullName?: string
  phone?: string
  cccd?: string
  role: Role
  password: string
  vendor?: string
}): Promise<ApiResponse<UserAccount>> {
  try {
    const res = await api.post('/users', toSnake(data))
    return ok(toUserAccount(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateUser(id: string | number, data: Record<string, unknown>): Promise<ApiResponse<UserAccount>> {
  try {
    const res = await api.put(`/users/${id}`, toSnake(data))
    return ok(toUserAccount(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteUser(id: string | number): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.delete(`/users/${id}`)
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}

export interface UserProfile {
  username: string
  fullName: string | null
  phone: string | null
  email: string | null
}

export async function getProfile(): Promise<ApiResponse<UserProfile>> {
  try {
    const res = await api.get('/users/me')
    return ok({
      username: res.data.username ?? '',
      fullName: res.data.full_name ?? null,
      phone: res.data.phone ?? null,
      email: res.data.email ?? null,
    })
  } catch (err) {
    return fail(err)
  }
}

export async function updateProfile(field: string, value: string): Promise<ApiResponse<{ field: string; value: string }>> {
  try {
    const res = await api.put('/users/me', { [field]: value })
    return ok({ field, value: res.data[field] ?? value })
  } catch (err) {
    return fail(err)
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    await api.post('/change-password', { current_password: currentPassword, new_password: newPassword })
    return ok({ success: true })
  } catch (err) {
    return fail(err)
  }
}
