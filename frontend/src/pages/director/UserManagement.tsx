import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Truck, CircleDollarSign, LayoutDashboard, Phone, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { useToast } from '@/components/atoms/Toast'
import type { Role } from '@/data/domain'
import { ROLE_LABELS } from '@/data/domain'

interface UserAccount {
  id: string
  name: string
  phone: string
  role: Role
  tractorPlate?: string
  createdAt: string
}

const INITIAL_USERS: UserAccount[] = []

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

const CREATABLE_ROLES: Role[] = ['driver', 'accountant', 'director']

interface UserForm {
  name: string
  phone: string
  role: Role
  tractorPlate: string
  password: string
}

const EMPTY_FORM: UserForm = { name: '', phone: '', role: 'driver', tractorPlate: '', password: '' }

export function UserManagement() {
  const toast = useToast()
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS)
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<UserForm>(EMPTY_FORM)

  // Detail/Edit dialog
  const [detailUser, setDetailUser] = useState<UserAccount | null>(null)
  const [editForm, setEditForm] = useState<UserForm>(EMPTY_FORM)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = filterRole === 'ALL' ? users : users.filter(u => u.role === filterRole)

  const updateCreateField = useCallback((field: keyof UserForm, value: string) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const updateEditField = useCallback((field: keyof UserForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCreate = useCallback(() => {
    if (!createForm.name.trim() || !createForm.phone.trim()) return
    const newUser: UserAccount = {
      id: `USR-${Date.now()}`,
      name: createForm.name.trim(),
      phone: createForm.phone.trim(),
      role: createForm.role,
      tractorPlate: createForm.role === 'driver' ? createForm.tractorPlate.trim() : undefined,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setUsers(prev => [...prev, newUser])
    setCreateOpen(false)
    setCreateForm(EMPTY_FORM)
    toast.success('Đã tạo tài khoản')
  }, [createForm, toast])

  const openDetail = useCallback((user: UserAccount) => {
    setDetailUser(user)
    setEditForm({
      name: user.name,
      phone: user.phone,
      role: user.role,
      tractorPlate: user.tractorPlate ?? '',
      password: '',
    })
  }, [])

  const handleEdit = useCallback(() => {
    if (!detailUser || !editForm.name.trim() || !editForm.phone.trim()) return
    setUsers(prev => prev.map(u => u.id === detailUser.id ? {
      ...u,
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      role: editForm.role,
      tractorPlate: editForm.role === 'driver' ? editForm.tractorPlate.trim() : undefined,
    } : u))
    setDetailUser(null)
    toast.success('Đã cập nhật')
  }, [detailUser, editForm, toast])

  const handleDelete = useCallback(() => {
    if (!deleteId) return
    setUsers(prev => prev.filter(u => u.id !== deleteId))
    setDeleteId(null)
    setDetailUser(null)
    toast.success('Đã xoá tài khoản')
  }, [deleteId, toast])

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

      {/* FAB */}
      {createPortal(
        <button
          onClick={() => { setCreateForm(EMPTY_FORM); setCreateOpen(true) }}
          className="fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 touch-manipulation"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Plus className="w-6 h-6" />
        </button>,
        document.body,
      )}

      {/* User list */}
      <div className="space-y-2">
        {filtered.map(u => {
          const RoleIcon = ROLE_ICONS[u.role]
          const roleColor = ROLE_COLORS[u.role]
          return (
            <button
              key={u.id}
              onClick={() => openDetail(u)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left card-lift touch-manipulation"
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
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
            </button>
          )
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm tài khoản</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Vai trò</Label>
              <div className="grid grid-cols-3 gap-2">
                {CREATABLE_ROLES.map(r => (
                  <button
                    key={r}
                    onClick={() => updateCreateField('role', r)}
                    className="py-2.5 px-3 rounded-xl text-sm font-medium transition-colors touch-manipulation"
                    style={{
                      background: createForm.role === r ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                      color: createForm.role === r ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                    }}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ tên</Label>
              <Input value={createForm.name} onChange={e => updateCreateField('name', e.target.value)} placeholder="Nguyễn Văn A" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
              <Input value={createForm.phone} onChange={e => updateCreateField('phone', e.target.value)} placeholder="0912-345-678" className="text-sm" />
            </div>
            {createForm.role === 'driver' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số đầu kéo</Label>
                <Input value={createForm.tractorPlate} onChange={e => updateCreateField('tractorPlate', e.target.value)} placeholder="15C-136.31" className="text-sm font-mono" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu mặc định</Label>
              <Input type="password" value={createForm.password} onChange={e => updateCreateField('password', e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleCreate} disabled={!createForm.name.trim() || !createForm.phone.trim() || !createForm.password.trim()} className="flex-1"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail/Edit dialog */}
      <Dialog open={!!detailUser} onOpenChange={(open) => { if (!open) setDetailUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thông tin tài khoản</DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Vai trò</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CREATABLE_ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => updateEditField('role', r)}
                      className="py-2.5 px-3 rounded-xl text-sm font-medium transition-colors touch-manipulation"
                      style={{
                        background: editForm.role === r ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                        color: editForm.role === r ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                      }}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ tên</Label>
                <Input value={editForm.name} onChange={e => updateEditField('name', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
                <Input value={editForm.phone} onChange={e => updateEditField('phone', e.target.value)} className="text-sm" />
              </div>
              {editForm.role === 'driver' && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số đầu kéo</Label>
                  <Input value={editForm.tractorPlate} onChange={e => updateEditField('tractorPlate', e.target.value)} className="text-sm font-mono" />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu mới (để trống nếu không đổi)</Label>
                <Input type="password" value={editForm.password} onChange={e => updateEditField('password', e.target.value)} placeholder="••••••••" className="text-sm" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(detailUser?.id ?? null)}
              className="flex-1 gap-1.5"
              style={{ color: 'var(--theme-status-error)', borderColor: 'var(--theme-status-error)' }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Xoá
            </Button>
            <Button variant="outline" onClick={() => setDetailUser(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleEdit} disabled={!editForm.name.trim() || !editForm.phone.trim()} className="flex-1 gap-1.5"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              <Pencil className="w-3.5 h-3.5" /> Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá tài khoản?</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            Hành động này không thể hoàn tác. Tài khoản sẽ bị xoá vĩnh viễn.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} className="flex-1" style={{ background: 'var(--theme-status-error)', color: '#fff' }}>
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
