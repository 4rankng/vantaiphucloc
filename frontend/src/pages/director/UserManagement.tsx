import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { Phone, ChevronRight, UserCog } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { FilterPills } from '@/components/shared/navigation/FilterPills'
import { SearchInput } from '@/components/shared/data-display/ListUtils'
import { UserDetailDialog } from '@/components/shared/overlays/UserDetailDialog'
import { CreateUserDialog } from '@/components/shared/overlays/CreateUserDialog'
import { BackButton } from '@/components/shared/navigation/BackButton/BackButton'
import type { Role } from '@/data/domain'
import { ROLE_LABELS } from '@/data/domain'
import { ROLE_ICONS } from '@/pages/superadmin/types'
import { ROLE_COLORS, CREATABLE_ROLES } from '@/lib/role-mappings'
import { useUsersPaged, useUpdateUser, useDeleteUser, queryKeys } from '@/hooks/use-queries'
import type { UserAccount } from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { useDebounce } from '@/hooks/use-debounce'
import { SuperAdminDashboard } from '@/pages/superadmin/SuperAdminDashboard'

// ─── User management ──────────────────────────────────────────────────────────

function UserManagementInner() {
  const qc = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 400)
  const { data: pagedData, isLoading: loading } = useUsersPaged({
    search: debouncedSearch || undefined,
    pageSize: 500,
  })
  // Include inactive users so the director can see and reactivate them
  const allUsers = useMemo(() => pagedData?.items ?? [], [pagedData])
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)

  const isMobile = useIsMobile(768)

  // Only superadmin can see superadmin accounts
  const currentUser = useAuth().user
  const visibleUsers = useMemo(
    () => currentUser?.role === 'superadmin'
      ? allUsers
      : allUsers.filter(u => u.role !== 'superadmin'),
    [allUsers, currentUser],
  )

  // Mobile: filter by role for the list view
  const mobileFiltered = useMemo(
    () => filterRole === 'ALL' ? visibleUsers : visibleUsers.filter(u => u.role === filterRole),
    [filterRole, visibleUsers],
  )

  const roleCounts = useMemo(() => ({
    ALL: visibleUsers.length,
    ...(currentUser?.role === 'superadmin' ? { superadmin: visibleUsers.filter(u => u.role === 'superadmin').length } : {}),
    director: visibleUsers.filter(u => u.role === 'director').length,
    accountant: visibleUsers.filter(u => u.role === 'accountant').length,
    driver: visibleUsers.filter(u => u.role === 'driver').length,
  }), [visibleUsers, currentUser])

  const handleEditUser = useCallback(async (userId: string, data: Record<string, unknown>) => {
    await updateUser.mutateAsync({ id: userId, data })
    setSelectedUser(null)
  }, [updateUser])

  const handleDeleteUser = useCallback(async (userId: string) => {
    await deleteUser.mutateAsync(userId)
    setSelectedUser(null)
  }, [deleteUser])

  const handleActivateUser = useCallback(async (user: UserAccount) => {
    await updateUser.mutateAsync({ id: user.id, data: { is_active: true } })
  }, [updateUser])

  const editableRoles = CREATABLE_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))

  if (loading) return (
    <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
      Đang tải...
    </div>
  )

  // ── Desktop: polished card grid ──────────────────────────────────────────────
  if (!isMobile) {
    return (
      <>
        <BackButton label="Tổng quan" onClick={() => window.history.back()} />
        <SuperAdminDashboard
          users={visibleUsers}
          filterRole={filterRole}
          setFilterRole={setFilterRole}
          onViewUser={setSelectedUser}
          onCreateUser={() => setCreateOpen(true)}
          onActivateUser={handleActivateUser}
          createButtonColor="var(--theme-sidebar, #047857)"
        />

        <CreateUserDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: queryKeys.users })}
          roles={editableRoles}
        />

        <UserDetailDialog
          user={selectedUser}
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          editableRoles={editableRoles}
          saving={updateUser.isPending || deleteUser.isPending}
        />
      </>
    )
  }

  // ── Mobile: compact list ─────────────────────────────────────────────────────
  return (
    <>
      <BackButton label="Tổng quan" onClick={() => window.history.back()} />
      <div className="space-y-4">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Tìm tên, SĐT, tên đăng nhập…"
        />

      <FilterPills
        options={[
          { value: 'ALL', label: 'Tất cả', count: roleCounts.ALL },
          ...(currentUser?.role === 'superadmin'
            ? [{ value: 'superadmin', label: ROLE_LABELS.superadmin, count: roleCounts.superadmin }]
            : []),
          { value: 'director', label: ROLE_LABELS.director, count: roleCounts.director },
          { value: 'accountant', label: ROLE_LABELS.accountant, count: roleCounts.accountant },
          { value: 'driver', label: ROLE_LABELS.driver, count: roleCounts.driver },
        ]}
        value={filterRole}
        onChange={setFilterRole}
      />

      {mobileFiltered.length === 0 && (
        <EmptyState
          icon={<UserCog className="w-10 h-10" />}
          title="Chưa có tài khoản"
          description={
            filterRole !== 'ALL'
              ? `Không có tài khoản với vai trò ${ROLE_LABELS[filterRole]}`
              : 'Tạo tài khoản đầu tiên cho team'
          }
          compact
        />
      )}

      <div className="grid grid-cols-1 gap-3">
        {mobileFiltered.map(u => {
          const RoleIcon = ROLE_ICONS[u.role]
          const roleColor = ROLE_COLORS[u.role]
          const inactive = u.isActive === false
          return (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="w-full flex items-center gap-3 p-3.5 rounded-lg text-left card-lift touch-manipulation"
              style={{
                background: inactive
                  ? 'linear-gradient(180deg,#FFFBFB 0%,#FFFFFF 60%)'
                  : 'var(--theme-bg-secondary)',
                boxShadow: 'var(--theme-shadow-card)',
                opacity: inactive ? 0.85 : 1,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: inactive ? 'var(--theme-bg-tertiary)' : roleColor.bg }}
              >
                <RoleIcon
                  className="w-4.5 h-4.5"
                  style={{ color: inactive ? 'var(--theme-text-muted)' : roleColor.color }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--theme-text-primary)' }}
                  >
                    {u.fullName || u.username}
                  </p>
                  {inactive && (
                    <span
                      className="shrink-0 type-overline px-1.5 py-0.5 rounded"
                      style={{
                        background: 'var(--theme-status-error-light)',
                        color: 'var(--theme-status-error)',
                      }}
                    >
                      Tạm dừng
                    </span>
                  )}
                </div>
                {(() => {
                  const items: ReactNode[] = []
                  const sep = <span key="sep" className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>·</span>
                  if (u.phone) {
                    items.push(
                      <span key="phone" className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{u.phone}</span>
                      </span>,
                    )
                  }
                  if (u.role === 'driver' && u.vehiclePlate) {
                    if (items.length) items.push(sep)
                    items.push(
                      <span key="plate" className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>{u.vehiclePlate}</span>,
                    )
                  }
                  return (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">{items}</div>
                  )
                })()}
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
            </button>
          )
        })}
      </div>

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: queryKeys.users })}
        roles={editableRoles}
      />

      <UserDetailDialog
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        editableRoles={editableRoles}
        saving={updateUser.isPending || deleteUser.isPending}
      />
      </div>
    </>
  )
}

export function UserManagement() {
  const { user } = useAuth()

  // Guard: director, superadmin, and accountant (needs to create driver accounts)
  if (!user || !['director', 'superadmin', 'accountant'].includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <UserManagementInner />
}
