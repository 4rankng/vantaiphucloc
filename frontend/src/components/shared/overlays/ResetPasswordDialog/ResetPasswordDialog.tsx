import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from '@/components/ui'

export interface ResetPasswordDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: { username: string; password: string }) => Promise<void>
  driver: { fullName: string | null; username: string } | null
}

export function ResetPasswordDialog({
  open,
  onClose,
  onConfirm,
  driver,
}: ResetPasswordDialogProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && driver) {
      setUsername(driver.username)
      setPassword('')
      setSaving(false)
    }
  }, [open, driver])

  const handleConfirm = async () => {
    if (!driver) return
    const hasPwd = password.trim().length > 0
    const hasUser = username.trim() !== driver.username
    if (!hasPwd && !hasUser) return

    setSaving(true)
    try {
      await onConfirm({ username: username.trim(), password: password.trim() })
      onClose()
    } catch {
      // handled by parent or toast
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }

  const isConfirmDisabled =
    !driver ||
    (password.trim().length === 0 && username.trim() === driver.username) ||
    saving

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cài đặt tài khoản</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Cài đặt cho{' '}
            <strong style={{ color: 'var(--ink)' }}>
              {driver?.fullName || driver?.username}
            </strong>
          </p>
          <div>
            <label className="nepo-field-label">Tên đăng nhập</label>
            <input
              className="nepo-input"
              type="text"
              placeholder="Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>
          <div>
            <label className="nepo-field-label">Mật khẩu mới</label>
            <input
              className="nepo-input"
              type="text"
              placeholder="Mật khẩu mới"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isConfirmDisabled) {
                  handleConfirm()
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={saving}
          >
            Huỷ
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
