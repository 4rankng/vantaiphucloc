import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api/client'
import { useToast } from '@/components/atoms/Toast'
import {
  Phone, LogOut, KeyRound, ChevronRight, UserCircle, User, Pencil, Check, X,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'

const ROLE_LABELS: Record<string, string> = {
  driver: 'Tài xế',
  accountant: 'Kế toán',
  director: 'Giám đốc',
}

// ─── Inline editable field ────────────────────────────────────────────────────

function EditableField({
  label,
  value,
  onSave,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onSave: (val: string) => Promise<void>
  type?: string
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  // Sync if parent value changes
  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  const handleSave = async () => {
    if (draft.trim() === value) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(draft.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraft(value)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <span className="text-sm shrink-0 w-28" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
      {editing ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder}
            className="text-sm h-8 flex-1"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-7 h-7 flex items-center justify-center rounded-full shrink-0 transition-colors"
            style={{ background: 'var(--theme-brand-primary)', color: 'white' }}
            aria-label="Lưu"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCancel}
            className="w-7 h-7 flex items-center justify-center rounded-full shrink-0 transition-colors"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
            aria-label="Huỷ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
            {value || <span style={{ color: 'var(--theme-text-muted)' }}>Chưa cập nhật</span>}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-[var(--theme-bg-tertiary)]"
            style={{ color: 'var(--theme-text-muted)' }}
            aria-label={`Sửa ${label}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Profile page ─────────────────────────────────────────────────────────────

export function Profile() {
  const { user, logout, updateUser } = useAuth()
  const toast = useToast()

  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState(user?.name ?? '')

  // Load current profile from API
  useEffect(() => {
    api.get('/users/me').then(res => {
      setPhone(res.data.phone ?? '')
      setFullName(res.data.full_name ?? user?.name ?? '')
    }).catch(() => {})
  }, [user?.id])

  const saveField = async (field: 'full_name' | 'phone', value: string) => {
    try {
      const res = await api.put('/users/me', { [field]: value })
      if (field === 'full_name') {
        setFullName(res.data.full_name ?? value)
        updateUser({ name: res.data.full_name ?? value })
        toast.success('Đã cập nhật họ tên')
      } else {
        setPhone(res.data.phone ?? value)
        toast.success('Đã cập nhật số điện thoại')
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Lỗi không xác định'
      toast.error('Lỗi', detail)
      throw err // re-throw so EditableField stays in edit mode
    }
  }

  // Change password dialog
  const [pwDialog, setPwDialog] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const handleChangePw = async () => {
    if (newPw !== confirmPw) {
      toast.error('Lỗi', 'Mật khẩu xác nhận không khớp')
      return
    }
    setSavingPw(true)
    try {
      await api.post('/users/change-password', {
        current_password: currentPw,
        new_password: newPw,
      })
      toast.success('Đã đổi mật khẩu')
      setPwDialog(false)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Lỗi không xác định'
      toast.error('Lỗi', detail)
    } finally {
      setSavingPw(false)
    }
  }

  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''

  return (
    <div className="pb-6 space-y-4">
      {/* Avatar + name card */}
      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-xl font-bold"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          {fullName?.charAt(0)?.toUpperCase() ?? <UserCircle className="w-7 h-7" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>{fullName || user?.name}</p>
          {phone && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{phone}</span>
            </div>
          )}
        </div>
        <span
          className="text-xs font-semibold px-2 py-1 rounded-full shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
        >
          {roleLabel}
        </span>
      </div>

      {/* Editable info */}
      <div
        className="rounded-2xl overflow-hidden divide-y"
        style={{
          background: 'var(--theme-bg-secondary)',
          boxShadow: 'var(--theme-shadow-card)',
          divideColor: 'var(--theme-border-light)',
        }}
      >
        {/* Read-only: account ID */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm w-28 shrink-0" style={{ color: 'var(--theme-text-muted)' }}>Mã tài khoản</span>
          <span className="text-sm font-semibold font-mono" style={{ color: 'var(--theme-text-primary)' }}>#{user?.id}</span>
        </div>

        <div style={{ borderTop: '1px solid var(--theme-border-light)' }}>
          <EditableField
            label="Họ và tên"
            value={fullName}
            onSave={val => saveField('full_name', val)}
            placeholder="Nhập họ và tên"
          />
        </div>

        <div style={{ borderTop: '1px solid var(--theme-border-light)' }}>
          <EditableField
            label="Số điện thoại"
            value={phone}
            onSave={val => saveField('phone', val)}
            type="tel"
            placeholder="Nhập số điện thoại"
          />
        </div>
      </div>

      {/* Security */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
      >
        <button
          onClick={() => setPwDialog(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 touch-manipulation transition-colors hover:bg-[var(--theme-bg-tertiary)]"
        >
          <div className="flex items-center gap-3">
            <KeyRound className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Đổi mật khẩu</span>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm touch-manipulation transition-colors"
        style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error)' }}
      >
        <LogOut className="w-4 h-4" />
        Đăng xuất
      </button>

      {/* Change password dialog */}
      <Dialog open={pwDialog} onOpenChange={open => { if (!open) { setPwDialog(false); setCurrentPw(''); setNewPw(''); setConfirmPw('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu hiện tại</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu mới</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Xác nhận mật khẩu mới</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialog(false)} className="flex-1">Huỷ</Button>
            <Button
              onClick={handleChangePw}
              disabled={!currentPw || !newPw || newPw !== confirmPw || savingPw}
              className="flex-1"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              {savingPw ? 'Đang lưu...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
