import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { UserDropdown } from '@/components/shared/ProfileDialog'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { InfoRow } from '@/components/shared/InfoRow'
import { Users, Plus, Truck, CircleDollarSign, LayoutDashboard, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { FilterPills } from '@/components/shared/FilterPills'
import { useToast } from '@/components/atoms/Toast'
import { api } from '@/services/api/client'
import type { Role } from '@/data/domain'
import { ROLE_LABELS } from '@/data/domain'

const PHUC_LOC = 'Phúc Lộc'

interface UserAccount {
  id: string
  username: string
  phone: string
  email?: string
  role: Role
  vendor: string
  tractorPlate?: string
  active: boolean
  createdAt: string
}

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

function toUserAccount(obj: Record<string, unknown>): UserAccount {
  return {
    id: String(obj.id),
    username: obj.username as string,
    phone: obj.phone as string,
    email: obj.email as string | undefined,
    role: obj.role as Role,
    vendor: (obj.vendor as string) || PHUC_LOC,
    tractorPlate: obj.tractor_plate as string | undefined,
    active: obj.is_active as boolean,
    createdAt: obj.created_at as string,
  }
}

// ─── User Card ────────────────────────────────────────────────────────────────

function UserCard({ user, onTap }: { user: UserAccount; onTap: () => void }) {
  const RoleIcon = ROLE_ICONS[user.role] ?? Users
  const displayName = user.username

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
          <p className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>{displayName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
              {ROLE_LABELS[user.role]}
            </span>
            {user.role === 'driver' && user.vendor !== PHUC_LOC && (
              <span className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {user.vendor}
              </span>
            )}
            {user.tractorPlate && (
              <span className="text-xs font-mono font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {user.tractorPlate}
              </span>
            )}
          </div>
        </div>
        {!user.active && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
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
            <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{user.username}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>
        <div className="space-y-0">
          <InfoRow icon={Users} label={user.role === 'driver' ? 'Nhà thầu' : 'Công ty'} value={user.vendor} noBorder />
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
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    username: '',
    phone: '',
    role: 'driver' as Role,
    vendor: PHUC_LOC,
    password: '',
    tractorPlate: '',
  })

  const isInternalRole = form.role === 'director' || form.role === 'accountant'

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.phone.trim() || !form.password.trim()) return
    setSaving(true)
    try {
      await api.post('/users', {
        username: form.username.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
        vendor: form.role === 'driver' ? form.vendor : undefined,
        tractor_plate: form.role === 'driver' && form.tractorPlate.trim() ? form.tractorPlate.trim() : undefined,
      })
      toast.success('Đã tạo tài khoản')
      setForm({ username: '', phone: '', role: 'driver', vendor: PHUC_LOC, password: '', tractorPlate: '' })
      onClose()
      onCreated()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Lỗi không xác định'
      toast.error('Lỗi', detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo tài khoản</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên đăng nhập</Label>
            <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="nguyenvana" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0901 234 567" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Vai trò</Label>
            <InlineSelect
              options={CREATEABLE_ROLES}
              value={form.role}
              onChange={v => {
                const newRole = v as Role
                setForm(f => ({
                  ...f,
                  role: newRole,
                  vendor: (newRole === 'director' || newRole === 'accountant') ? PHUC_LOC : f.vendor,
                }))
              }}
              placeholder="Chọn vai trò"
            />
          </div>
          {form.role === 'driver' && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Nhà thầu</Label>
              <Input
                value={form.vendor}
                onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                placeholder={PHUC_LOC}
                className="text-sm"
              />
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                Mặc định "Phúc Lộc". Đổi thành tên nhà thầu nếu tài xế thuê ngoài.
              </p>
            </div>
          )}
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
            disabled={!form.username.trim() || !form.phone.trim() || !form.password.trim() || saving}
            className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            {saving ? 'Đang tạo...' : 'Xác nhận'}
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
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      u.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.tractorPlate ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    return roleOk && searchOk
  })

  return (
    <div className="pb-24">
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
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-2">
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
            { value: 'director', label: ROLE_LABELS.director, count: users.filter(u => u.role === 'director').length },
            { value: 'driver', label: ROLE_LABELS.driver, count: users.filter(u => u.role === 'driver').length },
            { value: 'accountant', label: ROLE_LABELS.accountant, count: users.filter(u => u.role === 'accountant').length },
          ]}
          value={filterRole}
          onChange={setFilterRole}
        />
      </div>

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
  const toast = useToast()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users')
      const list = (res.data as Record<string, unknown>[]).map(toUserAccount)
      setUsers(list)
    } catch {
      toast.error('Lỗi', 'Không thể tải danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  if (loading) {
    return (
      <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
        <AppTopBar variant="home" name={user?.name ?? ''} onProfile={() => {}} onNotifications={() => {}} />
        <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>Đang tải...</div>
      </div>
    )
  }

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
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchUsers} />
      <UserDetailDialog user={selectedUser} open={!!selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  )
}
