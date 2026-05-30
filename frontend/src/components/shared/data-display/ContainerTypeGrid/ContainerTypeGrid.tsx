import { useState, useRef, useEffect } from 'react'
import { CheckCircle, Plus } from 'lucide-react'
import {
  CONT_TYPES, WORK_TYPES, WORK_TYPE_LABELS,
  type ContType, type WorkType,
} from '@/data/domain'
import { hapticTap } from '@/lib/haptic'
import { playTick } from '@/lib/sound'

/**
 * ContainerTypeGrid — two independent selection groups in one widget.
 *
 *   ┌─ Loại cont ──────────────────────────────┐
 *   │ [E20] [E40] [F20] [F40]                   │  ← single-select, optional
 *   └───────────────────────────────────────────┘
 *   ┌─ Tác nghiệp ─────────────────────────────┐
 *   │ [Chạy sà lan] [Chuyển bãi] [Đóng kho] …   │  ← single-select, optional
 *   │ [Lấy vỏ hạ hàng] [Xuất / Nhập tàu] [+Khác]│
 *   └───────────────────────────────────────────┘
 *
 * Clicking an already-selected chip clears that group. The two groups are
 * fully independent — selecting E40 does not affect Tác nghiệp and vice versa.
 */
interface ContainerTypeGridProps {
  contType: ContType | null
  workType: WorkType | null
  onContTypeChange: (next: ContType | null) => void
  onWorkTypeChange: (next: WorkType | null) => void
  /** Show warning border on the cont-type group (e.g. required-but-missing). */
  contTypeError?: boolean
  /** Show warning border on the workType group. */
  workTypeError?: boolean
}

const CONT_TYPE_SET: ReadonlySet<string> = new Set(CONT_TYPES)
const OPERATION_TYPES = WORK_TYPES.filter(w => !CONT_TYPE_SET.has(w))

export function ContainerTypeGrid({
  contType, workType,
  onContTypeChange, onWorkTypeChange,
  contTypeError, workTypeError,
}: ContainerTypeGridProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showCustom && inputRef.current) inputRef.current.focus()
  }, [showCustom])

  // ── Cont-type click: toggle ──
  const handleContTypeSelect = (ct: ContType) => {
    hapticTap(); playTick()
    onContTypeChange(contType === ct ? null : ct)
  }

  // ── Operation click: toggle, also clears custom-mode ──
  const handleWorkTypeSelect = (wt: WorkType) => {
    hapticTap(); playTick()
    onWorkTypeChange(workType === wt ? null : wt)
    setShowCustom(false)
  }

  const handleCustomConfirm = () => {
    const trimmed = customValue.trim()
    if (trimmed) {
      hapticTap(); playTick()
      onWorkTypeChange(trimmed as WorkType)
      setCustomValue('')
      setShowCustom(false)
    } else {
      setShowCustom(false)
    }
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleCustomConfirm() }
    if (e.key === 'Escape') { setShowCustom(false); setCustomValue('') }
  }

  // Custom value detection: workType is set but it's not a known operation/cont.
  const isCustomValue =
    !!workType
    && !OPERATION_TYPES.includes(workType)
    && !CONT_TYPE_SET.has(workType)

  // ── Shared chip renderer ──
  const chip = (opts: {
    key: string
    label: string
    selected: boolean
    onClick: () => void
    icon?: React.ReactNode
    error?: boolean
    muted?: boolean
    compact?: boolean
    /** Show a checkmark when selected (default true). Disable for tight chips
     *  where the green background is already enough selection feedback. */
    showSelectedIcon?: boolean
  }) => {
    const { selected, error, muted } = opts
    const showCheck = opts.showSelectedIcon !== false
    return (
      <button
        key={opts.key}
        type="button"
        onClick={opts.onClick}
        className={[
          'min-h-[44px] rounded-xl flex items-center justify-center gap-1 transition-all',
          'active:translate-y-[1px] touch-manipulation',
          opts.compact ? 'text-sm font-bold' : 'text-xs font-bold',
        ].join(' ')}
        style={{
          background: selected ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
          color: selected
            ? 'var(--theme-text-on-brand)'
            : muted ? 'var(--theme-text-muted)' : 'var(--theme-text-primary)',
          border: `2px solid ${
            error && !selected
              ? 'var(--theme-status-warning)'
              : selected
                ? 'var(--theme-brand-primary)'
                : 'var(--theme-border-default)'
          }`,
          boxShadow: selected ? 'none' : 'var(--theme-shadow-card)',
          padding: '0 10px',
        }}
      >
        {opts.icon}
        <span className="whitespace-nowrap">{opts.label}</span>
        {selected && showCheck && <CheckCircle className="w-3 h-3 shrink-0" />}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* ─── Group 1: Loại cont ─── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider px-0.5" style={{ color: 'var(--theme-text-muted)' }}>
          Loại cont
        </p>
        <div className="grid grid-cols-4 gap-2">
          {CONT_TYPES.map(ct =>
            chip({
              key: ct,
              label: ct,
              selected: contType === ct,
              onClick: () => handleContTypeSelect(ct),
              error: contTypeError,
              compact: true,
              showSelectedIcon: false,
            }),
          )}
        </div>
      </div>

      {/* ─── Group 2: Tác nghiệp ─── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider px-0.5" style={{ color: 'var(--theme-text-muted)' }}>
          Tác nghiệp
        </p>
        <div className="grid grid-cols-2 gap-2">
          {OPERATION_TYPES.map(wt =>
            chip({
              key: wt,
              label: WORK_TYPE_LABELS[wt] ?? wt,
              selected: workType === wt,
              onClick: () => handleWorkTypeSelect(wt),
              error: workTypeError,
            }),
          )}

          {!showCustom && chip({
            key: '__custom__',
            label: isCustomValue ? (workType as string) : 'Khác',
            selected: isCustomValue,
            onClick: () => setShowCustom(true),
            icon: <Plus className="w-3 h-3" />,
            error: workTypeError,
            muted: !isCustomValue,
          })}
        </div>

        {showCustom && (
          <input
            ref={inputRef}
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            onBlur={handleCustomConfirm}
            placeholder="Nhập tác nghiệp khác..."
            className="w-full h-11 rounded-xl px-3.5 text-sm"
            style={{
              background: 'var(--theme-bg-tertiary)',
              border: '1.5px solid var(--theme-brand-primary)',
              color: 'var(--theme-text-primary)',
            }}
          />
        )}
      </div>
    </div>
  )
}
