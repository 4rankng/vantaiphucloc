import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { InfoRow } from '@/components/shared/InfoRow'
import { UserCircle, Plus, Trash2, Pencil, Users, Truck, CircleDollarSign, LayoutDashboard, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { SheetPicker } from '@/components/shared/SheetPicker'
import type { Role } from '@/data/domain'
import { ROLE_LABELS } from '@/data/domain'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserAccount {
  id: string
  name: string
  phone: string
  role: Role
  company: string
  tractorPlate?: string
  active: boolean
  createdAt: string
}

// ─── Mock Users ───────────────────────────────────────────────────────────────

const MOCK_USERS: UserAccount[] = [
  { id: 'DIR-001', name: 'Trần Văn Minh', phone: '0901 234 567', role: 'director', company: 'Phúc Lộc', active: true, createdAt: '2026-01-15' },
  { id: 'DIR-002', name: 'Nguyễn Thanh Hải', phone: '0902 345 678', role: 'director', company: 'Thanh Bình', active: true, createdAt: '2026-02-20' },
  { id: 'DRV-001', name: 'Nguyễn Văn Hùng', phone: '0903 111 222', role: 'driver', company: 'Phúc Lộc', tractorPlate: '15C-136.31', active: true, createdAt: '2026-01-15' },
  { id: 'DRV-002', name: 'Trần Minh Tuấn', phone: '0903 222 333', role: 'driver', company: 'Phúc Lộc', tractorPlate: '15C-139.82', active: true, createdAt: '2026-01-15' },
  { id: 'DRV-003', name: 'Lê Hoàng Nam', phone: '0903 333 444', role: 'driver', company: 'Phúc Lộc', tractorPlate: '15C-070.63', active: true, createdAt: '2026-02-01' },
  { id: 'DRV-004', name: 'Phạm Đức Anh', phone: '0903 444 555', role: 'driver', company: 'Thanh Bình', tractorPlate: '15C-180.99', active: true, createdAt: '2026-02-20' },
  { id: 'DRV-005', name: 'Hoàng Văn Long', phone: '0903 555 666', role: 'driver', company: 'Thanh Bình', tractorPlate: '15C-091.45', active: false, createdAt: '2026-03-05' },
  { id: 'ACC-001', name: 'Phạm Thị Lan', phone: '0904 111 222', role: 'accountant', company: 'Phúc Lộc', active: true, createdAt: '2026-01-15' },
  { id: 'ACC-002', name: 'Võ Minh Tuấn', phone: '0904 222 333', role: 'accountant', company: 'Thanh Bình', active: true, createdAt: '2026-02-20' },
]

const ROLE_ICONS: Record<string, typeof Users> = {
  director: LayoutDashboard,
  driver: Truck,
  accountant: CircleDollarSign,
}

const CREATEABLE_ROLES: { value: Role; label: string }[] = [
  { value: 'director', label: ROLE_LABELS.director },
  { value: 'driver', label: ROLE_LABELS.driver },
  { value: 'accountant', label: ROLE_LABELS.accountant },
]

// ─── User Card ────────────────────────────────────────────────────────────────

function UserCard({ user, onTap }: { user: UserAccount; onTap: () => void }) {
  const RoleIcon = ROLE_ICONS[user.role] ?? Users

  return (
    <button
      onClick={onTap}
      className="w-full text-left rounded-2xl p-3.5 transition-all active:scale-[0.98] touch-manipulation"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)' }}>
          <RoleIcon className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>{user.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
              {ROLE_LABELS[user.role]}
            </span>
            {user.tractorPlate && (
              <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {user.tractorPlate}
              </span>
            )}
          </div>
        </div>
        {!user.active && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}>
            Ngưng
          </span>
        )}
      </div>
    </button>
  )
}

// ─── User Detail Dialog ───────────────────────────────────────────────────────

