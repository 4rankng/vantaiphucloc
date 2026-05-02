import { Users, Phone, CreditCard, Truck } from 'lucide-react'
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
}: {
  users: UserAccount[]
  filterRole: Role | 'ALL'
  setFilterRole: (r: Role | 'ALL') => void
  onViewUser: (u: UserAccount) => void
}) {
  const filtered = filterRole === 'ALL' ? users : users.filter(u => u.role === filterRole)

  return (
    <div className="pb-24 space-y-3">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {filtered.map(u => {
          const RoleIcon = ROLE_ICONS[u.role] ?? Users
          const rc = ROLE_COLORS[u.role]
          return (
            <button
              key={u.id}
              onClick={() => onViewUser(u)}
              className="group w-full text-left rounded-xl px-3 py-2 transition-all active:scale-[0.99] hover:shadow-sm touch-manipulation"
              style={{
                background: 'var(--theme-bg-secondary)',
                border: '1px solid var(--theme-border-default)',
                boxShadow: 'var(--theme-shadow-xs)',
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: rc.bg }}
                >
                  <RoleIcon className="w-3 h-3" style={{ color: rc.color }} />
                </div>
                <div className="min-w-0 truncate">
                  <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {u.fullName || u.username}
                  </span>
                  <span className="text-[11px] ml-1" style={{ color: 'var(--theme-text-muted)' }}>
                    ({u.username})
                  </span>
                </div>
                {!u.isActive && (
                  <span
                    className="text-[9px] font-bold uppercase px-1 py-px rounded-full shrink-0"
                    style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}
                  >
                    OFF
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Phone className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                <span className="text-[11px]" style={{ color: 'var(--theme-text-secondary)' }}>{u.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <CreditCard className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                <span className="text-[11px]" style={{ color: 'var(--theme-text-secondary)' }}>{u.cccd || '—'}</span>
              </div>
              {u.tractorPlate && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Truck className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                  <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>{u.tractorPlate}</span>
                </div>
              )}
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div
            className="col-span-full rounded-xl p-8 text-center"
            style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
          >
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có tài khoản</p>
          </div>
        )}
      </div>
    </div>
  )
}
