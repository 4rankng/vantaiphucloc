import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UserDetailDialog } from '@/components/shared/UserDetailDialog'
import { CreateUserDialog } from '@/components/shared/CreateUserDialog'
import { useToast } from '@/components/atoms/Toast'
import { ROLE_LABELS, type Role } from '@/data/domain'
import { useVendors, useUsers, useUpdateUser, useDeleteUser, queryKeys } from '@/hooks/use-queries'
import { SuperAdminDashboard } from './SuperAdminDashboard'
import type { UserAccount } from '@/services/api/users.api'

const ALL_ROLES: { value: Role; label: string }[] = [
  { value: 'superadmin', label: ROLE_LABELS.superadmin },
  { value: 'director', label: ROLE_LABELS.director },
  { value: 'driver', label: ROLE_LABELS.driver },
  { value: 'accountant', label: ROLE_LABELS.accountant },
]

export function SuperAdminApp() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: vendors } = useVendors()
  const { data: users = [], isLoading: loading } = useUsers()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')

  const handleEditUser = useCallback(async (userId: string, data: Record<string, unknown>) => {
    try {
      await updateUser.mutateAsync({ id: userId, data })
      toast.success('Đã cập nhật')
      setSelectedUser(null)
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật')
    }
  }, [toast, updateUser])

  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      await deleteUser.mutateAsync(userId)
      toast.success('Đã xoá tài khoản')
      setSelectedUser(null)
    } catch {
      toast.error('Lỗi', 'Không thể xoá tài khoản')
    }
  }, [toast, deleteUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div style={{ color: 'var(--theme-text-muted)' }} className="typo-body">Đang tải...</div>
      </div>
    )
  }

  return (
    <>
      <SuperAdminDashboard
        users={users}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        onViewUser={setSelectedUser}
        onCreateUser={() => setCreateOpen(true)}
      />
      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: queryKeys.users })}
        roles={ALL_ROLES}
      />
      <UserDetailDialog
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        editableRoles={ALL_ROLES}
        vendors={(vendors ?? []).map(v => ({ id: v.id, name: v.name }))}
        saving={updateUser.isPending || deleteUser.isPending}
      />
    </>
  )
}
