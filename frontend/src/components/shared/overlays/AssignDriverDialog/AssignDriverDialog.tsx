import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from '@/components/ui'
import { Plate } from '@/components/shared/data-display/Plate'
import type { Driver } from '@/data/domain'

export interface AssignDriverDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: { driverId: number; effectiveFrom: string }) => void
  drivers: Driver[]
  loading?: boolean
}

export function AssignDriverDialog({
  open,
  onClose,
  onConfirm,
  drivers,
  loading = false,
}: AssignDriverDialogProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )

  useEffect(() => {
    if (open) {
      setSelectedDriverId(null)
      setEffectiveFrom(new Date().toISOString().slice(0, 10))
    }
  }, [open])

  const handleConfirm = () => {
    if (selectedDriverId === null) return
    onConfirm({ driverId: selectedDriverId, effectiveFrom })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gán lái xe</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          <label className="nepo-field-label">Chọn lái xe</label>
          <div
            className="max-h-64 overflow-y-auto"
            style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}
          >
            {drivers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
                  Chưa có lái xe nào
                </p>
              </div>
            ) : (
              drivers.map((d: Driver, i: number) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDriverId(d.id)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors"
                  style={{
                    borderBottom: i < drivers.length - 1 ? '1px solid var(--line)' : 'none',
                    background: selectedDriverId === d.id ? 'var(--accent-soft)' : 'transparent',
                  }}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: selectedDriverId === d.id ? 'var(--accent)' : 'var(--surface-3)',
                       color: selectedDriverId === d.id ? 'var(--theme-text-on-brand)' : 'var(--ink-2)',
                    }}
                  >
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className="flex-1 text-[13.5px] font-medium"
                    style={{ color: 'var(--ink)' }}
                  >
                    {d.fullName ?? d.username}
                  </span>
                  {d.vehiclePlate && <Plate>{d.vehiclePlate}</Plate>}
                </button>
              ))
            )}
          </div>
          <div className="mt-3">
            <label className="nepo-field-label">Ngày hiệu lực</label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="nepo-input w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Huỷ
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!selectedDriverId || loading}
          >
            Gán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
