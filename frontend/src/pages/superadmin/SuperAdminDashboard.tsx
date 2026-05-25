import { useState } from 'react'
import { Users, Phone, CreditCard, Truck, Plus, Search, UserCheck, UserX, Shield, X } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { BrandIcon } from '@/components/atoms/BrandIcon'
import { FilterPills } from '@/components/shared/FilterPills'
import { ROLE_LABELS, type Role } from '@/data/domain'
import { ROLE_ICONS } from '@/pages/superadmin/types'
import { SUPERADMIN_ROLE_COLORS as ROLE_COLORS } from '@/lib/role-mappings'
import { type UserAccount } from '@/services/api/users.api'

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
  const [search, setSearch] = useState('')

  const activeUsers = users.filter(u => u.isActive).length
  const inactiveUsers = users.filter(u => !u.isActive).length
  const activePct = users.length > 0 ? Math.round((activeUsers / users.length) * 100) : 0

  const byRole = filterRole === 'ALL' ? users : users.filter(u => u.role === filterRole)
  const filtered = search.trim()
    ? byRole.filter(u => {
        const q = search.toLowerCase()
        return (
          (u.fullName ?? '').toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.phone ?? '').includes(q)
        )
      })
    : byRole

  const kpiCards = [
    {
      label: 'Tổng tài khoản',
      value: users.length,
      sub: 'Tất cả người dùng',
      icon: Users,
      iconBg: 'var(--theme-status-info-light)',
      iconColor: 'var(--theme-status-info)',
      accent: 'var(--theme-status-info)',
      valueColor: 'var(--theme-text-primary)',
    },
    {
      label: 'Đang hoạt động',
      value: activeUsers,
      sub: `${activePct}% đang online`,
      icon: UserCheck,
      iconBg: 'var(--theme-brand-primary-light)',
      iconColor: 'var(--theme-brand-primary)',
      accent: 'var(--theme-brand-primary)',
      valueColor: 'var(--theme-brand-primary)',
    },
    {
      label: 'Đã tạm dừng',
      value: inactiveUsers,
      sub: 'Cần xem xét',
      icon: UserX,
      iconBg: 'var(--theme-status-warning-light)',
      iconColor: 'var(--theme-status-warning)',
      accent: 'var(--theme-status-warning)',
      valueColor: 'var(--theme-status-warning)',
    },
  ]

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'var(--theme-status-info-light)',
              boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--theme-status-info) 15%, transparent)',
            }}
          >
            <Shield className="w-5 h-5" style={{ color: 'var(--theme-status-info)' }} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="typo-display leading-tight" style={{ color: 'var(--theme-text-primary)' }}>
              Quản lý tài khoản
            </h1>
            <p className="typo-meta mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
              Quản lý người dùng và phân quyền hệ thống
            </p>
          </div>
        </div>
        {onCreateUser && (
          <button onClick={onCreateUser} className="btn-primary shrink-0">
            <Plus size={15} strokeWidth={2.5} />
            <span>Tạo tài khoản</span>
          </button>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-3 gap-3.5">
        {kpiCards.map(card => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="card p-4 relative overflow-hidden transition-all"
              style={{ background: 'var(--theme-bg-secondary)' }}
            >
              {/* Left accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: card.accent, opacity: 0.85 }}
              />
              <div className="flex items-start gap-3.5 pl-1.5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: card.iconBg,
                    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${card.accent} 12%, transparent)`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.iconColor }} strokeWidth={2.1} />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[10.5px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--theme-text-muted)', letterSpacing: '0.07em' }}
                  >
                    {card.label}
                  </div>
                  <div
                    className="font-display font-bold leading-none mt-1.5"
                    style={{
                      color: card.valueColor,
                      fontSize: '28px',
                      fontVariantNumeric: 'tabular-nums lining-nums',
                      letterSpacing: '-0.025em',
                    }}
                  >
                    {card.value}
                  </div>
                  <div
                    className="text-[11.5px] mt-1.5"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    {card.sub}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Filter + Search toolbar ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
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

        {/* Search input */}
        <div
          className="flex items-center gap-2 px-3.5 h-9 rounded-xl shrink-0 transition-all focus-within:shadow-sm"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
            minWidth: '220px',
          }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, username, SĐT..."
            className="bg-transparent outline-none w-full text-xs"
            style={{ color: 'var(--theme-text-primary)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
              style={{ color: 'var(--theme-text-muted)' }}
              aria-label="Xoá tìm kiếm"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* ── Result count ── */}
      {(search.trim() || filterRole !== 'ALL') && filtered.length > 0 && (
        <div
          className="text-[11.5px] -mt-1"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          Hiển thị <span className="font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>{filtered.length}</span> / {users.length} tài khoản
        </div>
      )}

      {/* ── User grid ── */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BrandIcon name="calkey" className="w-28 h-28" />}
            title={search ? 'Không tìm thấy kết quả' : 'Không có tài khoản'}
            description={search ? `Không có tài khoản khớp với "${search}"` : 'Tạo tài khoản đầu tiên để bắt đầu quản lý hệ thống'}
            illustration
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(u => {
            const RoleIcon = ROLE_ICONS[u.role] ?? Users
            const rc = ROLE_COLORS[u.role]
            const inactive = !u.isActive

            // Inactive cards: muted gray header instead of role color
            const headerBg = inactive ? 'var(--theme-bg-tertiary)' : rc.bg
            const headerFg = inactive ? 'var(--theme-text-muted)' : rc.color
            const iconChipBg = inactive
              ? 'var(--theme-bg-secondary)'
              : 'rgba(255,255,255,0.6)'

            return (
              <button
                key={u.id}
                onClick={() => onViewUser(u)}
                className="card-interactive p-0 text-left overflow-hidden group transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  opacity: inactive ? 0.92 : 1,
                }}
              >
                {/* Colored role header strip */}
                <div
                  className="px-3 pt-2.5 pb-2 flex items-center justify-between gap-2"
                  style={{ background: headerBg }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: iconChipBg }}
                    >
                      <RoleIcon
                        className="w-3.5 h-3.5"
                        style={{ color: headerFg }}
                        strokeWidth={2.2}
                      />
                    </div>
                    <span
                      className="text-[10.5px] font-bold uppercase tracking-wider truncate"
                      style={{ color: headerFg, letterSpacing: '0.05em' }}
                    >
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </div>
                  {inactive && (
                    <span
                      className="flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: 'var(--theme-status-error-light)',
                        color: 'var(--theme-status-error)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: 'var(--theme-status-error)' }}
                      />
                      Dừng
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="px-3 pt-3 pb-3 space-y-2.5">
                  {/* Name + username */}
                  <div className="min-w-0">
                    <p
                      className="typo-h3 truncate leading-snug"
                      style={{ color: 'var(--theme-text-primary)' }}
                    >
                      {u.fullName || u.username}
                    </p>
                    <p
                      className="text-[11px] truncate mt-0.5 font-mono-num"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      @{u.username}
                    </p>
                  </div>

                  {/* Divider */}
                  <div
                    className="h-px w-full"
                    style={{ background: 'var(--theme-border-default)', opacity: 0.7 }}
                  />

                  {/* Contact info */}
                  <div className="space-y-1.5">
                    {u.phone ? (
                      <div
                        className="flex items-center gap-2 min-w-0 text-[11.5px]"
                        style={{ color: 'var(--theme-text-secondary)' }}
                      >
                        <Phone
                          className="w-3 h-3 shrink-0"
                          style={{ color: 'var(--theme-text-muted)' }}
                          strokeWidth={2.2}
                        />
                        <span className="truncate font-mono-num">{u.phone}</span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-2 min-w-0 text-[11.5px] italic"
                        style={{ color: 'var(--theme-text-muted)', opacity: 0.6 }}
                      >
                        <Phone className="w-3 h-3 shrink-0" strokeWidth={2} />
                        <span>Chưa có SĐT</span>
                      </div>
                    )}
                    {u.cccd && (
                      <div
                        className="flex items-center gap-2 min-w-0 text-[11.5px]"
                        style={{ color: 'var(--theme-text-secondary)' }}
                      >
                        <CreditCard
                          className="w-3 h-3 shrink-0"
                          style={{ color: 'var(--theme-text-muted)' }}
                          strokeWidth={2.2}
                        />
                        <span className="truncate font-mono-num">{u.cccd}</span>
                      </div>
                    )}
                    {u.vendor && (
                      <div
                        className="flex items-center gap-2 min-w-0 text-[11px]"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        <Truck className="w-3 h-3 shrink-0" strokeWidth={2.2} />
                        <span className="truncate">{u.vendor}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
