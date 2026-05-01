import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Truck, CircleDollarSign, LayoutDashboard, Phone, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { QuickCreateDialog } from '@/components/shared/QuickCreateDialog'
import { useToast } from '@/components/atoms/Toast'
import { FilterPills } from '@/components/shared/FilterPills'
import { api } from '@/services/api/client'
import type { Role } from '@/data/domain'
import { ROLE_LABELS } from '@/data/domain'
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/use-queries'
import type { Vendor } from '@/services/api/vendors.api'
import { useAuth } from '@/contexts/AuthContext'

interface UserAccount {
  id: string
  username: string
  fullName: string | null
  phone: string | null
  cccd: string | null
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

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
      {children} <span className="text-xs" style={{ color: 'var(--theme-status-error)' }}>*</span>
    </Label>
  )
}

interface UserForm {
  username: string
  fullName: string
  phone: string
  cccd: string
  role: Role
  tractorPlate: string
  password: string
  vendor: string
}

const EMPTY_FORM: UserForm = { username: '', fullName: '', phone: '', cccd: '', role: 'driver', tractorPlate: '', password: '', vendor: '' }

function toCamelCase(obj: Record<string, unknown>): UserAccount {
  return {
    id: String(obj.id),
    username: obj.username as string,
    fullName: (obj.full_name as string) ?? null,
    phone: (obj.phone as string) ?? null,
    cccd: (obj.cccd as string) ?? null,
    email: obj.email as string | undefined,
    role: obj.role as Role,
    tractorPlate: obj.tractor_plate as string | undefined,
    isActive: obj.is_active as boolean,
    createdAt: obj.created_at as string,
  }
}

// ─── Vendor management ────────────────────────────────────────────────────────

