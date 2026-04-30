import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { KeyRound, LogOut, Bell, BellOff } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { subscribeToPush, unsubscribeFromPush, isPushSupported, getPushSubscriptionStatus } from '@/lib/push-subscription'

export function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const handleClose = () => {
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    onClose()
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
          <Button onClick={handleClose} disabled={!currentPw || !newPw || newPw !== confirmPw} className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UserDropdown({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth()
  const [showPwDialog, setShowPwDialog] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const pushSupported = isPushSupported()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Check push subscription status when dropdown opens
  useEffect(() => {
    if (open && pushSupported) {
      getPushSubscriptionStatus().then(s => setPushEnabled(s.subscribed))
    }
  }, [open, pushSupported])

  const togglePush = useCallback(async () => {
    if (pushEnabled) {
      await unsubscribeFromPush()
      setPushEnabled(false)
    } else {
      const ok = await subscribeToPush()
      setPushEnabled(ok)
    }
  }, [pushEnabled])

  if (!open) return null

  return (
    <>
      <div
        ref={ref}
        className="absolute right-4 top-14 z-50 rounded-xl py-1 min-w-[180px]"
        style={{
          background: 'var(--theme-bg-secondary)',
          boxShadow: 'var(--theme-shadow-elevated)',
          border: '1px solid var(--theme-border-default)',
        }}
      >
        {pushSupported && (
          <button
            onClick={togglePush}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium touch-manipulation"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {pushEnabled ? (
              <Bell className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
            ) : (
              <BellOff className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
            )}
            {pushEnabled ? 'Tắt thông báo' : 'Bật thông báo'}
          </button>
        )}
        <button
          onClick={() => { onClose(); setShowPwDialog(true) }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium touch-manipulation"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          <KeyRound className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          Đổi mật khẩu
        </button>
        <button
          onClick={() => { onClose(); logout() }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium touch-manipulation"
          style={{ color: 'var(--theme-status-error-text)' }}
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
      <ProfileDialog open={showPwDialog} onClose={() => setShowPwDialog(false)} />
    </>
  )
}
