import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Merge, ArrowUpDown } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import type { Location } from '@/data/domain'

export interface LocationMergeDialogProps {
  open: boolean
  onClose: () => void
  locations: Location[]
  presetSource?: number
  presetTarget?: number
  onMerge: (s: number, t: number) => void
  merging: boolean
}

export function LocationMergeDialog({
  open, onClose, locations, presetSource, presetTarget, onMerge, merging,
}: LocationMergeDialogProps) {
  const [source, setSource] = useState<number | ''>('')
  const [target, setTarget] = useState<number | ''>('')

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSource(presetSource ?? '')
      setTarget(presetTarget ?? '')
    }
  }, [open, presetSource, presetTarget])

  const handleClose = useCallback(() => { setSource(''); setTarget(''); onClose() }, [onClose])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Gộp địa điểm trùng</DialogTitle></DialogHeader>

        <div
          className="flex items-start gap-3 rounded-lg px-3 py-2.5"
          style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Thao tác không thể hoàn tác. Toàn bộ tên phụ và tham chiếu sẽ chuyển sang đích.
          </p>
        </div>

        <div className="pt-1">
          <div>
            <label className="nepo-field-label">
              Địa điểm nguồn <span style={{ color: 'var(--ink-3)' }}>(sẽ bị gộp)</span>
            </label>
            <InlineSelect
              placeholder="— Chọn địa điểm —"
              value={source !== '' ? String(source) : ''}
              options={[
                { value: '', label: '— Chọn địa điểm —' },
                ...locations.map(l => ({ value: String(l.id), label: l.name })),
              ]}
              onChange={v => setSource(v ? Number(v) : '')}
            />
          </div>

          {/* Swap button */}
          <div className="flex items-center justify-center my-2">
            <button
              type="button"
              onClick={() => { const tmp = source; setSource(target); setTarget(tmp) }}
              disabled={source === '' && target === ''}
              title="Hoán đổi nguồn và đích"
              className="flex items-center justify-center rounded-full transition-colors"
              style={{
                width: 32,
                height: 32,
                background: 'var(--surface-3)',
                color: source !== '' || target !== '' ? 'var(--accent)' : 'var(--ink-4)',
                border: '1px solid var(--line)',
                opacity: source === '' && target === '' ? 0.5 : 1,
              }}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div>
            <label className="nepo-field-label">
              Địa điểm đích <span style={{ color: 'var(--ink-3)' }}>(giữ lại)</span>
            </label>
            <InlineSelect
              placeholder="— Chọn địa điểm —"
              value={target !== '' ? String(target) : ''}
              options={[
                { value: '', label: '— Chọn địa điểm —' },
                ...locations.filter(l => l.id !== source).map(l => ({ value: String(l.id), label: l.name })),
              ]}
              onChange={v => setTarget(v ? Number(v) : '')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>Huỷ</Button>
          <Button
            size="sm"
            onClick={() => { if (source && target && source !== target) onMerge(source, target) }}
            disabled={merging || !source || !target || source === target}
          >
            <Merge className="h-4 w-4" />
            {merging ? 'Đang gộp...' : 'Gộp địa điểm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
