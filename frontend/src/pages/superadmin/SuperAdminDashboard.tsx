import { LayoutDashboard, Truck, CircleDollarSign, Shield, Search, Users, X } from 'lucide-react'
import { FilterPills } from '@/components/shared/FilterPills'
import { UserCard } from '@/components/shared/UserCard'
import { ROLE_LABELS, type Role } from '@/data/domain'
import { type UserAccount } from '@/services/api/users.api'

const ROLE_COLORS = {
  superadmin: { bg: 'var(--theme-status-info-light)', color: 'var(--theme-status-info)' },
  director: { bg: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' },
  driver: { bg: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' },
  accountant: { bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' },
}

export function SuperAdminDashboard({
  users,
  filterRole,
  setFilterRole,
  searchQuery,
  setSearchQuery,
  onViewUser,
}: {
  users: UserAccount[]
  filterRole: Role | 'ALL'
  setFilterRole: (r: Role | 'ALL') => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  onViewUser: (u: UserAccount) => void
}) {
  const counts = {
    superadmin: users.filter(u => u.role === 'superadmin' && u.isActive).length,
    director: users.filter(u => u.role === 'director' && u.isActive).length,
    driver: users.filter(u => u.role === 'driver' && u.isActive).length,
    accountant: users.filter(u => u.role === 'accountant' && u.isActive).length,
  }

  const totalActive = counts.superadmin + counts.director + counts.driver + counts.accountant

  const filtered = users.filter(u => {
    const roleOk = filterRole === 'ALL' || u.role === filterRole
    const searchOk = !searchQuery.trim() ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.fullName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone ?? '').includes(searchQuery) ||
      (u.cccd ?? '').includes(searchQuery) ||
      u.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.tractorPlate ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    return roleOk && searchOk
  })

  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--theme-text-primary)' }}>
          Quản lý tài khoản
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
          {totalActive} tài khoản đang hoạt động
        </p>
      </div>

      {/* Stats Cards - Redesigned */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: ROLE_LABELS.superadmin, value: counts.superadmin, icon: Shield, role: 'superadmin' as const },
          { label: ROLE_LABELS.director, value: counts.director, icon: LayoutDashboard, role: 'director' as const },
          { label: ROLE_LABELS.driver, value: counts.driver, icon: Truck, role: 'driver' as const },
          { label: ROLE_LABELS.accountant, value: counts.accountant, icon: CircleDollarSign, role: 'accountant' as const },
        ]).map(({ label, value, icon: Icon, role }) => {
          const colors = ROLE_COLORS[role]
          return (
            <button
              key={label}
              onClick={() => setFilterRole(filterRole === role ? 'ALL' : role)}
              className="flex items-center gap-3 rounded-2xl p-4 transition-all hover:shadow-md active:scale-[0.98]"
              style={{ 
                background: 'var(--theme-bg-secondary)', 
                border: filterRole === role ? `2px solid ${colors.color}` : '1px solid var(--theme-border-default)',
                boxShadow: 'var(--theme-shadow-sm)',
              }}
            >
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: colors.bg }}
              >
                <Icon className="w-5 h-5" style={{ color: colors.color }} />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--theme-text-primary)' }}>{value}</p>
                <p className="text-xs font-medium mt-1" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Search and Filter - Redesigned */}
      <div 
        className="rounded-2xl p-4"
        style={{ 
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          boxShadow: 'var(--theme-shadow-sm)',
        }}
      >
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên, SĐT, nhà thầu, biển số..."
            className="w-full h-12 rounded-xl pl-11 pr-10 text-sm transition-all focus:ring-2 focus:ring-[var(--theme-brand-primary)] focus:ring-opacity-20"
            style={{ 
              background: 'var(--theme-bg-tertiary)', 
              border: '1px solid transparent',
              color: 'var(--theme-text-primary)' 
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center transition hover:bg-[var(--theme-border-default)]"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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

      {/* User List - Redesigned */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            Danh sách tài khoản
          </p>
          <span 
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
          >
            {filtered.length} kết quả
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(u => (
            <UserCard key={u.id} user={u} onTap={() => onViewUser(u)} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div 
            className="rounded-2xl p-10 text-center"
            style={{ 
              background: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border-default)',
            }}
          >
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--theme-bg-tertiary)' }}
            >
              <Users className="h-6 w-6" style={{ color: 'var(--theme-text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              Không tìm thấy tài khoản
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
