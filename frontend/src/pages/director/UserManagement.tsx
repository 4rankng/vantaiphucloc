import { useState, useCallback } from 'react'
import { Plus, Truck, CircleDollarSign, LayoutDashboard, Phone } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import type { Role } from '@/data/mockData'
import { ROLE_LABELS, mockDrivers } from '@/data/mockData'

interface UserAccount {
  id: string
  name: string
  phone: string
  role: Role
  tractorPlate?: string
  createdAt: string
}

const INITIAL_USERS: UserAccount[] = [
  { id: 'DIR-001', name: 'Giám đốc', phone: '0901-000-001', role: 'director', createdAt: '2025-01-01' },
  { id: 'ACC-001', name: 'Kế toán', phone: '0901-000-002', role: 'accountant', createdAt: '2025-01-01' },
  ...mockDrivers.map(d => ({
    id: d.id,
    name: d.name,
    phone: d.phone,
    role: 'driver' as Role,
    tractorPlate: d.tractorPlate,
    createdAt: '2025-01-15',
  })),
]

const ROLE_ICONS: Record<Role, typeof Truck> = {
  director: LayoutDashboard,
  accountant: CircleDollarSign,
  driver: Truck,
}

const ROLE_COLORS: Record<Role, { bg: string; color: string }> = {
  director: { bg: 'var(--theme-status-info-light)', color: 'var(--theme-status-info)' },
  accountant: { bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' },
  driver: { bg: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' },
}

// Director can create driver, accountant, and director accounts
const CREATABLE_ROLES: Role[] = ['driver', 'accountant', 'director']

interface CreateForm {
  name: string
  phone: string
  role: Role
  tractorPlate: string
  password: string
}

const EMPTY_FORM: CreateForm = { name: '', phone: '', role: 'driver', tractorPlate: '', password: '' }

export function UserManagement() {
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')

  const filtered = filterRole === 'ALL' ? users : users.filter(u => u.role === filterRole)

  const handleCreate = useCallback(() => {
    if (!form.name.trim() || !form.phone.trim()) return
    const newUser: UserAccount = {
      id: `USR-${Date.now()}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      role: form.role,
      tractorPlate: form.role === 'driver' ? form.tractorPlate.trim() : undefined,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setUsers(prev => [...prev, newUser])
    setDialogOpen(false)
    setForm(EMPTY_FORM)
  }, [form])

  const updateField = useCallback((field: keyof CreateForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const roleCounts = {
    ALL: users.length,
    director: users.filter(u => u.role === 'director').length,
    accountant: users.filter(u => u.role === 'accountant').length,
    driver: users.filter(u => u.role === 'driver').length,
  }

  return (
    <div className="p-4 space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {(['ALL', 'director', 'accountant', 'driver'] as const).map(r => (
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
            {r === 'ALL' ? 'Tất cả' : ROLE_LABELS[r]} ({roleCounts[r]})
          </button>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] touch-manipulation"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
      >
        <Plus className="h-4 w-4" /> Thêm tài khoản
      </button>

      {/* User list */}
      <div className="space-y-2">
        {filtered.map(u => {
          const RoleIcon = ROLE_ICONS[u.role]
          const roleColor = ROLE_COLORS[u.role]
          return (
            <div
              key={u.id}
              className="flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: roleColor.bg }}
              >
                <RoleIcon className="w-4.5 h-4.5" style={{ color: roleColor.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{u.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{u.phone}</span>
                  {u.tractorPlate && (
                    <>
                      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>·</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>{u.tractorPlate}</span>
                    </>
                  )}
                </div>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: roleColor.bg, color: roleColor.color }}
              >
                {ROLE_LABELS[u.role]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm tài khoản</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Vai trò</Label>
              <div className="grid grid-cols-3 gap-2">
                {CREATABLE_ROLES.map(r => (
                  <button
                    key={r}
                    onClick={() => updateField('role', r)}
                    className="py-2.5 px-3 rounded-xl text-sm font-medium transition-colors touch-manipulation"
                    style={{
                      background: form.role === r ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                      color: form.role === r ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                    }}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ tên</Label>
              <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Nguyễn Văn A" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
              <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0912-345-678" className="text-sm" />
            </div>
            {form.role === 'driver' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số đầu kéo</Label>
                <Input value={form.tractorPlate} onChange={e => updateField('tractorPlate', e.target.value)} placeholder="15C-136.31" className="text-sm font-mono" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu mặc định</Label>
              <Input type="password" value={form.password} onChange={e => updateField('password', e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || !form.phone.trim() || !form.password.trim()}>
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
