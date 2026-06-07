import { useState, useEffect, useCallback } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Users, Phone, CreditCard, Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InfoRow } from '@/components/shared/data-display/InfoRow'
import { ROLE_ICONS } from '@/pages/superadmin/types'
import type { UserAccount } from '@/services/api/users.api'
import { ROLE_LABELS, type Role } from '@/data/domain'
import { useAuth } from '@/contexts/AuthContext'

interface EditForm {
  username: string
  fullName: string
  phone: string
  cccd: string
  role: Role
  password: string
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
  saving: externalSaving,
}: {
  user: UserAccount | null
  open: boolean
  onClose: () => void
  onEdit?: (userId: string, data: Record<string, unknown>) => Promise<void>
  onDelete?: (userId: string) => Promise<void>
  editableRoles?: { value: Role; label: string }[]
  saving?: boolean
}) {
  const isMobile = useIsMobile()
  const { user: currentUser } = useAuth()
  const isEditMode = !!onEdit
  const [editForm, setEditForm] = useState<EditForm>({
    username: '', fullName: '', phone: '', cccd: '', role: 'driver', password: '',
  })
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
       
      setEditForm({
        username: user.username,
        fullName: user.fullName ?? '',
        phone: user.phone ?? '',
        cccd: user.cccd ?? '',
        role: user.role,
        password: '',
      })
      setDeleteConfirm(false)
    }
  }, [user])

  const updateField = useCallback((field: keyof EditForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }, [])

  if (!user) return null
  const RoleIcon = ROLE_ICONS[user.role] ?? Users

  const cccdInvalid = editForm.cccd.trim() !== '' && !/^\d{12}$/.test(editForm.cccd.trim())

  const handleSave = async () => {
    if (!onEdit || !editForm.username.trim() || cccdInvalid) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        username: editForm.username.trim(),
        full_name: editForm.fullName.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        cccd: editForm.cccd.trim() || undefined,
        role: editForm.role,
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
        <DialogContent
          className={isMobile ? 'flex flex-col' : ''}
          {...(isMobile ? { 'data-mobile-fullscreen': '' } : {})}
        >
          <DialogHeader><DialogTitle>Thông tin tài khoản</DialogTitle></DialogHeader>

          {isEditMode ? (
            <div className={isMobile ? 'flex-1 overflow-y-auto px-4' : ''}>
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
                  <Input value={editForm.cccd} onChange={e => updateField('cccd', e.target.value)} className={`text-sm font-mono${cccdInvalid ? ' !ring-2 !ring-[var(--theme-status-error)]' : ''}`} placeholder="001234567890" />
                  {cccdInvalid && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>CCCD phải đúng 12 chữ số</p>}
                </div>
              </div>
              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu mới</Label>
                <Input type="password" value={editForm.password} onChange={e => updateField('password', e.target.value)} placeholder="••••••••" className="text-sm" />
              </div>
            </div>
            </div>
          ) : (
            <>
              <div className={isMobile ? 'flex-1 overflow-y-auto px-4' : ''}>
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
              </div>
              </div>
            </>
          )}

          <DialogFooter>
            {isEditMode && onDelete && !isSelf && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
                className="flex-1 gap-1.5"
                style={{ color: 'var(--theme-status-error)', borderColor: 'var(--theme-status-error)' }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Xoá
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Huỷ</Button>
            {isEditMode ? (
              <Button size="sm" onClick={handleSave} disabled={!editForm.username.trim() || cccdInvalid || busy} className="flex-1 gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Lưu
              </Button>
            ) : (
              <Button size="sm" onClick={onClose} className="flex-1">
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
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)} className="flex-1">Huỷ</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy} className="flex-1">
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
