import { useState, useRef, useEffect } from 'react'
import { User, Pencil, Check, X, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/data/domain'
import type { DriverSalaryRecord, DriverEarnings } from '@/services/api/salary.api'

export type SalaryMobileRow = (DriverSalaryRecord | DriverEarnings) & {
  matchedOrderCount?: number
  totalEarnings?: number
  baseSalary?: number
  totalSalary?: number
  totalAllowance?: number
}

export interface SalaryMobileCardProps {
  row: SalaryMobileRow
  onSaveAllowance: (driverId: number, value: number) => void
  onClickBaseSalary?: (driverId: number, name: string | null) => void
  saving?: boolean
}

const monoStyle: React.CSSProperties = { fontFamily: 'var(--theme-font-mono)' }

export function SalaryMobileCard({
  row,
  onSaveAllowance,
  onClickBaseSalary,
  saving = false,
}: SalaryMobileCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(row.allowance))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(String(row.allowance))
  }, [row.allowance, editing])

  // Support both salary record (basicSalary/bonusSalary) and earnings (baseSalary/totalSalary)
  const basicSalary = 'basicSalary' in row ? row.basicSalary : (row.baseSalary ?? 0)
  const bonusSalary = 'bonusSalary' in row ? row.bonusSalary : (row.totalSalary ?? 0)
  const allowance = row.allowance
  const totalEarnings = 'totalEarnings' in row && row.totalEarnings != null
    ? row.totalEarnings
    : basicSalary + bonusSalary + allowance
  const tripCount = row.matchedOrderCount ?? 0
  const driverName = ('driverName' in row ? row.driverName : null) ?? ('driverUsername' in row ? row.driverUsername : null) ?? '—'

  const save = () => {
    setEditing(false)
    const parsed = parseInt(draft.replace(/\D/g, ''), 10)
    if (!isNaN(parsed) && parsed !== allowance) {
      onSaveAllowance(row.driverId, parsed)
    }
  }

  const cancel = () => {
    setDraft(String(allowance))
    setEditing(false)
  }

  return (
    <div
      className="p-4 rounded-xl border active:scale-[0.99] touch-manipulation space-y-2.5"
      style={{
        background: 'var(--theme-bg-secondary, #ffffff)',
        borderColor: 'var(--theme-border-default, #e4e4e7)',
      }}
    >
      {/* Header: driver name + trip count */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
        >
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate" style={{ color: 'var(--ink)' }}>
            {driverName}
          </div>
          {('driverUsername' in row && row.driverUsername) && (
            <div className="text-[11px] font-mono truncate" style={{ color: 'var(--ink-3)' }}>
              {row.driverUsername}
            </div>
          )}
        </div>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
        >
          {tripCount} chuyến
        </span>
      </div>

      {/* Financials grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1.5" style={{ borderTop: '1px solid var(--line)' }}>
        {onClickBaseSalary ? (
          <button
            type="button"
            onClick={() => onClickBaseSalary(row.driverId, ('driverName' in row ? row.driverName : null))}
            className="flex flex-col items-start text-left"
          >
            <span className="text-[10.5px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Lương CB</span>
            <span
              className="text-[12.5px] font-semibold tabular-nums hover:underline"
              style={{ ...monoStyle, color: 'var(--accent)' }}
            >
              {formatCurrency(basicSalary)}
            </span>
          </button>
        ) : (
          <div className="flex flex-col items-start">
            <span className="text-[10.5px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Lương CB</span>
            <span className="text-[12.5px] font-semibold tabular-nums" style={{ ...monoStyle, color: 'var(--ink)' }}>
              {formatCurrency(basicSalary)}
            </span>
          </div>
        )}

        <div className="flex flex-col items-start">
          <span className="text-[10.5px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Lương SL</span>
          <span className="text-[12.5px] font-semibold tabular-nums" style={{ ...monoStyle, color: 'var(--ink-2)' }}>
            {formatCurrency(bonusSalary)}
          </span>
        </div>

        <div className="flex flex-col items-start col-span-2 pt-1">
          <span className="text-[10.5px] uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>Phụ cấp</span>
          {editing ? (
            <div className="flex items-center gap-1.5 w-full">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save()
                  if (e.key === 'Escape') cancel()
                }}
                className="nepo-input text-[12px] tabular-nums flex-1"
                style={{ ...monoStyle, textAlign: 'right' }}
              />
              <button
                onClick={save}
                disabled={saving}
                className="w-7 h-7 flex items-center justify-center rounded touch-target"
                style={{ background: 'var(--accent)', color: 'var(--theme-text-on-brand)' }}
                title="Lưu"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={cancel}
                className="w-7 h-7 flex items-center justify-center rounded touch-target border"
                style={{ borderColor: 'var(--theme-border-default)', color: 'var(--ink-3)' }}
                title="Huỷ"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 group"
              title="Sửa phụ cấp"
            >
              <span className="text-[12.5px] font-semibold tabular-nums" style={{ ...monoStyle, color: 'var(--ink-2)' }}>
                {formatCurrency(allowance)}
              </span>
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--ink-3)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Total — highlighted */}
      <div
        className="flex items-center justify-between pt-2 mt-1"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Thực lĩnh</span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ ...monoStyle, color: 'var(--accent-2)' }}
        >
          {formatCurrency(totalEarnings)}
        </span>
      </div>
    </div>
  )
}
