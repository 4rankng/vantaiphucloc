import { useState, useMemo, useRef, useEffect } from 'react'
import { Plus, Search, Phone, Building2, Eye, Pencil, Play } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { BrandIcon } from '@/components/atoms/BrandIcon'
import { ROLE_LABELS, type Role } from '@/data/domain'
import { type UserAccount } from '@/services/api/users.api'

// ─── Role styling ─────────────────────────────────────────────────────────────
const ROLE_STYLE: Record<string, {
  avatarBg: string
  avatarColor: string
  tagBg: string
  tagColor: string
}> = {
  superadmin: {
    avatarBg: 'var(--theme-text-primary)',
    avatarColor: '#fff',
    tagBg: 'var(--theme-text-primary)',
    tagColor: '#fff',
  },
  director: {
    avatarBg: '#F1ECF9',
    avatarColor: '#6E45B0',
    tagBg: '#F1ECF9',
    tagColor: '#6E45B0',
  },
  driver: {
    avatarBg: 'var(--theme-brand-primary-light)',
    avatarColor: 'var(--theme-brand-primary)',
    tagBg: 'var(--theme-brand-primary-light)',
    tagColor: 'var(--theme-brand-primary)',
  },
  accountant: {
    avatarBg: '#FFF5E1',
    avatarColor: '#C77A00',
    tagBg: '#FFF5E1',
    tagColor: '#C77A00',
  },
}

function getInitials(user: UserAccount): string {
  const name = (user.fullName || user.username).trim()
  const parts = name.split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// ─── Sorting ──────────────────────────────────────────────────────────────────
type SortKey = 'newest' | 'name' | 'role'
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name',   label: 'Tên A–Z'  },
  { value: 'role',   label: 'Vai trò'  },
]
const ROLE_ORDER: Record<string, number> = {
  superadmin: 0, director: 1, accountant: 2, driver: 3,
}

const PAGE_SIZE = 16

