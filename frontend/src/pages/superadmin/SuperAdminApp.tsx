import { useState, useCallback, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/shared/AppShell'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { UserDetailDialog } from '@/components/shared/UserDetailDialog'
import { CreateUserDialog } from '@/components/shared/CreateUserDialog'
import { useToast } from '@/components/atoms/Toast'
import { apiClient } from '@/services/api'
import { ROLE_LABELS, type Role } from '@/data/domain'
import { useVendors } from '@/hooks/use-queries'
import { SuperAdminDashboard } from './SuperAdminDashboard'
import type { UserAccount } from '@/services/api/users.api'

const ALL_ROLES: { value: Role; label: string }[] = [
  { value: 'superadmin', label: ROLE_LABELS.superadmin },
  { value: 'director', label: ROLE_LABELS.director },
  { value: 'driver', label: ROLE_LABELS.driver },
  { value: 'accountant', label: ROLE_LABELS.accountant },
]

export function SuperAdminApp() {
  const { user } = useAuth()

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }

  return <SuperAdminAppInner />
}

function SuperAdminAppInner() {
  const { user } = useAuth()
  const toast = useToast()
  const { data: vendors } = useVendors()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.getUsers()
      if (res.success) setUsers(res.data)
    } catch {
      toast.error('Lỗi', 'Không thể tải danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers()
  }, [fetchUsers])

  const handleEditUser = useCallback(async (userId: string, data: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await apiClient.updateUser(userId, data)
      if (res.success) {
        toast.success('Đã cập nhật')
        setSelectedUser(null)
        fetchUsers()
      } else {
        toast.error('Lỗi', res.message ?? 'Không thể cập nhật')
      }
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật')
    } finally {
      setSaving(false)
    }
  }, [toast, fetchUsers])

  const handleDeleteUser = useCallback(async (userId: string) => {
    setSaving(true)
    try {
      const res = await apiClient.deleteUser(userId)
      if (res.success) {
        toast.success('Đã xoá tài khoản')
        setSelectedUser(null)
        fetchUsers()
      } else {
        toast.error('Lỗi', res.message ?? 'Không thể xoá tài khoản')
      }
    } catch {
      toast.error('Lỗi', 'Không thể xoá tài khoản')
    } finally {
      setSaving(false)
    }
  }, [toast, fetchUsers])

  if (loading) {
    return (
      <AppShell
        topbarProps={{ variant: 'home', name: user?.name ?? '', onNotifications: () => {} }}
        contentClassName="px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto"
      >
        <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>Đang tải...</div>
      </AppShell>
    )
  }

  return (
    <AppShell
      topbarProps={{
        variant: 'home',
        name: user?.name ?? '',
        onNotifications: () => {},
      }}
      contentClassName="px-4 py-4 space-y-4 md:px-6 md:py-6 md:max-w-4xl md:mx-auto"
    >
      <SuperAdminDashboard
        users={users}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onViewUser={setSelectedUser}
      />
      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => setCreateOpen(true)} />
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchUsers} roles={ALL_ROLES} />
      <UserDetailDialog
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        editableRoles={ALL_ROLES}
        vendors={(vendors ?? []).map(v => ({ id: v.id, name: v.name }))}
        saving={saving}
      />
    </AppShell>
  )
}