function VendorManagement() {
  const { data: vendors = [], isLoading: loading } = useVendors()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [name, setName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const handleOpenCreate = useCallback(() => {
    setEditing(null)
    setName('')
    setDialogOpen(true)
  }, [])

  const handleOpenEdit = useCallback((vendor: Vendor) => {
    setEditing(vendor)
    setName(vendor.name)
    setSelectedVendor(null)
    setDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    if (editing) {
      updateVendor.mutate({ id: editing.id, data: { name } }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createVendor.mutate({ name }, { onSuccess: () => setDialogOpen(false) })
    }
  }, [editing, name, createVendor, updateVendor])

  const handleDelete = useCallback((id: number) => {
    deleteVendor.mutate(id, {
      onSuccess: () => { setDeleteConfirm(null); setSelectedVendor(null) },
    })
  }, [deleteVendor])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
      {vendors.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
          <Truck className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Chưa có nhà thầu</p>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn + để thêm nhà thầu mới</p>
        </div>
      ) : vendors.map(vendor => (
        <button
          key={vendor.id}
          onClick={() => setSelectedVendor(vendor)}
          className="w-full text-left rounded-2xl p-3 transition-all active:scale-[0.98] touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--theme-bg-tertiary)' }}>
              <Truck className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
            </div>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{vendor.name}</p>
          </div>
        </button>
      ))}

      {/* Detail dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedVendor?.name}</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(selectedVendor!.id)} className="flex-1" style={{ color: 'var(--theme-status-error)' }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Xoá
            </Button>
            <Button onClick={() => handleOpenEdit(selectedVendor!)} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Sửa nhà thầu' : 'Thêm nhà thầu'}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên nhà thầu</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tên nhà thầu" className="text-sm" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleSubmit} disabled={!name.trim()} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              {editing ? 'Cập nhật' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá nhà thầu?</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Huỷ</Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createPortal(
        <button
          onClick={handleOpenCreate}
          className="fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 touch-manipulation"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Plus className="w-6 h-6" />
        </button>,
        document.body,
      )}
    </div>
  )
}

// ─── User management ──────────────────────────────────────────────────────────

function UserManagementInner() {
  const toast = useToast()
  const [users, setUsers] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')
  const { data: vendors } = useVendors()
  const createVendor = useCreateVendor()

  const [tab, setTab] = useState<'users' | 'vendors'>('users')
  const [createVendorOpen, setCreateVendorOpen] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<UserForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [detailUser, setDetailUser] = useState<UserAccount | null>(null)
  const [editForm, setEditForm] = useState<UserForm>(EMPTY_FORM)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (createForm.vendor === '' && vendors && vendors.length > 0 && createForm.role === 'driver') {
      setCreateForm(prev => ({ ...prev, vendor: String(vendors[0].id) }))
    }
  }, [vendors, createForm.vendor, createForm.role])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users')
      const items = (res.data as { items: Record<string, unknown>[] }).items ?? res.data
      const list = (items as Record<string, unknown>[]).map(toCamelCase)
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
    if (!createForm.username.trim() || !createForm.password.trim()) return
    setSaving(true)
    try {
      const vendorObj = vendors?.find(v => String(v.id) === createForm.vendor)
      await api.post('/users', {
        username: createForm.username.trim(),
        full_name: createForm.fullName.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        cccd: createForm.cccd.trim() || undefined,
        role: createForm.role,
        password: createForm.password,
        vendor: createForm.role === 'driver' ? (vendorObj?.name ?? 'Phúc Lộc') : undefined,
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
  }, [createForm, toast, fetchUsers, vendors])

  const openDetail = useCallback((user: UserAccount) => {
    setDetailUser(user)
    setEditForm({
      username: user.username,
      fullName: user.fullName ?? '',
      phone: user.phone ?? '',
      cccd: user.cccd ?? '',
      role: user.role,
      tractorPlate: user.tractorPlate ?? '',
      password: '',
      vendor: '',
    })
  }, [])

  const handleEdit = useCallback(async () => {
    if (!detailUser || !editForm.username.trim()) return
    setSaving(true)
    try {
      const vendorObj = vendors?.find(v => String(v.id) === editForm.vendor)
      const payload: Record<string, unknown> = {
        username: editForm.username.trim(),
        full_name: editForm.fullName.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        cccd: editForm.cccd.trim() || undefined,
        role: editForm.role,
      }
      if (editForm.role === 'driver') {
        if (editForm.tractorPlate.trim()) {
          payload.tractor_plate = editForm.tractorPlate.trim()
        }
        if (vendorObj) {
          payload.vendor = vendorObj.name
        }
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
  }, [detailUser, editForm, toast, fetchUsers, vendors])

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
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }}>
        {([
          { key: 'users', label: 'Tài khoản' },
          { key: 'vendors', label: 'Nhà thầu' },
        ] as { key: 'users' | 'vendors'; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation"
            style={{
              background: tab === key ? 'var(--theme-bg-primary)' : 'transparent',
              color: tab === key ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
              boxShadow: tab === key ? 'var(--theme-shadow-card)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'vendors' ? <VendorManagement /> : (
        <>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
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
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{u.fullName || u.username}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {u.phone && (
                    <>
                      <Phone className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{u.phone}</span>
                    </>
                  )}
                  {u.tractorPlate && (
                    <>
                      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>·</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>{u.tractorPlate}</span>
                    </>
                  )}
                  {u.cccd && (
                    <>
                      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>·</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>CCCD: {u.cccd}</span>
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
              <RequiredLabel>Vai trò</RequiredLabel>
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
              <RequiredLabel>Tên đăng nhập</RequiredLabel>
              <Input value={createForm.username} onChange={e => updateCreateField('username', e.target.value)} placeholder="nguyenvana" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ và tên</Label>
              <Input value={createForm.fullName} onChange={e => updateCreateField('fullName', e.target.value)} placeholder="Nguyễn Văn A" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
              <Input value={createForm.phone} onChange={e => updateCreateField('phone', e.target.value)} placeholder="0912-345-678" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Căn cước công dân</Label>
              <Input value={createForm.cccd} onChange={e => updateCreateField('cccd', e.target.value)} placeholder="001234567890" className="text-sm font-mono" />
            </div>
            {createForm.role === 'driver' && (
              <div className="space-y-2">
                <RequiredLabel>Nhà thầu</RequiredLabel>
                <InlineSelect
                  options={(vendors ?? []).map(v => ({ value: String(v.id), label: v.name }))}
                  value={createForm.vendor}
                  onChange={v => updateCreateField('vendor', v)}
                  placeholder="Chọn nhà thầu"
                  onCreateNew={() => setCreateVendorOpen(true)}
                  createNewLabel="Tạo nhà thầu mới"
                />
              </div>
            )}
            {createForm.role === 'driver' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số đầu kéo</Label>
                <Input value={createForm.tractorPlate} onChange={e => updateCreateField('tractorPlate', e.target.value)} placeholder="15C-136.31" className="text-sm font-mono" />
              </div>
            )}
            <div className="space-y-2">
              <RequiredLabel>Mật khẩu mặc định</RequiredLabel>
              <Input type="password" value={createForm.password} onChange={e => updateCreateField('password', e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleCreate} disabled={!createForm.username.trim() || !createForm.password.trim() || saving} className="flex-1"
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
                <RequiredLabel>Vai trò</RequiredLabel>
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
                <RequiredLabel>Tên đăng nhập</RequiredLabel>
                <Input value={editForm.username} onChange={e => updateEditField('username', e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ và tên</Label>
                <Input value={editForm.fullName} onChange={e => updateEditField('fullName', e.target.value)} className="text-sm" placeholder="Nguyễn Văn A" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
                <Input value={editForm.phone} onChange={e => updateEditField('phone', e.target.value)} className="text-sm" placeholder="0912-345-678" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Căn cước công dân</Label>
                <Input value={editForm.cccd} onChange={e => updateEditField('cccd', e.target.value)} className="text-sm font-mono" placeholder="001234567890" />
              </div>
              {editForm.role === 'driver' && (
                <div className="space-y-2">
                  <RequiredLabel>Nhà thầu</RequiredLabel>
                  <InlineSelect
                    options={(vendors ?? []).map(v => ({ value: String(v.id), label: v.name }))}
                    value={editForm.vendor}
                    onChange={v => updateEditField('vendor', v)}
                    placeholder="Chọn nhà thầu"
                    onCreateNew={() => setCreateVendorOpen(true)}
                    createNewLabel="Tạo nhà thầu mới"
                  />
                </div>
              )}
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
            <Button onClick={handleEdit} disabled={!editForm.username.trim() || saving} className="flex-1 gap-1.5"
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
        </>
      )}

      <QuickCreateDialog
        open={createVendorOpen}
        onClose={() => setCreateVendorOpen(false)}
        title="Thêm nhà thầu"
        label="Tên nhà thầu"
        placeholder="Tên nhà thầu"
        onConfirm={(name) => {
          createVendor.mutate({ name }, { onSuccess: () => setCreateVendorOpen(false) })
        }}
      />
    </div>
  )
}

export function UserManagement() {
  const { user } = useAuth()

  // Guard: only director and superadmin may access this page
  if (!user || !['director', 'superadmin'].includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <UserManagementInner />
}
