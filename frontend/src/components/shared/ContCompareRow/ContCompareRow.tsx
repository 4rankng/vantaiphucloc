import { CheckCircle2, ArrowLeftRight } from 'lucide-react'
import { ContBadge } from '@/components/shared/ContBadge'
import type { TripOrder } from '@/data/domain'

interface ContEntry { type: string; number: string }

export function ContCompareRow({ left, right, leftLabel, rightLabel, matched, onTapLeft, onTapRight }: {
  left: ContEntry | ContEntry[]; right: ContEntry | ContEntry[]; matched?: boolean
  leftLabel?: string; rightLabel?: string
  onTapLeft?: () => void; onTapRight?: () => void
}) {
  const leftArr = Array.isArray(left) ? left : [left]
  const rightArr = Array.isArray(right) ? right : [right]

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
        <button onClick={onTapLeft} className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 touch-manipulation active:opacity-70">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--theme-status-warning)' }}>{leftLabel ?? 'Yêu cầu'}</p>
          {leftArr.map((c, i) => (
            <div key={i} className="flex items-center gap-1 mb-0.5">
              <ContBadge type={c.type as TripOrder['workType']} />
              <span className="text-sm font-mono font-medium" style={{ color: 'var(--theme-text-primary)' }}>{c.number}</span>
            </div>
          ))}
        </button>
        <div className="flex items-center pt-3">
          <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }} />
        </div>
        <button onClick={onTapRight} className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 touch-manipulation active:opacity-70">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--theme-brand-primary)' }}>{rightLabel ?? 'Đã chạy'}</p>
          {rightArr.map((c, i) => (
            <div key={i} className="flex items-center gap-1 mb-0.5">
              <ContBadge type={c.type as TripOrder['workType']} />
              <span className="text-sm font-mono font-medium" style={{ color: 'var(--theme-text-primary)' }}>{c.number}</span>
            </div>
          ))}
        </button>
      </div>
    </div>
  )
}
