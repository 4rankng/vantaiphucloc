import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '../query-keys'
import type { ApiResponse } from '@/data/domain'
import type { UserFilters } from '@/services/api/users.api'
import type { UserAccount } from '@/services/api/users.api'

function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const res = await apiClient.getUsers()
      return res.success ? res.data : []
    },
  })
}

export function useUsersPaged(filters?: UserFilters) {
  const key = ['users-paged', filters?.search ?? '', filters?.role ?? '', filters?.sortBy ?? '', filters?.sortOrder ?? 'asc', filters?.page ?? 1, filters?.pageSize ?? 50]
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await apiClient.getUsersPaged(filters)
      if (!res.success) return { items: [] as UserAccount[], total: 0, page: 1, pageSize: 50, totalPages: 0 }
      return res.data
    },
  })
}


export function useProfile() {
  return useQuery({
    queryKey: ['profile'] as const,
    queryFn: async () => {
      const res = await apiClient.getProfile()
      return res.success ? res.data : null
    },
  })
}


export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ field, value }: { field: string; value: string }) => apiClient.updateProfile(field, value).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }) },
  })
}


export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      apiClient.changePassword(currentPassword, newPassword),
  })
}


export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createUser>[0]) => apiClient.createUser(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users }) },
  })
}


export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Record<string, unknown> }) => apiClient.updateUser(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users }) },
  })
}


export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => apiClient.deleteUser(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users }) },
  })
}

