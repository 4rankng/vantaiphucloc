import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from '@/components/ui'

export interface AddVehicleDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (plate: string) => void
  loading?: boolean
}

export function AddVehicleDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
}: AddVehicleDialogProps) {
  const [plate, setPlate] = useState('')

  const handleConfirm = () => {
    if (!plate.trim()) return
    onConfirm(plate.trim())
    setPlate('')
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      setPlate('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm xe mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="nepo-field-label" htmlFor="new-plate">Biển số</label>
            <input
              id="new-plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="15C-12345"
              className="nepo-input"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirm()
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { onClose(); setPlate('') }}>
            Huỷ
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!plate.trim() || loading}
          >
            Thêm xe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
