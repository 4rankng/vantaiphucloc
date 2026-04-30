import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'

interface QuickCreateDialogProps {
  open: boolean
  onClose: () => void
  title: string
  label: string
  placeholder: string
  onConfirm: (name: string) => Promise<void> | void
}

export function QuickCreateDialog({ open, onClose, title, label, placeholder, onConfirm }: QuickCreateDialogProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    setName('')
    onClose()
  }

  const handleConfirm = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onConfirm(name.trim())
      setName('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{label}</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={placeholder}
            className="text-sm"
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="flex-1">Huỷ</Button>
          <Button
            onClick={handleConfirm}
            disabled={!name.trim() || saving}
            className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {saving ? 'Đang tạo...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
