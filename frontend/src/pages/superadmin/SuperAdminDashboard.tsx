import { LayoutDashboard, Truck, CircleDollarSign, Shield, Search } from 'lucide-react'
import { FilterPills } from '@/components/shared/FilterPills'
import { UserCard } from '@/components/shared/UserCard'
import { ROLE_LABELS, type Role } from '@/data/domain'
import { type UserAccount } from './types'

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
    superadmin: users.filter(u => u.role === 'superadmin' && u.active).length,
    director: users.filter(u => u.role === 'director' && u.active).length,
    driver: users.filter(u => u.role === 'driver' && u.active).length,
    accountant: users.filter(u => u.role === 'accountant' && u.active).length,
  }

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
    <div className="pb-24 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        {([
          { label: ROLE_LABELS.superadmin, value: counts.superadmin, icon: Shield },
          { label: ROLE_LABELS.director, value: counts.director, icon: LayoutDashboard },
          { label: ROLE_LABELS.driver, value: counts.driver, icon: Truck },
          { label: ROLE_LABELS.accountant, value: counts.accountant, icon: CircleDollarSign },
        ] as const).map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2 rounded-2xl p-3"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--theme-brand-primary-light)' }}>
              <Icon className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums leading-none" style={{ color: 'var(--theme-text-primary)' }}>{value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm tên, SĐT, nhà thầu, biển số..."
            className="w-full h-10 rounded-xl pl-9 pr-3 text-sm"
            style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
          />
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

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--theme-text-muted)' }}>
          {filtered.length} tài khoản
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
          {filtered.map(u => (
            <UserCard key={u.id} user={u} onTap={() => onViewUser(u)} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không tìm thấy tài khoản</p>
          </div>
        )}
      </div>
    </div>
  )
}
