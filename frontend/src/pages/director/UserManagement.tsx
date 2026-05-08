import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { Truck, CircleDollarSign, LayoutDashboard, Phone, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { CreateVendorDialog } from '@/components/shared/CreateVendorDialog'
import { useToast } from '@/components/atoms/Toast'
import { FilterPills } from '@/components/shared/FilterPills'
import { PageHeader } from '@/components/shared/PageHeader'
import type { Role } from '@/data/domain'
import { ROLE_LABELS } from '@/data/domain'
import { useVendors, useCreateVendor, useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-queries'
import type { UserAccount } from '@/hooks/use-queries'
import { useAuth } from '@/contexts/AuthContext'

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

// ─── User management ──────────────────────────────────────────────────────────

function UserManagementInner() {
  const toast = useToast()
  const { data: allUsers = [], isLoading: loading } = useUsers()
  const users = useMemo(() => allUsers.filter(u => u.isActive), [allUsers])
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL')
  const { data: vendors } = useVendors()
  const createVendor = useCreateVendor()

  const [createVendorOpen, setCreateVendorOpen] = useState(false)
  const [vendorOpenedFrom, setVendorOpenedFrom] = useState<'create' | 'edit' | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<UserForm>(EMPTY_FORM)

  const [detailUser, setDetailUser] = useState<UserAccount | null>(null)
  const [editForm, setEditForm] = useState<UserForm>(EMPTY_FORM)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (createForm.vendor === '' && vendors && vendors.length > 0 && createForm.role === 'driver') {
      setCreateForm(prev => ({ ...prev, vendor: String(vendors[0].id) }))
    }
  }, [vendors, createForm.vendor, createForm.role])

  const filtered = useMemo(
    () => filterRole === 'ALL' ? users : users.filter(u => u.role === filterRole),
    [filterRole, users],
  )

  const updateCreateField = useCallback((field: keyof UserForm, value: string) => {
    setCreateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const updateEditField = useCallback((field: keyof UserForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleCreate = useCallback(async () => {
    if (!createForm.username.trim() || !createForm.password.trim()) return
    try {
      const vendorObj = vendors?.find(v => String(v.id) === createForm.vendor)
      const res = await createUser.mutateAsync({
        username: createForm.username.trim(),
        fullName: createForm.fullName.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        cccd: createForm.cccd.trim() || undefined,
        role: createForm.role,
        password: createForm.password,
        vendor: createForm.role === 'driver' ? (vendorObj?.name ?? 'Phúc Lộc') : undefined,
        tractorPlate: createForm.role === 'driver' ? createForm.tractorPlate.trim() : undefined,
      })
      if (res.success) {
        toast.success('Đã tạo tài khoản')
        setCreateOpen(false)
        setCreateForm(EMPTY_FORM)
      } else {
        toast.error('Lỗi', res.message ?? 'Lỗi không xác định')
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Lỗi không xác định'
      toast.error('Lỗi', detail)
    }
  }, [createForm, toast, createUser, vendors])

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
    try {
      const vendorObj = vendors?.find(v => String(v.id) === editForm.vendor)
      const payload: Record<string, unknown> = {
        username: editForm.username.trim(),
        fullName: editForm.fullName.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        cccd: editForm.cccd.trim() || undefined,
        role: editForm.role,
      }
      if (editForm.role === 'driver') {
        if (editForm.tractorPlate.trim()) payload.tractorPlate = editForm.tractorPlate.trim()
        if (vendorObj) payload.vendor = vendorObj.name
      }
      if (editForm.password.trim()) payload.password = editForm.password.trim()
      const res = await updateUser.mutateAsync({ id: detailUser.id, data: payload })
      if (res.success) {
        toast.success('Đã cập nhật')
        setDetailUser(null)
      } else {
        toast.error('Lỗi', res.message ?? 'Không thể cập nhật')
      }
    } catch {
      toast.error('Lỗi', 'Không thể cập nhật')
    }
  }, [detailUser, editForm, toast, updateUser, vendors])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    try {
      const res = await deleteUser.mutateAsync(deleteId)
      if (res.success) {
        toast.success('Đã xoá tài khoản')
        setDeleteId(null)
        setDetailUser(null)
      } else {
        toast.error('Lỗi', res.message ?? 'Không thể xoá tài khoản')
      }
    } catch {
      toast.error('Lỗi', 'Không thể xoá tài khoản')
    }
  }, [deleteId, toast, deleteUser])

  const roleCounts = {
    ALL: users.length,
    director: users.filter(u => u.role === 'director').length,
    accountant: users.filter(u => u.role === 'accountant').length,
    driver: users.filter(u => u.role === 'driver').length,
  }

  if (loading) return <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>Đang tải...</div>

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý tài khoản"
        icon="team"
        subtitle={`${users.length} tài khoản đang hoạt động`}
        onAdd={() => { setCreateForm(EMPTY_FORM); setCreateOpen(true) }}
        addLabel="Tạo tài khoản"
      />

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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
        {filtered.map(u => {
          const RoleIcon = ROLE_ICONS[u.role]
          const roleColor = ROLE_COLORS[u.role]
          return (
            <button
              key={u.id}
              onClick={() => openDetail(u)}
              className="w-full flex items-center gap-3 p-3.5 rounded-lg text-left card-lift touch-manipulation"
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
                {(() => {
                  // Track whether we've rendered any prior chip on this row so the
                  // `·` separator only appears between actual values, never leading.
                  let renderedAny = false
                  const sep = (
                    <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>·</span>
                  )
                  const items: ReactNode[] = []
                  if (u.phone) {
                    items.push(
                      <span key="phone" className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{u.phone}</span>
                      </span>,
                    )
                    renderedAny = true
                  }
                  if (u.tractorPlate) {
                    if (renderedAny) items.push(<span key="sep-plate">{sep}</span>)
                    items.push(
                      <span key="plate" className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>{u.tractorPlate}</span>,
                    )
                    renderedAny = true
                  }
                  if (u.cccd) {
                    if (renderedAny) items.push(<span key="sep-cccd">{sep}</span>)
                    items.push(
                      <span key="cccd" className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>CCCD: {u.cccd}</span>,
                    )
                    renderedAny = true
                  }
                  return (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">{items}</div>
                  )
                })()}
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
            </button>
          )
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open && !createVendorOpen) setCreateOpen(false) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm tài khoản</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
            {/* Row 1: username + full name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <RequiredLabel>Tên đăng nhập</RequiredLabel>
                <Input value={createForm.username} onChange={e => updateCreateField('username', e.target.value)} placeholder="nguyenvana" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ và tên</Label>
                <Input value={createForm.fullName} onChange={e => updateCreateField('fullName', e.target.value)} placeholder="Nguyễn Văn A" className="text-sm" />
              </div>
            </div>
            {/* Row 2: phone + CCCD */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
                <Input value={createForm.phone} onChange={e => updateCreateField('phone', e.target.value)} placeholder="0912-345-678" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>CCCD</Label>
                <Input value={createForm.cccd} onChange={e => updateCreateField('cccd', e.target.value)} placeholder="001234567890" className="text-sm font-mono" />
              </div>
            </div>
            {/* Driver-only: vendor full-width */}
            {createForm.role === 'driver' && (
              <div className="space-y-1.5">
                <RequiredLabel>Nhà thầu</RequiredLabel>
                <InlineSelect
                  options={(vendors ?? []).map(v => ({ value: String(v.id), label: v.name }))}
                  value={createForm.vendor}
                  onChange={v => updateCreateField('vendor', v)}
                  placeholder="Chọn nhà thầu"
                  onCreateNew={() => { setVendorOpenedFrom('create'); setCreateVendorOpen(true) }}
                  createNewLabel="Tạo nhà thầu mới"
                />
              </div>
            )}
            {/* Row 3: tractor plate (driver) + password */}
            <div className="grid grid-cols-2 gap-3">
              {createForm.role === 'driver' && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số đầu kéo</Label>
                  <Input value={createForm.tractorPlate} onChange={e => updateCreateField('tractorPlate', e.target.value)} placeholder="15C-136.31" className="text-sm font-mono" />
                </div>
              )}
              <div className={`space-y-1.5 ${createForm.role !== 'driver' ? 'col-span-2' : ''}`}>
                <RequiredLabel>Mật khẩu mặc định</RequiredLabel>
                <Input type="password" value={createForm.password} onChange={e => updateCreateField('password', e.target.value)} placeholder="••••••••" className="text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleCreate} disabled={!createForm.username.trim() || !createForm.password.trim() || createUser.isPending} className="flex-1"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail/Edit dialog */}
      <Dialog open={!!detailUser} onOpenChange={(open) => { if (!open && !createVendorOpen) setDetailUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thông tin tài khoản</DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-3">
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
              {/* Row 1: username + full name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <RequiredLabel>Tên đăng nhập</RequiredLabel>
                  <Input value={editForm.username} onChange={e => updateEditField('username', e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ và tên</Label>
                  <Input value={editForm.fullName} onChange={e => updateEditField('fullName', e.target.value)} className="text-sm" placeholder="Nguyễn Văn A" />
                </div>
              </div>
              {/* Row 2: phone + CCCD */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
                  <Input value={editForm.phone} onChange={e => updateEditField('phone', e.target.value)} className="text-sm" placeholder="0912-345-678" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>CCCD</Label>
                  <Input value={editForm.cccd} onChange={e => updateEditField('cccd', e.target.value)} className="text-sm font-mono" placeholder="001234567890" />
                </div>
              </div>
              {/* Driver-only: vendor full-width */}
              {editForm.role === 'driver' && (
                <div className="space-y-1.5">
                  <RequiredLabel>Nhà thầu</RequiredLabel>
                  <InlineSelect
                    options={(vendors ?? []).map(v => ({ value: String(v.id), label: v.name }))}
                    value={editForm.vendor}
                    onChange={v => updateEditField('vendor', v)}
                    placeholder="Chọn nhà thầu"
                    onCreateNew={() => { setVendorOpenedFrom('edit'); setCreateVendorOpen(true) }}
                    createNewLabel="Tạo nhà thầu mới"
                  />
                </div>
              )}
              {/* Row 3: tractor plate (driver) + password */}
              <div className="grid grid-cols-2 gap-3">
                {editForm.role === 'driver' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số đầu kéo</Label>
                    <Input value={editForm.tractorPlate} onChange={e => updateEditField('tractorPlate', e.target.value)} className="text-sm font-mono" />
                  </div>
                )}
                <div className={`space-y-1.5 ${editForm.role !== 'driver' ? 'col-span-2' : ''}`}>
                  <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu mới</Label>
                  <Input type="password" value={editForm.password} onChange={e => updateEditField('password', e.target.value)} placeholder="••••••••" className="text-sm" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <button
              onClick={() => setDeleteId(detailUser?.id ?? null)}
              className="text-xs font-medium px-2 py-1.5 transition hover:opacity-70"
              style={{ color: 'var(--theme-status-error)' }}
            >
              <Trash2 className="w-3 h-3 inline mr-0.5" /> Xoá
            </button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setDetailUser(null)}>Huỷ</Button>
            <Button onClick={handleEdit} disabled={!editForm.username.trim() || updateUser.isPending} className="gap-1.5"
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
            <Button onClick={handleDelete} disabled={deleteUser.isPending} className="flex-1" style={{ background: 'var(--theme-status-error)', color: '#fff' }}>
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateVendorDialog
        open={createVendorOpen}
        onClose={() => setCreateVendorOpen(false)}
        onConfirm={(data) => {
          createVendor.mutate(data, {
            onSuccess: (res) => {
              setCreateVendorOpen(false)
              if (res.success && res.data?.id) {
                const newId = String(res.data.id)
                if (vendorOpenedFrom === 'create') {
                  setCreateForm(prev => ({ ...prev, vendor: newId }))
                } else if (vendorOpenedFrom === 'edit') {
                  setEditForm(prev => ({ ...prev, vendor: newId }))
                }
              }
              setVendorOpenedFrom(null)
            },
          })
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
