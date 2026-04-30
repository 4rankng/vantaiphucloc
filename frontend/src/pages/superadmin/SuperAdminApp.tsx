import { useState, useCallback, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/shared/AppShell'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { UserDetailDialog } from '@/components/shared/UserDetailDialog'
import { CreateUserDialog } from '@/components/shared/CreateUserDialog'
import { useIsMobile } from '@/hooks/use-mobile'
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

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
        topbarProps={{ variant: 'home', name: user?.name ?? '', onProfile: () => {}, onNotifications: () => {} }}
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
        onProfile: () => setDropdownOpen(true),
        onNotifications: () => {},
      }}
    >
      <SuperAdminDashboard
        users={users}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onViewUser={setSelectedUser}
      />
      {isMobile && <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => setCreateOpen(true)} label="Tạo tài khoản" />}
      {!isMobile && (
        <button
          onClick={() => setCreateOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-10 px-5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg transition-transform active:scale-95"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Plus className="w-4 h-4" /> Tạo tài khoản
        </button>
      )}
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchUsers} />
      <UserDetailDialog user={selectedUser} open={!!selectedUser} onClose={() => setSelectedUser(null)} />
    </AppShell>
  )
}
