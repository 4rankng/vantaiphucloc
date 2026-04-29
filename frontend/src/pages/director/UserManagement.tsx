import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Truck, CircleDollarSign, LayoutDashboard, Phone, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { FilterPills } from '@/components/shared/FilterPills'
import { api } from '@/services/api/client'
import type { Role } from '@/data/domain'
import { ROLE_LABELS } from '@/data/domain'

interface UserAccount {
  id: string
  username: string
  phone: string
  email?: string
  role: Role
  tractorPlate?: string
  isActive: boolean
  createdAt: string
}

const ROLE_ICONS: Record<Role, typeof Truck> = {
  superadmin: LayoutDashboard,
  director: LayoutDashboard,
  accountant: CircleDollarSign,
  driver: Truck,
}

const ROLE_COLORS: Record<Role, { bg: string; color: string }> = {
  superadmin: { bg: 'var(--theme-status-info-light)', color: 'var(--theme-status-info)' },
  director: { bg: 'var(--theme-status-info-light)', color: 'var(--theme-status-info)' },
  accountant: { bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' },
  driver: { bg: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' },
}

const CREATABLE_ROLES: Role[] = ['driver', 'accountant', 'director']

interface UserForm {
  username: string
  phone: string
  role: Role
  tractorPlate: string
  password: string
}

const EMPTY_FORM: UserForm = { username: '', phone: '', role: 'driver', tractorPlate: '', password: '' }

function toCamelCase(obj: Record<string, unknown>): UserAccount {
  return {
    id: String(obj.id),
    username: obj.username as string,
    phone: obj.phone as string,
    email: obj.email as string | undefined,
    role: obj.role as Role,
    tractorPlate: obj.tractor_plate as string | undefined,
    isActive: obj.is_active as boolean,
    createdAt: obj.created_at as string,
  }
}

export function UserManagement() {
  const toast = useToast()
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<UserForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [detailUser, setDetailUser] = useState<UserAccount | null>(null)
  const [editForm, setEditForm] = useState<UserForm>(EMPTY_FORM)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users')
      const list = (res.data as Record<string, unknown>[]).map(toCamelCase)
      setUsers(list.filter(u => u.isActive))
    } catch {
      toast.error('Lỗi', 'Không thể tải danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers()
  }, [fetchUsers])

  const filtered = filterRole === 'ALL' ? users : users.filter(u => u.role === filterRole)

  const updateCreateField = useCallback((field: keyof UserForm, value: string) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const updateEditField = useCallback((field: keyof UserForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCreate = useCallback(async () => {
    if (!createForm.username.trim() || !createForm.phone.trim() || !createForm.password.trim()) return
    setSaving(true)
    try {
      await api.post('/users', {
        username: createForm.username.trim(),
        phone: createForm.phone.trim(),
        role: createForm.role,
        password: createForm.password,
        tractor_plate: createForm.role === 'driver' ? createForm.tractorPlate.trim() : undefined,
      })
      toast.success('Đã tạo tài khoản')
      setCreateOpen(false)
      setCreateForm(EMPTY_FORM)
      fetchUsers()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Lỗi không xác định'
      toast.error('Lỗi', detail)
    } finally {
      setSaving(false)
    }
  }, [createForm, toast, fetchUsers])

  const openDetail = useCallback((user: UserAccount) => {
    setDetailUser(user)
    setEditForm({
      username: user.username,
      phone: user.phone,
      role: user.role,
      tractorPlate: user.tractorPlate ?? '',
      password: '',
    })
  }, [])

  const handleEdit = useCallback(async () => {
    if (!detailUser || !editForm.username.trim() || !editForm.phone.trim()) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        username: editForm.username.trim(),
        phone: editForm.phone.trim(),
        role: editForm.role,
      }
      if (editForm.role === 'driver' && editForm.tractorPlate.trim()) {
        payload.tractor_plate = editForm.tractorPlate.trim()
      }
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim()
      }
      await api.put(`/users/${detailUser.id}`, payload)
      toast.success('Đã cập nhật')
      setDetailUser(null)
      fetchUsers()
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật')
    } finally {
      setSaving(false)
    }
  }, [detailUser, editForm, toast, fetchUsers])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      await api.delete(`/users/${deleteId}`)
      toast.success('Đã xoá tài khoản')
      setDeleteId(null)
      setDetailUser(null)
      fetchUsers()
    } catch {
      toast.error('Lỗi', 'Không thể xoá tài khoản')
    } finally {
      setSaving(false)
    }
  }, [deleteId, toast, fetchUsers])

  const roleCounts = {
    ALL: users.length,
    director: users.filter(u => u.role === 'director').length,
    accountant: users.filter(u => u.role === 'accountant').length,
    driver: users.filter(u => u.role === 'driver').length,
  }

  if (loading) {
    return <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>Đang tải...</div>
  }

  return (
    <div className="p-4 space-y-4">
      <FilterPills
        options={[
          { value: 'ALL', label: 'Tất cả', count: roleCounts.ALL },
          { value: 'director', label: ROLE_LABELS.director, count: roleCounts.director },
          { value: 'accountant', label: ROLE_LABELS.accountant, count: roleCounts.accountant },
          { value: 'driver', label: ROLE_LABELS.driver, count: roleCounts.driver },
        ]}
        value={filterRole}
        onChange={setFilterRole}
      />

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
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{u.username}</p>
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
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên đăng nhập</Label>
              <Input value={createForm.username} onChange={e => updateCreateField('username', e.target.value)} placeholder="nguyenvana" className="text-sm" />
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
            <Button onClick={handleCreate} disabled={!createForm.username.trim() || !createForm.phone.trim() || !createForm.password.trim() || saving} className="flex-1"
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
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên đăng nhập</Label>
                <Input value={editForm.username} onChange={e => updateEditField('username', e.target.value)} className="text-sm" />
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
            <Button onClick={handleEdit} disabled={!editForm.username.trim() || !editForm.phone.trim() || saving} className="flex-1 gap-1.5"
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
            Tài khoản sẽ bị vô hiệu hoá. Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} disabled={saving} className="flex-1" style={{ background: 'var(--theme-status-error)', color: '#fff' }}>
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
