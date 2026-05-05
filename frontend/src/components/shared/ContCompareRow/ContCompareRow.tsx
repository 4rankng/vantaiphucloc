import { useState } from 'react'
import { CheckCircle2, ArrowLeftRight, Pencil } from 'lucide-react'
import { ContBadge } from '@/components/shared/ContBadge'
import { ContEditPanel } from '@/components/shared/ContEditPanel'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover/Popover'
import type { WorkType } from '@/data/domain'

interface ContEntry { type: string; number: string }

interface EditConfig {
  onChange: (containers: ContEntry[]) => void
  accentColor?: string
}

export function ContCompareRow({ left, right, leftLabel, rightLabel, matched, onTapLeft, onTapRight, editLeft, editRight }: {
  left: ContEntry | ContEntry[]; right: ContEntry | ContEntry[]; matched?: boolean
  leftLabel?: string; rightLabel?: string
  onTapLeft?: () => void; onTapRight?: () => void
  editLeft?: EditConfig
  editRight?: EditConfig
}) {
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const leftArr = Array.isArray(left) ? left : [left]
  const rightArr = Array.isArray(right) ? right : [right]

  const renderSide = (
    side: 'left' | 'right',
    containers: ContEntry[],
    sideLabel: string | undefined,
    onTap: (() => void) | undefined,
    edit: EditConfig | undefined,
    open: boolean,
    setOpen: (v: boolean) => void,
  ) => {
    const color = side === 'left' ? 'var(--theme-status-warning)' : 'var(--theme-brand-primary)'
    const defaultLabel = side === 'left' ? 'Yêu cầu' : 'Đã chạy'

    if (edit) {
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 touch-manipulation active:opacity-70 group">
              <p className="text-xs font-medium mb-1" style={{ color }}>{sideLabel ?? defaultLabel}</p>
              {containers.map((c, i) => (
                <div key={i} className="flex items-center gap-1 mb-0.5">
                  <ContBadge type={c.type as WorkType} />
                  <span className="text-sm font-mono font-medium" style={{ color: 'var(--theme-text-primary)' }}>{c.number}</span>
                </div>
              ))}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity mt-1" style={{ color: 'var(--theme-text-muted)' }} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" side="bottom" className="p-3" onOpenAutoFocus={e => e.preventDefault()}>
            <ContEditPanel containers={containers} onChange={edit.onChange} accentColor={edit.accentColor} />
          </PopoverContent>
        </Popover>
      )
    }

    return (
      <button onClick={onTap} className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 touch-manipulation active:opacity-70">
        <p className="text-xs font-medium mb-1" style={{ color }}>{sideLabel ?? defaultLabel}</p>
        {containers.map((c, i) => (
          <div key={i} className="flex items-center gap-1 mb-0.5">
            <ContBadge type={c.type as WorkType} />
            <span className="text-sm font-mono font-medium" style={{ color: 'var(--theme-text-primary)' }}>{c.number}</span>
          </div>
        ))}
      </button>
    )
  }

  return (
    <div className="rounded-xl p-3" style={{
      background: matched ? 'var(--theme-status-success-light)' : 'var(--theme-bg-secondary)',
      border: matched ? '1px solid var(--theme-status-success)' : '1px solid var(--theme-border-default)',
    }}>
      <div className="flex items-center gap-1.5 mb-2">
        {matched && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />}
        <p className="text-xs font-bold uppercase tracking-wide" style={{
          color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)',
        }}>Container</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
        {renderSide('left', leftArr, leftLabel, onTapLeft, editLeft, leftOpen, setLeftOpen)}
        <div className="flex items-center pt-3">
          <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }} />
        </div>
        {renderSide('right', rightArr, rightLabel, onTapRight, editRight, rightOpen, setRightOpen)}
      </div>
    </div>
  )
}
