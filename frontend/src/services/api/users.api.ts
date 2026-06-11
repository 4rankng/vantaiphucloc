import { api } from './client'
import { safeRequest, toCamel, toSnake } from '@/lib/safe-request'
import { unwrapList, unwrapPaginated } from './utils'
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

export function getUsers(): Promise<ApiResponse<UserAccount[]>> {
  return safeRequest(() => api.get('/users', { params: { page_size: 500 } }),
    (res) => {
      const items = unwrapList(res.data)
      return (items as Record<string, unknown>[]).map(toUserAccount)
    },
  )
}

export function getUsersPaged(filters?: UserFilters): Promise<ApiResponse<PaginatedResult<UserAccount>>> {
  return safeRequest(() => {
    const params: Record<string, string> = {}
    if (filters?.search) params.search = filters.search
    if (filters?.role) params.role = filters.role
    if (filters?.sortBy) params.sort_by = filters.sortBy
    if (filters?.sortOrder) params.sort_order = filters.sortOrder
    params.page = String(filters?.page ?? 1)
    params.page_size = String(filters?.pageSize ?? 50)
    return api.get('/users', { params })
  }, (res) => unwrapPaginated<UserAccount>(res.data, (raw) => toUserAccount(raw as Record<string, unknown>)))
}

export function createUser(data: {
  username: string
  fullName?: string
  phone?: string
  cccd?: string
  role: Role
  password: string
  vendor?: string
}): Promise<ApiResponse<UserAccount>> {
  return safeRequest(() => api.post('/users', toSnake(data)),
    (res) => toUserAccount(res.data),
  )
}

export function updateUser(id: string | number, data: Record<string, unknown>): Promise<ApiResponse<UserAccount>> {
  return safeRequest(() => api.put(`/users/${id}`, toSnake(data)),
    (res) => toUserAccount(res.data),
  )
}

export function deleteUser(id: string | number): Promise<ApiResponse<{ success: boolean }>> {
  return safeRequest(() => api.delete(`/users/${id}`),
    () => ({ success: true }),
  )
}

export interface UserProfile {
  username: string
  fullName: string | null
  phone: string | null
  email: string | null
  vehiclePlate: string | null
}

export function getProfile(): Promise<ApiResponse<UserProfile>> {
  return safeRequest(() => api.get('/users/me'),
    (res) => ({
      username: res.data.username ?? '',
      fullName: res.data.full_name ?? null,
      phone: res.data.phone ?? null,
      email: res.data.email ?? null,
      vehiclePlate: res.data.vehicle_plate ?? null,
    }),
  )
}

export function updateProfile(field: string, value: string): Promise<ApiResponse<{ field: string; value: string }>> {
  return safeRequest(() => api.put('/users/me', { [field]: value }),
    (res) => ({ field, value: res.data[field] ?? value }),
  )
}

export function changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ success: boolean }>> {
  return safeRequest(() => api.post('/change-password', { current_password: currentPassword, new_password: newPassword }),
    () => ({ success: true }),
  )
}
