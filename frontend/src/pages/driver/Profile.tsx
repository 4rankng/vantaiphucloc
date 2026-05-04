import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile, useUpdateProfile, useChangePassword } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { LogOut, KeyRound, Pencil, Check, X, Phone, AtSign } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'

const ROLE_LABELS: Record<string, string> = {
  driver: 'Tài xế',
  accountant: 'Kế toán',
  director: 'Giám đốc',
}

// ─── Inline editable row ──────────────────────────────────────────────────────

function EditableRow({
  icon: Icon,
  label,
  value,
  onSave,
  type = 'text',
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  onSave: (val: string) => Promise<void>
  type?: string
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

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

  const handleCancel = () => { setDraft(value); setEditing(false) }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--theme-bg-tertiary)' }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' } as React.CSSProperties} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--theme-text-muted)' }}>
          {label}
        </p>
        {editing ? (
          <Input
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder}
            className="text-sm h-7 px-2"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          />
        ) : (
          <p className="text-sm font-medium truncate" style={{ color: value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>
            {value || placeholder || '—'}
          </p>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="touch-target w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'var(--theme-brand-primary)', color: 'white' }}
            aria-label="Lưu"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="touch-target w-10 h-10 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
            aria-label="Huỷ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="touch-target w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-[var(--theme-bg-tertiary)]"
          style={{ color: 'var(--theme-text-muted)' }}
          aria-label={`Sửa ${label}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest px-1 mb-1.5" style={{ color: 'var(--theme-text-muted)' }}>
      {children}
    </p>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
    >
      {children}
    </div>
  )
}

function Divider() {
  return <div className="mx-4" style={{ borderTop: '1px solid var(--theme-border-light)' }} />
}

// ─── Profile page ─────────────────────────────────────────────────────────────

export function Profile() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const toast = useToast()

  const { data: profile } = useProfile()
  const { mutateAsync: updateProfileField } = useUpdateProfile()
  const changePasswordMutation = useChangePassword()

  const fullName = profile?.fullName ?? user?.name ?? ''
  const phone = profile?.phone ?? ''
  const username = profile?.username ?? ''

  const saveField = async (field: 'full_name' | 'phone' | 'username', value: string) => {
    const res = await updateProfileField({ field, value })
    if (!res.success) {
      toast.error('Lỗi', res.message ?? 'Lỗi không xác định')
      throw new Error(res.message)
    }
    const updated = res.data?.value ?? value
    if (field === 'full_name') {
      updateUser({ name: updated })
      toast.success('Đã cập nhật họ tên')
    } else if (field === 'phone') {
      toast.success('Đã cập nhật số điện thoại')
    } else {
      toast.success('Đã cập nhật tên đăng nhập')
    }
  }

  const [pwDialog, setPwDialog] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const handleChangePw = async () => {
    if (newPw !== confirmPw) { toast.error('Lỗi', 'Mật khẩu xác nhận không khớp'); return }
    try {
      const res = await changePasswordMutation.mutateAsync({ currentPassword: currentPw, newPassword: newPw })
      if (res.success) {
        toast.success('Đã đổi mật khẩu')
        setPwDialog(false)
        setCurrentPw(''); setNewPw(''); setConfirmPw('')
      } else {
        toast.error('Lỗi', res.message ?? 'Lỗi không xác định')
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Lỗi không xác định'
      toast.error('Lỗi', detail)
    }
  }

  const initials = (fullName || user?.name || '?').charAt(0).toUpperCase()
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''

  return (
    <div className="pb-20 space-y-5">

      {/* Back button — inline in page body */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-2"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Quay lại
      </button>

      {/* ── Simple profile header (avatar + role only — info lives in form rows below) ── */}
      <div className="flex items-center gap-4 px-1 py-2">
        <div
          className="w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold text-white shrink-0"
          style={{ background: 'var(--theme-brand-primary)' }}
        >
          {initials}
        </div>
        <span
          className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
        >
          {roleLabel}
        </span>
      </div>

      {/* ── Thông tin cá nhân ── */}
      <div>
        <SectionLabel>Thông tin cá nhân</SectionLabel>
        <Card>
          <EditableRow
            icon={({ className }) => (
              <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
            label="Họ và tên"
            value={fullName}
            onSave={val => saveField('full_name', val)}
            placeholder="Nhập họ và tên"
          />

          <Divider />

          <EditableRow
            icon={AtSign}
            label="Tên đăng nhập"
            value={username}
            onSave={val => saveField('username', val)}
            placeholder="Nhập tên đăng nhập"
          />

          <Divider />

          <EditableRow
            icon={Phone}
            label="Số điện thoại"
            value={phone}
            onSave={val => saveField('phone', val)}
            type="tel"
            placeholder="Nhập số điện thoại"
          />
        </Card>
      </div>

      {/* ── Actions row ── */}
      <div className="flex gap-3">
        <button
          onClick={() => setPwDialog(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold text-sm touch-manipulation transition-opacity hover:opacity-80"
          style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', boxShadow: 'var(--theme-shadow-card)' }}
        >
          <KeyRound className="w-4 h-4" />
          Đổi mật khẩu
        </button>
        <button
          onClick={logout}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold text-sm touch-manipulation transition-opacity hover:opacity-80"
          style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error)' }}
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>

      {/* ── Change password dialog ── */}
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
              disabled={!currentPw || !newPw || newPw !== confirmPw || changePasswordMutation.isPending}
              className="flex-1"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              {changePasswordMutation.isPending ? 'Đang lưu...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
