import { Users, Phone, CreditCard, Truck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { BrandIcon } from '@/components/atoms/BrandIcon'
import { FilterPills } from '@/components/shared/FilterPills'
import { ROLE_LABELS, type Role } from '@/data/domain'
import { ROLE_ICONS } from '@/pages/superadmin/types'
import { type UserAccount } from '@/services/api/users.api'

const ROLE_COLORS: Record<Role, { bg: string; color: string }> = {
  superadmin: { bg: 'var(--theme-status-info-light)', color: 'var(--theme-status-info)' },
  director: { bg: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' },
  driver: { bg: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' },
  accountant: { bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' },
}

export function SuperAdminDashboard({
  users,
  filterRole,
  setFilterRole,
  onViewUser,
  onCreateUser,
}: {
  users: UserAccount[]
  filterRole: Role | 'ALL'
  setFilterRole: (r: Role | 'ALL') => void
  onViewUser: (u: UserAccount) => void
  onCreateUser?: () => void
}) {
  const filtered = filterRole === 'ALL' ? users : users.filter(u => u.role === filterRole)
  const activeUsers = users.filter(u => u.isActive).length
  const inactiveUsers = users.filter(u => !u.isActive).length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Tổng quan"
        icon="analytics"
        subtitle="Quản lý tài khoản và hệ thống"
        onAdd={onCreateUser}
        addLabel="Tạo tài khoản"
      />

      {/* KPI cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total users card */}
        <div
          className="card p-4"
          style={{ background: 'var(--theme-bg-secondary)' }}
        >
          <div className="typo-label" style={{ color: 'var(--theme-text-muted)' }}>
            Tổng tài khoản
          </div>
          <div className="typo-value-lg mt-2 font-mono-num" style={{ color: 'var(--theme-text-primary)' }}>
            {users.length}
          </div>
          <div className="typo-meta mt-1.5">Tất cả người dùng</div>
        </div>

        {/* Active users card */}
        <div
          className="card p-4"
          style={{ background: 'var(--theme-bg-secondary)' }}
        >
          <div className="typo-label" style={{ color: 'var(--theme-text-muted)' }}>
            Đang hoạt động
          </div>
          <div className="typo-value-lg mt-2 font-mono-num" style={{ color: 'var(--theme-brand-primary)' }}>
            {activeUsers}
          </div>
          <div className="typo-meta mt-1.5">
            {users.length > 0 ? `${Math.round((activeUsers / users.length) * 100)}%` : '0%'} hoạt động
          </div>
        </div>

        {/* Inactive users card */}
        <div
          className="card p-4"
          style={{ background: 'var(--theme-bg-secondary)' }}
        >
          <div className="typo-label" style={{ color: 'var(--theme-text-muted)' }}>
            Đã tạm dừng
          </div>
          <div className="typo-value-lg mt-2 font-mono-num" style={{ color: 'var(--theme-status-warning)' }}>
            {inactiveUsers}
          </div>
          <div className="typo-meta mt-1.5">Cần xem xét</div>
        </div>
      </div>

      {/* Filter pills */}
      <div>
        <FilterPills
          options={[
            { value: 'ALL', label: 'Tất cả', count: users.length },
            { value: 'superadmin', label: ROLE_LABELS.superadmin, count: users.filter(u => u.role === 'superadmin').length },
            { value: 'director', label: ROLE_LABELS.director, count: users.filter(u => u.role === 'director').length },
            { value: 'driver', label: ROLE_LABELS.driver, count: users.filter(u => u.role === 'driver').length },
            { value: 'accountant', label: ROLE_LABELS.accountant, count: users.filter(u => u.role === 'accountant').length },
          ]}
          value={filterRole}
          onChange={setFilterRole}
        />
      </div>

      {/* User grid or empty state */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BrandIcon name="calkey" className="w-28 h-28" />}
            title="Không có tài khoản"
            description="Tạo tài khoản đầu tiên để bắt đầu quản lý hệ thống"
            illustration
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(u => {
            const RoleIcon = ROLE_ICONS[u.role] ?? Users
            const rc = ROLE_COLORS[u.role]
            return (
              <button
                key={u.id}
                onClick={() => onViewUser(u)}
                className="card-interactive p-3 text-left"
                style={{
                  background: 'var(--theme-bg-secondary)',
                }}
              >
                {/* Header with icon and status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: rc.bg }}
                  >
                    <RoleIcon className="w-3.5 h-3.5" style={{ color: rc.color }} />
                  </div>
                  {!u.isActive && (
                    <span
                      className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-sm shrink-0"
                      style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}
                    >
                      Dừng
                    </span>
                  )}
                </div>

                {/* User name and username */}
                <div className="min-w-0 mb-2">
                  <p className="typo-h3 truncate" style={{ color: 'var(--theme-text-primary)' }}>
                    {u.fullName || u.username}
                  </p>
                  <p className="typo-meta truncate" style={{ color: 'var(--theme-text-muted)' }}>
                    {u.username}
                  </p>
                </div>

                {/* Contact info */}
                <div className="space-y-1 text-[11px]">
                  {u.phone && (
                    <div className="flex items-center gap-1 min-w-0 text-gray-600" style={{ color: 'var(--theme-text-secondary)' }}>
                      <Phone className="w-3 h-3 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                      <span className="truncate">{u.phone}</span>
                    </div>
                  )}
                  {u.cccd && (
                    <div className="flex items-center gap-1 min-w-0" style={{ color: 'var(--theme-text-secondary)' }}>
                      <CreditCard className="w-3 h-3 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                      <span className="truncate">{u.cccd}</span>
                    </div>
                  )}
                  {u.tractorPlate && (
                    <div className="flex items-center gap-1 min-w-0" style={{ color: 'var(--theme-text-secondary)' }}>
                      <Truck className="w-3 h-3 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                      <span className="font-mono text-[10px] truncate">{u.tractorPlate}</span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
