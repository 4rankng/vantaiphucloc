import { CheckCircle2, ArrowLeftRight } from 'lucide-react'

export function CompareRow({ label, left, right, leftLabel, rightLabel, matched, onTapLeft, onTapRight }: {
  label: string; left: string; right: string; matched?: boolean
  leftLabel?: string; rightLabel?: string
  onTapLeft?: () => void; onTapRight?: () => void
}) {
  return (
    <div className="rounded-xl p-3" style={{
      background: matched ? 'var(--theme-status-success-light)' : 'var(--theme-bg-secondary)',
      border: matched ? '1px solid var(--theme-status-success)' : '1px solid var(--theme-border-default)',
    }}>
      <div className="flex items-center gap-1.5 mb-2">
        {matched && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-success)' }} />}
        <p className="text-xs font-bold uppercase tracking-wide" style={{
          color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)',
        }}>{label}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <button onClick={onTapLeft} className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 transition-colors touch-manipulation active:opacity-70" style={{ background: 'transparent' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--theme-status-warning)' }}>{leftLabel ?? 'Yêu cầu'}</p>
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{left || '-'}</p>
          </div>
        </button>
        <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" style={{ color: matched ? 'var(--theme-status-success)' : 'var(--theme-text-muted)' }} />
        <button onClick={onTapRight} className="min-w-0 text-left rounded-lg px-2 py-1.5 -mx-2 transition-colors touch-manipulation active:opacity-70" style={{ background: 'transparent' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--theme-brand-primary)' }}>{rightLabel ?? 'Đã chạy'}</p>
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{right || '-'}</p>
          </div>
        </button>
      </div>
    </div>
  )
}