// ─── UserCard ─────────────────────────────────────────────────────────────────
function UserCard({
  user,
  onView,
  onEdit,
  onActivate,
}: {
  user: UserAccount
  onView: () => void
  onEdit: () => void
  onActivate?: () => void
}) {
  const rs = ROLE_STYLE[user.role] ?? ROLE_STYLE.driver
  const inactive = !user.isActive

  return (
    <article
      className="group relative flex flex-col gap-3.5 rounded-2xl border p-[18px] transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: inactive
          ? 'linear-gradient(180deg,#FFFBFB 0%,#FFFFFF 60%)'
          : 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        boxShadow: 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 1px 3px rgba(14,17,22,0.06),0 4px 12px rgba(14,17,22,0.04)'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-border-strong)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none'
        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-border-default)'
      }}
    >
      {/* ── Top row ── */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[15px] tracking-tight select-none"
          style={{
            background: inactive ? 'var(--theme-bg-tertiary)' : rs.avatarBg,
            color:      inactive ? 'var(--theme-text-muted)'  : rs.avatarColor,
          }}
        >
          {getInitials(user)}
          {/* Status dot */}
          <span
            className="absolute -bottom-[2px] -right-[2px] w-3 h-3 rounded-full border-2 border-white"
            style={{
              background: inactive
                ? 'var(--theme-border-strong)'
                : 'var(--theme-status-success)',
            }}
          />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div
            className="text-[15px] font-bold tracking-tight truncate mb-1"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {user.fullName || user.username}
          </div>
          <div className="flex items-center gap-2 text-xs">
            {/* Role tag */}
            <span
              className="inline-flex items-center px-2 py-[2px] rounded-[6px] text-[11px] font-semibold leading-none"
              style={{
                background: inactive ? 'var(--theme-bg-tertiary)' : rs.tagBg,
                color:      inactive ? 'var(--theme-text-muted)'  : rs.tagColor,
              }}
            >
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
            <span
              className="font-mono text-[11px] truncate"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              {user.username}
            </span>
          </div>
        </div>

        {/* Paused badge */}
        {inactive && (
          <span
            className="flex-shrink-0 flex items-center gap-1 px-2 py-[3px] rounded-[6px] text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'var(--theme-status-error-light)',
              color: 'var(--theme-status-error)',
            }}
          >
            <span
              className="w-[5px] h-[5px] rounded-full"
              style={{ background: 'var(--theme-status-error)' }}
            />
            Tạm dừng
          </span>
        )}
      </div>

      {/* ── Info rows ── */}
      <div
        className="flex flex-col gap-2 pt-3 border-t border-dashed"
        style={{ borderColor: 'var(--theme-border-default)' }}
      >
        <div
          className="flex items-center gap-2.5 text-[12.5px]"
          style={{ color: 'var(--theme-text-secondary)' }}
        >
          <Phone
            className="w-3.5 h-3.5 flex-shrink-0"
            style={{ color: 'var(--theme-text-muted)' }}
            strokeWidth={2}
          />
          {user.phone ? (
            <span className="font-mono-num">{user.phone}</span>
          ) : (
            <span
              className="italic"
              style={{ color: 'var(--theme-text-muted)', opacity: 0.7 }}
            >
              Chưa cập nhật
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-2.5 text-[12.5px] truncate"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          <Building2
            className="w-3.5 h-3.5 flex-shrink-0"
            strokeWidth={2}
          />
          <span className="truncate">{user.vendor || 'Vận Tải Phúc Lộc'}</span>
        </div>
      </div>

      {/* ── Hover footer ── */}
      <div
        className="flex gap-1.5 pt-3 border-t transition-all duration-200 overflow-hidden"
        style={{
          borderColor: 'var(--theme-border-default)',
          opacity: 0,
          maxHeight: 0,
          paddingTop: 0,
          borderTopWidth: 0,
        }}
        ref={el => {
          if (!el) return
          const card = el.closest('article')
          if (!card) return
          const show = () => {
            el.style.opacity = '1'
            el.style.maxHeight = '60px'
            el.style.paddingTop = '12px'
            el.style.borderTopWidth = '1px'
          }
          const hide = () => {
            el.style.opacity = '0'
            el.style.maxHeight = '0'
            el.style.paddingTop = '0'
            el.style.borderTopWidth = '0'
          }
          card.addEventListener('mouseenter', show)
          card.addEventListener('mouseleave', hide)
        }}
      >
        <button
          onClick={e => { e.stopPropagation(); onView() }}
          className="flex flex-1 items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: 'var(--theme-bg-tertiary)',
            color: 'var(--theme-text-secondary)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--theme-border-default)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--theme-text-primary)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--theme-text-secondary)'
          }}
        >
          <Eye className="w-3 h-3" strokeWidth={2} />
          Xem
        </button>

        {inactive ? (
          <button
            onClick={e => { e.stopPropagation(); onActivate?.() }}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: 'var(--theme-brand-primary)',
              color: '#fff',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.opacity = '0.88'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.opacity = '1'
            }}
          >
            <Play className="w-3 h-3" strokeWidth={2.2} />
            Kích hoạt lại
          </button>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: 'var(--theme-brand-primary)',
              color: '#fff',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.opacity = '0.88'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.opacity = '1'
            }}
          >
            <Pencil className="w-3 h-3" strokeWidth={2.2} />
            Chỉnh sửa
          </button>
        )}
      </div>
    </article>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function SuperAdminDashboard({
  users,
  filterRole,
  setFilterRole,
  onViewUser,
  onCreateUser,
  onActivateUser,
  createButtonColor,
}: {
  users: UserAccount[]
  filterRole: Role | 'ALL'
  setFilterRole: (r: Role | 'ALL') => void
  onViewUser: (u: UserAccount) => void
  onCreateUser?: () => void
  onActivateUser?: (u: UserAccount) => void
  createButtonColor?: string
}) {
  const [search, setSearch]     = useState('')
  const [sortKey, setSortKey]   = useState<SortKey>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Reset visible count when filter/search changes
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [filterRole, search, sortKey])

  // ── Role counts for tabs ──
  const counts = useMemo(() => ({
    ALL:        users.length,
    superadmin: users.filter(u => u.role === 'superadmin').length,
    director:   users.filter(u => u.role === 'director').length,
    driver:     users.filter(u => u.role === 'driver').length,
    accountant: users.filter(u => u.role === 'accountant').length,
  }), [users])

  // ── Filter ──
  const filtered = useMemo(() => {
    let list = filterRole === 'ALL' ? users : users.filter(u => u.role === filterRole)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        (u.fullName ?? '').toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.phone ?? '').includes(q),
      )
    }
    // Sort
    const sorted = [...list]
    if (sortKey === 'name') {
      sorted.sort((a, b) =>
        (a.fullName || a.username).localeCompare(b.fullName || b.username, 'vi'),
      )
    } else if (sortKey === 'role') {
      sorted.sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99))
    }
    // newest: keep API order (already newest-first from backend)
    return sorted
  }, [users, filterRole, search, sortKey])

  const visible  = filtered.slice(0, visibleCount)
  const hasMore  = filtered.length > visibleCount
  const sortLabel = SORT_OPTIONS.find(o => o.value === sortKey)?.label ?? 'Mới nhất'

  const ALL_TABS: { value: Role | 'ALL'; label: string }[] = [
    { value: 'ALL',        label: 'Tất cả'    },
    { value: 'superadmin', label: 'SuperAdmin' },
    { value: 'director',   label: ROLE_LABELS.director  },
    { value: 'driver',     label: ROLE_LABELS.driver    },
    { value: 'accountant', label: ROLE_LABELS.accountant },
  ]

  // Only show role tabs that have at least one user in the dataset
  const TABS = ALL_TABS.filter(tab =>
    tab.value === 'ALL' || (counts[tab.value as keyof typeof counts] ?? 0) > 0,
  )

  return (
    <div className="space-y-5">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* Tabs */}
        <div
          className="inline-flex gap-0.5 p-1 rounded-xl border"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
          }}
        >
          {TABS.map(tab => {
            const active = filterRole === tab.value
            const count  = counts[tab.value as keyof typeof counts] ?? 0
            return (
              <button
                key={tab.value}
                onClick={() => setFilterRole(tab.value as Role | 'ALL')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold transition-all duration-150"
                style={{
                  background: active ? 'var(--theme-text-primary)' : 'transparent',
                  color:      active ? '#fff' : 'var(--theme-text-muted)',
                }}
              >
                {tab.label}
                <span
                  className="px-[7px] py-[1px] rounded-full text-[11px] font-bold tabular-nums leading-none"
                  style={{
                    background: active
                      ? 'rgba(255,255,255,0.18)'
                      : 'var(--theme-bg-tertiary)',
                    color: active ? '#fff' : 'var(--theme-text-secondary)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div
          className="flex flex-1 min-w-[220px] items-center gap-2 px-3.5 h-11 rounded-xl transition-all"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
          }}
          onFocus={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-brand-primary)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 4px var(--theme-brand-primary-light)'
          }}
          onBlur={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--theme-border-default)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }}
        >
          <Search
            className="w-4 h-4 flex-shrink-0"
            style={{ color: 'var(--theme-text-muted)' }}
            strokeWidth={2}
          />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, username, số điện thoại…"
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: 'var(--theme-text-primary)' }}
          />
          <kbd
            className="flex-shrink-0 font-mono text-[11px] px-[6px] py-[1px] rounded border"
            style={{
              background: 'var(--theme-bg-tertiary)',
              border: '1px solid var(--theme-border-default)',
              color: 'var(--theme-text-muted)',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen(o => !o)}
            className="inline-flex items-center gap-2 h-11 px-3.5 rounded-xl text-[13px] font-semibold transition-all"
            style={{
              background: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border-default)',
              color: 'var(--theme-text-secondary)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
            Sắp xếp: {sortLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.15s', transform: sortOpen ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSortOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-1.5 z-20 min-w-[160px] rounded-xl border py-1 shadow-lg"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border-default)',
                }}
              >
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortKey(opt.value); setSortOpen(false) }}
                    className="w-full text-left px-3.5 py-2 text-[13px] font-medium transition-colors"
                    style={{
                      color: sortKey === opt.value
                        ? 'var(--theme-brand-primary)'
                        : 'var(--theme-text-secondary)',
                      background: 'transparent',
                      fontWeight: sortKey === opt.value ? 700 : 500,
                    }}
                    onMouseEnter={e =>
                      ((e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)')
                    }
                    onMouseLeave={e =>
                      ((e.currentTarget as HTMLElement).style.background = 'transparent')
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Create button */}
        {onCreateUser && (
          <button
            onClick={onCreateUser}
            className="btn-primary h-11"
            style={createButtonColor ? {
              background: createButtonColor,
              borderColor: createButtonColor,
            } : undefined}
          >
            <Plus size={16} strokeWidth={2.4} />
            <span>Tạo tài khoản</span>
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BrandIcon name="calkey" className="w-28 h-28" />}
            title={search ? 'Không tìm thấy kết quả' : 'Không có tài khoản'}
            description={
              search
                ? `Không có tài khoản khớp với "${search}"`
                : 'Tạo tài khoản đầu tiên để bắt đầu quản lý hệ thống'
            }
            illustration
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {visible.map(u => (
            <UserCard
              key={u.id}
              user={u}
              onView={() => onViewUser(u)}
              onEdit={() => onViewUser(u)}
              onActivate={() => onActivateUser?.(u)}
            />
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      {filtered.length > 0 && (
        <p
          className="text-center text-xs mt-4"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          Hiển thị{' '}
          <span className="font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>
            {visible.length}
          </span>{' '}
          / {filtered.length} tài khoản
          {hasMore && (
            <>
              {' · '}
              <button
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--theme-brand-primary)' }}
              >
                Tải thêm
              </button>
            </>
          )}
        </p>
      )}
    </div>
  )
}
