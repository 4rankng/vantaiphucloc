import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle, Merge } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import type { Location } from '@/data/domain'

export function MergeDialog({
  open, onClose, locations, presetSource, presetTarget, onMerge, merging,
}: {
  open: boolean
  onClose: () => void
  locations: Location[]
  presetSource?: number
  presetTarget?: number
  onMerge: (s: number, t: number) => void
  merging: boolean
}) {
  const [source, setSource] = useState<number | ''>('')
  const [target, setTarget] = useState<number | ''>('')

  useEffect(() => {
    if (open) {
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

        <div className="space-y-3 pt-1">
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
          <Button variant="ghost" onClick={handleClose}>Huỷ</Button>
          <Button
            variant="default"
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
