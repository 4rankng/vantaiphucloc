import { useState, useCallback, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/shared/AppShell'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { UserDetailDialog } from '@/components/shared/UserDetailDialog'
import { CreateUserDialog } from '@/components/shared/CreateUserDialog'
import { useToast } from '@/components/atoms/Toast'
import { api } from '@/services/api/client'
import type { Role } from '@/data/domain'
import { SuperAdminDashboard } from './SuperAdminDashboard'
import { toUserAccount, type UserAccount } from './types'

export function SuperAdminApp() {
  const { user } = useAuth()

  // Guard: only superadmin may access this page
  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }

  return <SuperAdminAppInner />
}

function SuperAdminAppInner() {
  const { user } = useAuth()
  const toast = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users')
      const items = (res.data as { items: Record<string, unknown>[] }).items ?? res.data
      const list = (items as Record<string, unknown>[]).map(toUserAccount)
      setUsers(list)
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
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchUsers} />
      <UserDetailDialog user={selectedUser} open={!!selectedUser} onClose={() => setSelectedUser(null)} />
    </AppShell>
  )
}
