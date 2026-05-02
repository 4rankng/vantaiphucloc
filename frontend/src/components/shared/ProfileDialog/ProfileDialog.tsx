import { useState, useRef, useEffect, useCallback } from 'react'
import type React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api/client'
import { useToast } from '@/components/atoms/Toast'
import { LogOut, Bell, BellOff, UserCircle, ChevronRight, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { subscribeToPush, unsubscribeFromPush, isPushSupported, getPushSubscriptionStatus } from '@/lib/push-subscription'

const ROLE_LABELS: Record<string, string> = {
  driver: 'Tài xế',
  accountant: 'Kế toán',
  director: 'Giám đốc',
}

// ─── Change Password Dialog ───────────────────────────────────────────────────

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    onClose()
  }

  const handleSubmit = async () => {
    if (newPw !== confirmPw) {
      toast.error('Lỗi', 'Mật khẩu xác nhận không khớp')
      return
    }
    setSaving(true)
    try {
      await api.post('/change-password', {
        current_password: currentPw,
        new_password: newPw,
      })
      toast.success('Đã đổi mật khẩu')
      handleClose()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Lỗi không xác định'
      toast.error('Lỗi', detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Đổi mật khẩu</DialogTitle></DialogHeader>
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
          <Button variant="outline" onClick={handleClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!currentPw || !newPw || newPw !== confirmPw || saving} className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── User Dropdown (topbar profile button) ────────────────────────────────────

export function UserDropdown({ open, onClose, anchorRef }: {
  open: boolean
  onClose: () => void
  anchorRef?: React.RefObject<HTMLDivElement | null>
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const inAnchor = anchorRef?.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inAnchor && !inDropdown) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose, anchorRef])

  const goToProfile = useCallback(() => {
    onClose()
    if (user?.role) navigate(`/${user.role}/profile`)
  }, [onClose, navigate, user])

  const handleLogout = useCallback(() => {
    onClose()
    logout()
  }, [onClose, logout])

  if (!open) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden min-w-[200px]"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-elevated)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      {/* Profile info */}
      <button
        onClick={goToProfile}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium touch-manipulation transition-colors hover:bg-[var(--theme-bg-tertiary)]"
        style={{ color: 'var(--theme-text-primary)' }}
      >
        <UserCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
        <span className="flex-1 text-left">Thông tin cá nhân</span>
      </button>

      <div style={{ borderTop: '1px solid var(--theme-border-light)' }} />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium touch-manipulation transition-colors hover:bg-red-50"
        style={{ color: 'var(--theme-status-error)' }}
      >
        <LogOut className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">Đăng xuất</span>
      </button>
    </div>
  )
}

// ─── Sidebar profile modal (desktop sidebar, kept for legacy) ─────────────────

export function SidebarProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [showPwDialog, setShowPwDialog] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const pushSupported = isPushSupported()

  useEffect(() => {
    if (open && pushSupported) {
      getPushSubscriptionStatus().then(s => setPushEnabled(s.subscribed))
    }
  }, [open, pushSupported])

  const togglePush = useCallback(async () => {
    if (pushEnabled) {
      await unsubscribeFromPush()
      setPushEnabled(false)
      toast.success('Đã tắt thông báo đẩy')
    } else {
      const ok = await subscribeToPush()
      setPushEnabled(ok)
      if (ok) toast.success('Đã bật thông báo đẩy')
    }
  }, [pushEnabled, toast])

  const handleLogout = useCallback(() => {
    onClose()
    logout()
    navigate('/')
  }, [logout, navigate, onClose])

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
          {/* Green header with avatar */}
          <div
            className="px-5 pt-5 pb-4 relative"
            style={{ background: 'var(--theme-brand-primary)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                aria-label="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-base font-bold text-white leading-tight">{user?.name}</p>
            <p className="text-xs text-white/60 mt-0.5">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</p>
          </div>

          {/* Account ID row */}
          <div
            className="px-5 py-2.5 flex items-center gap-2"
            style={{ background: 'var(--theme-bg-tertiary)', borderBottom: '1px solid var(--theme-border-light)' }}
          >
            <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Mã tài khoản</span>
            <span className="ml-auto text-xs font-semibold font-mono" style={{ color: 'var(--theme-text-primary)' }}>#{user?.id}</span>
          </div>

          {/* Action list */}
          <div style={{ background: 'var(--theme-bg-secondary)' }}>
            {pushSupported && (
              <>
                <button
                  onClick={togglePush}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors hover:bg-[var(--theme-bg-tertiary)]"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  {pushEnabled ? (
                    <Bell className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />
                  ) : (
                    <BellOff className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                  )}
                  <span className="flex-1 text-left">{pushEnabled ? 'Tắt thông báo đẩy' : 'Bật thông báo đẩy'}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                </button>
                <div className="mx-5" style={{ borderTop: '1px solid var(--theme-border-light)' }} />
              </>
            )}
            <button
              onClick={() => { onClose(); setShowPwDialog(true) }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors hover:bg-[var(--theme-bg-tertiary)]"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              <UserCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="flex-1 text-left">Thông tin cá nhân</span>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
            </button>
          </div>

          {/* Logout button */}
          <div
            className="px-5 py-4"
            style={{ borderTop: '1px solid var(--theme-border-light)', background: 'var(--theme-bg-secondary)' }}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error)' }}
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ProfileDialog open={showPwDialog} onClose={() => setShowPwDialog(false)} />
    </>
  )
}