function UserDetailDialog({
  user,
  open,
  onClose,
}: {
  user: UserAccount | null
  open: boolean
  onClose: () => void
}) {
  if (!user) return null
  const RoleIcon = ROLE_ICONS[user.role] ?? Users

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Chi tiết tài khoản</DialogTitle></DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--theme-brand-primary-light)' }}>
            <RoleIcon className="w-6 h-6" style={{ color: 'var(--theme-brand-primary)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{user.name}</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>

        <div className="space-y-0">
          <InfoRow icon={Users} label="Công ty" value={user.company} noBorder />
          {user.tractorPlate && <InfoRow icon={Truck} label="Biển số đầu kéo" value={user.tractorPlate} noBorder />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={onClose} className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Create User Dialog ───────────────────────────────────────────────────────

function CreateUserDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [form, setForm] = useState({ name: '', phone: '', role: 'driver' as Role, company: '', password: '', tractorPlate: '' })

  const handleSubmit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.company.trim() || !form.password.trim()) return
    // In real app: call API
    onClose()
    setForm({ name: '', phone: '', role: 'driver', company: '', password: '', tractorPlate: '' })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo tài khoản</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ tên</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nguyễn Văn A" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0901 234 567" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Vai trò</Label>
            <SheetPicker
              options={CREATEABLE_ROLES}
              value={form.role}
              onChange={v => setForm(f => ({ ...f, role: v as Role }))}
              placeholder="Chọn vai trò"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Công ty</Label>
            <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Tên công ty" className="text-sm" />
          </div>
          {form.role === 'driver' && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số đầu kéo</Label>
              <Input value={form.tractorPlate} onChange={e => setForm(f => ({ ...f, tractorPlate: e.target.value }))} placeholder="15C-123.45" className="text-sm font-mono" />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSubmit}
            disabled={!form.name.trim() || !form.phone.trim() || !form.company.trim() || !form.password.trim()}
            className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── SuperAdmin Dashboard ─────────────────────────────────────────────────────

function SuperAdminDashboard({
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
    director: users.filter(u => u.role === 'director' && u.active).length,
    driver: users.filter(u => u.role === 'driver' && u.active).length,
    accountant: users.filter(u => u.role === 'accountant' && u.active).length,
  }

  const filtered = users.filter(u => {
    const roleOk = filterRole === 'ALL' || u.role === filterRole
    const searchOk = !searchQuery.trim() ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      u.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.tractorPlate ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    return roleOk && searchOk
  })

  return (
    <div className="pb-24">
      {/* Stats */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-2">
        {([
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
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-4 mt-4 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm tên, SĐT, công ty, biển số..."
            className="w-full h-10 rounded-xl pl-9 pr-3 text-sm"
            style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
          />
        </div>

        {/* Role filter pills */}
        <div className="flex gap-2 overflow-x-auto">
          {(['ALL', 'director', 'driver', 'accountant'] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all touch-manipulation"
              style={{
                background: filterRole === r ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                color: filterRole === r ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
                border: `1px solid ${filterRole === r ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
              }}
            >
              {r === 'ALL' ? 'Tất cả' : ROLE_LABELS[r]} ({r === 'ALL' ? users.length : users.filter(u => u.role === r).length})
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      <div className="px-4 mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--theme-text-muted)' }}>
          {filtered.length} tài khoản
        </p>
        <div className="space-y-2">
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

// ─── Main SuperAdmin App ──────────────────────────────────────────────────────

export function SuperAdminApp() {
  const { user } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const [users] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('ttransport_superadmin_users')
    return saved ? JSON.parse(saved) : MOCK_USERS
  })

  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      <AppTopBar
        variant="home"
        name={user?.name ?? ''}
        onProfile={() => setDropdownOpen(true)}
        onNotifications={() => {}}
      />
      <SuperAdminDashboard
        users={users}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onViewUser={setSelectedUser}
      />
      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => setCreateOpen(true)} label="Tạo tài khoản" />
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserDetailDialog user={selectedUser} open={!!selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  )
}
