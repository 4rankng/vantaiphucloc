import { useState, useCallback } from 'react'
import { Zap } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label'

interface Props {
  open: boolean
  onClose: () => void
  defaultDateFrom: string
  defaultDateTo: string
  isPending: boolean
  onConfirm: (dateFrom: string, dateTo: string) => void
}

export function AutoMatchDateDialog({
  open,
  onClose,
  defaultDateFrom,
  defaultDateTo,
  isPending,
  onConfirm,
}: Props) {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        onClose()
      } else {
        setDateFrom(defaultDateFrom)
        setDateTo(defaultDateTo)
      }
    },
    [onClose, defaultDateFrom, defaultDateTo]
  )

  const handleConfirm = useCallback(() => {
    if (!dateFrom || !dateTo) return
    onConfirm(dateFrom, dateTo)
  }, [dateFrom, dateTo, onConfirm])

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" style={{ color: 'var(--theme-accent)' }} />
            Tự động ghép
          </DialogTitle>
          <DialogDescription>
            Chọn khoảng thời gian để quét các chuyến chưa ghép.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="auto-match-from">Từ ngày</Label>
            <Input
              id="auto-match-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auto-match-to">Đến ngày</Label>
            <Input
              id="auto-match-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!dateFrom || !dateTo || isPending}
          >
            <Zap className="h-4 w-4" />
            Quét
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
