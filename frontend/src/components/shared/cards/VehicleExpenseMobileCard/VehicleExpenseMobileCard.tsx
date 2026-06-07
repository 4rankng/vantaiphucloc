import { Plate } from '@/components/shared/data-display/Plate'
import { Pill } from '@/components/shared/data-display/Pill'
import { formatCurrency } from '@/data/domain'
import { formatDate } from '@/lib/format'
import type { VehicleExpense, VehicleExpenseCategory } from '@/services/api/vehicleExpenses.api'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'

const CATEGORY_VARIANT: Record<VehicleExpenseCategory, 'accent' | 'warn' | 'info' | 'neutral'> = {
  XANG_DAU: 'accent',
  SUA_CHUA: 'warn',
  TIEN_LUAT: 'info',
  KHAC: 'neutral',
}

const CATEGORY_ORDER: VehicleExpenseCategory[] = ['XANG_DAU', 'SUA_CHUA', 'TIEN_LUAT', 'KHAC']

const monoStyle: React.CSSProperties = { fontFamily: 'var(--theme-font-mono)' }

const cardStyle: React.CSSProperties = {
  background: 'var(--theme-bg-secondary, #ffffff)',
  borderColor: 'var(--theme-border-default, #e4e4e7)',
}

export type VehicleSummary = {
  vehicleId: number
  vehiclePlate: string
  count: number
  total: number
  byCategory: Record<VehicleExpenseCategory, number>
}

// ─── By-vehicle summary card ─────────────────────────────────────────────────

export interface ExpenseByVehicleCardProps {
  summary: VehicleSummary
}

export function ExpenseByVehicleCard({ summary }: ExpenseByVehicleCardProps) {
  return (
    <div
      className="p-4 rounded-xl border active:scale-[0.99] touch-manipulation space-y-2.5"
      style={cardStyle}
    >
      {/* Header: plate + count */}
      <div className="flex items-center justify-between gap-2">
        <Plate>{summary.vehiclePlate}</Plate>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
        >
          {summary.count} lần
        </span>
      </div>

      {/* Category breakdown */}
      <div className="space-y-1.5 pt-1.5" style={{ borderTop: '1px solid var(--line)' }}>
        {CATEGORY_ORDER.map((cat) => {
          const amt = summary.byCategory[cat]
          return (
            <div key={cat} className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--ink-3)' }}>{EXPENSE_CATEGORY_LABELS[cat]}</span>
              <span
                className="tabular-nums"
                style={{ ...monoStyle, color: amt > 0 ? 'var(--ink)' : 'var(--ink-4)' }}
              >
                {amt > 0 ? formatCurrency(amt) : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Total — highlighted */}
      <div
        className="flex items-center justify-between pt-2 mt-1"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>Tổng</span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ ...monoStyle, color: 'var(--theme-brand-primary-dark, var(--accent))' }}
        >
          {formatCurrency(summary.total)}
        </span>
      </div>
    </div>
  )
}

// ─── Audit log card ─────────────────────────────────────────────────────────

export interface ExpenseAuditCardProps {
  expense: VehicleExpense
  edited: boolean
}

function toLocalISODate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso.slice(0, 10)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function ExpenseAuditCard({ expense: e, edited }: ExpenseAuditCardProps) {
  return (
    <div
      className="p-4 rounded-xl border active:scale-[0.99] touch-manipulation space-y-2"
      style={cardStyle}
    >
      {/* Category pill */}
      <div className="flex items-center justify-between gap-2">
        <Pill variant={CATEGORY_VARIANT[e.category]} dot={false}>
          {EXPENSE_CATEGORY_LABELS[e.category]}
        </Pill>
        {edited && (
          <span
            className="type-overline tracking-wide"
            style={{ color: 'var(--theme-status-warning, #f59e0b)' }}
          >
            Đã sửa
          </span>
        )}
      </div>

      {/* Plate + expense date */}
      <div className="flex items-center gap-2 flex-wrap text-[12px]" style={{ color: 'var(--ink-3)' }}>
        {e.vehiclePlate && <Plate>{e.vehiclePlate}</Plate>}
        <span style={{ color: 'var(--ink-4)' }}>·</span>
        <span className="tabular-nums">{formatDate(e.expenseDate, 'full')}</span>
      </div>

      {/* Amount — prominent */}
      <div
        className="flex items-center justify-between pt-1.5"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span className="text-xs" style={{ color: 'var(--ink-3)' }}>Số tiền</span>
        <span
          className="text-base font-bold tabular-nums"
          style={{ ...monoStyle, color: 'var(--ink)' }}
        >
          {formatCurrency(e.amount)}
        </span>
      </div>

      {/* Description (if present) */}
      {e.description && (
        <p className="text-[11.5px] truncate" style={{ color: 'var(--ink-2)' }} title={e.description}>
          {e.description}
        </p>
      )}

      {/* Created/edited timestamp */}
      <div
        className="text-[10.5px] tabular-nums pt-1.5"
        style={{ ...monoStyle, color: 'var(--ink-4)', borderTop: '1px solid var(--line)' }}
      >
        {edited ? 'Sửa' : 'Tạo'}: {formatDate(toLocalISODate(edited ? e.updatedAt : e.createdAt), 'full')}
      </div>
    </div>
  )
}
