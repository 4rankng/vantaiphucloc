import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
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
  const isMobile = useIsMobile()
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
      <DialogContent
        className={isMobile ? 'flex flex-col' : ''}
        {...(isMobile ? { 'data-mobile-fullscreen': '' } : {})}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className={isMobile ? 'flex-1 overflow-y-auto px-4' : ''}>
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
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} className="flex-1">Huỷ</Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!name.trim() || saving}
            className="flex-1"
          >
            {saving ? 'Đang tạo...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
