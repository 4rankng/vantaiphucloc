import { useState, useEffect, useCallback } from 'react'
import { Users, Truck, Phone, CreditCard, Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { InfoRow } from '@/components/shared/InfoRow'
import { ROLE_ICONS, type UserAccount } from '@/pages/superadmin/types'
import { ROLE_LABELS, type Role } from '@/data/domain'
import { useAuth } from '@/contexts/AuthContext'

interface EditForm {
  username: string
  fullName: string
  phone: string
  cccd: string
  role: Role
  tractorPlate: string
  password: string
  vendor: string
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
      {children} <span className="text-xs" style={{ color: 'var(--theme-status-error)' }}>*</span>
    </Label>
  )
}

export function UserDetailDialog({
  user,
  open,
  onClose,
  onEdit,
  onDelete,
  editableRoles,
  vendors,
  saving: externalSaving,
}: {
  user: UserAccount | null
  open: boolean
  onClose: () => void
  onEdit?: (userId: string, data: Record<string, unknown>) => Promise<void>
  onDelete?: (userId: string) => Promise<void>
  editableRoles?: { value: Role; label: string }[]
  vendors?: { id: string | number; name: string }[]
  saving?: boolean
}) {
  const { user: currentUser } = useAuth()
  const isEditMode = !!onEdit
  const [editForm, setEditForm] = useState<EditForm>({
    username: '', fullName: '', phone: '', cccd: '', role: 'driver', tractorPlate: '', password: '', vendor: '',
  })
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      const vendorId = vendors?.find(v => v.name === user.vendor)?.id
      setEditForm({
        username: user.username,
        fullName: user.fullName ?? '',
        phone: user.phone ?? '',
        cccd: user.cccd ?? '',
        role: user.role,
        tractorPlate: user.tractorPlate ?? '',
        password: '',
        vendor: vendorId != null ? String(vendorId) : '',
      })
      setDeleteConfirm(false)
    }
  }, [user, vendors])

  const updateField = useCallback((field: keyof EditForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }, [])

  if (!user) return null
  const RoleIcon = ROLE_ICONS[user.role] ?? Users

  const handleSave = async () => {
    if (!onEdit || !editForm.username.trim()) return
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
        if (editForm.tractorPlate.trim()) payload.tractor_plate = editForm.tractorPlate.trim()
        if (vendorObj) payload.vendor = vendorObj.name
      }
      if (editForm.password.trim()) payload.password = editForm.password.trim()
      await onEdit(user.id, payload)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setSaving(true)
    try {
      await onDelete(user.id)
    } finally {
      setSaving(false)
    }
  }

  const isSelf = currentUser && String(currentUser.id) === user.id
  const busy = externalSaving ?? saving
  const roles = editableRoles ?? []

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thông tin tài khoản</DialogTitle></DialogHeader>

          {isEditMode ? (
            <div className="space-y-3">
              {roles.length > 0 && (
                <div className="space-y-2">
                  <RequiredLabel>Vai trò</RequiredLabel>
                  <div className={`grid gap-2 ${roles.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
                    {roles.map(r => (
                      <button
                        key={r.value}
                        onClick={() => updateField('role', r.value)}
                        className="py-2.5 px-3 rounded-xl text-sm font-medium transition-colors touch-manipulation"
                        style={{
                          background: editForm.role === r.value ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                          color: editForm.role === r.value ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Row 1: username + full name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <RequiredLabel>Tên đăng nhập</RequiredLabel>
                  <Input value={editForm.username} onChange={e => updateField('username', e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ và tên</Label>
                  <Input value={editForm.fullName} onChange={e => updateField('fullName', e.target.value)} className="text-sm" placeholder="Nguyễn Văn A" />
                </div>
              </div>
              {/* Row 2: phone + CCCD */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
                  <Input value={editForm.phone} onChange={e => updateField('phone', e.target.value)} className="text-sm" placeholder="0912-345-678" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>CCCD</Label>
                  <Input value={editForm.cccd} onChange={e => updateField('cccd', e.target.value)} className="text-sm font-mono" placeholder="001234567890" />
                </div>
              </div>
              {/* Driver-only: vendor full-width, then tractor plate + password */}
              {editForm.role === 'driver' && (
                <div className="space-y-1.5">
                  <RequiredLabel>Nhà thầu</RequiredLabel>
                  <InlineSelect
                    options={(vendors ?? []).map(v => ({ value: String(v.id), label: v.name }))}
                    value={editForm.vendor}
                    onChange={v => updateField('vendor', v)}
                    placeholder="Chọn nhà thầu"
                  />
                </div>
              )}
              {/* Row 3: tractor plate (driver) + password */}
              <div className="grid grid-cols-2 gap-3">
                {editForm.role === 'driver' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số đầu kéo</Label>
                    <Input value={editForm.tractorPlate} onChange={e => updateField('tractorPlate', e.target.value)} className="text-sm font-mono" />
                  </div>
                )}
                <div className={`space-y-1.5 ${editForm.role !== 'driver' ? 'col-span-2' : ''}`}>
                  <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu mới</Label>
                  <Input type="password" value={editForm.password} onChange={e => updateField('password', e.target.value)} placeholder="••••••••" className="text-sm" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 py-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--theme-brand-primary-light)' }}>
                  <RoleIcon className="w-6 h-6" style={{ color: 'var(--theme-brand-primary)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{user.fullName || user.username}</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5"
                    style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
              </div>
              <div className="space-y-0">
                {user.fullName && <InfoRow icon={Users} label="Họ và tên" value={user.fullName} noBorder />}
                {user.phone && <InfoRow icon={Phone} label="Số điện thoại" value={user.phone} noBorder />}
                {user.cccd && <InfoRow icon={CreditCard} label="CCCD" value={user.cccd} noBorder />}
                <InfoRow icon={Users} label={user.role === 'driver' ? 'Nhà thầu' : 'Công ty'} value={user.vendor} noBorder />
                {user.tractorPlate && <InfoRow icon={Truck} label="Biển số đầu kéo" value={user.tractorPlate} noBorder />}
              </div>
            </>
          )}

          <DialogFooter>
            {isEditMode && onDelete && !isSelf && (
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(true)}
                className="flex-1 gap-1.5"
                style={{ color: 'var(--theme-status-error)', borderColor: 'var(--theme-status-error)' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Xoá
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
            {isEditMode ? (
              <Button onClick={handleSave} disabled={!editForm.username.trim() || busy} className="flex-1 gap-1.5"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
              >
                <Pencil className="w-3.5 h-3.5" /> Lưu
              </Button>
            ) : (
              <Button onClick={onClose} className="flex-1"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                Xác nhận
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(false) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá tài khoản?</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            Tài khoản sẽ bị vô hiệu hoà. Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} disabled={busy} className="flex-1" style={{ background: 'var(--theme-status-error)', color: '#fff' }}>
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
