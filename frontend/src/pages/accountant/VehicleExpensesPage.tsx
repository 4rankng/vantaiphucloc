import { useState, useMemo, useCallback } from 'react'
import { Fuel, Plus, Coins, Wrench, History, Truck, Search } from 'lucide-react'
import { LinkButton } from '@/components/shared/LinkButton'
import { PageHeader } from '@/components/shared/PageHeader'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { Pill } from '@/components/shared/Pill'
import { Plate } from '@/components/shared/Plate'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'
import { CreateExpenseDialog, type CreateExpenseFormData } from '@/components/shared/CreateExpenseDialog/CreateExpenseDialog'
import { Button } from '@/components/ui'
import {
  useVehicleExpenses,
  useCreateVehicleExpense,
  useVehicles,
} from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'
import { formatCurrency } from '@/data/domain'
import type { VehicleExpense, VehicleExpenseCategory } from '@/services/api/vehicleExpenses.api'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'
import { fuzzyMatch } from '@/lib/search-utils'
import { formatDate } from '@/lib/format'
import { AnimatedNumber } from '@/components/shared'
import { useToast } from '@/components/atoms/Toast'

const CATEGORIES: VehicleExpenseCategory[] = ['XANG_DAU', 'SUA_CHUA', 'TIEN_LUAT', 'KHAC']

const CATEGORY_VARIANT: Record<VehicleExpenseCategory, 'accent' | 'warn' | 'info' | 'neutral'> = {
  XANG_DAU: 'accent',
  SUA_CHUA: 'warn',
  TIEN_LUAT: 'info',
  KHAC: 'neutral',
}

// ─── Small inline search input ──────────────────────────────────────────────

function InlineSearchInput({ value, onChange, placeholder, width = 220 }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  width?: number
}) {
  return (
    <div className="relative" style={{ width }}>
      <Search
        className="absolute h-3.5 w-3.5"
        style={{ left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="nepo-input text-[12px]"
        style={{ width: '100%', paddingLeft: 28, height: 30 }}
      />
    </div>
  )
}

// ─── "Chi phí theo xe" summary table ───────────────────────────────────────

type VehicleSummary = {
  vehicleId: number
  vehiclePlate: string
  count: number
  total: number
  byCategory: Record<VehicleExpenseCategory, number>
}

function ExpensesByVehicleTable({ rows, totalAll }: { rows: VehicleSummary[]; totalAll: number }) {
  if (rows.length === 0) return null
  return (
    <div className="nepo-table-scroll overflow-x-auto">
      <table className="nepo-table w-full" style={{ minWidth: 720, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th className="text-left" style={{ width: 140 }}>Biển số</th>
            <th className="text-right" style={{ width: 70 }}>SL</th>
            {CATEGORIES.map(c => (
              <th key={c} className="text-right" style={{ whiteSpace: 'nowrap' }}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </th>
            ))}
            <th className="text-right" style={{ width: 140, whiteSpace: 'nowrap' }}>Tổng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.vehicleId}>
              <td><Plate>{r.vehiclePlate}</Plate></td>
              <td style={{ textAlign: 'right' }}>
                <span className="tabular-nums" style={{ color: 'var(--ink-2)', fontSize: 12.5 }}>{r.count}</span>
              </td>
              {CATEGORIES.map(c => (
                <td key={c} style={{ textAlign: 'right' }}>
                  <span
                    className="tabular-nums"
                    style={{
                      color: r.byCategory[c] > 0 ? 'var(--ink)' : 'var(--ink-4)',
                      fontFamily: 'var(--theme-font-mono)',
                      fontSize: 12.5,
                    }}
                  >
                    {r.byCategory[c] > 0 ? formatCurrency(r.byCategory[c]) : '—'}
                  </span>
                </td>
              ))}
              <td style={{ textAlign: 'right' }}>
                <span className="tabular-nums font-bold" style={{ color: 'var(--ink)', fontSize: 12.5 }}>
                  {formatCurrency(r.total)}
                </span>
              </td>
            </tr>
          ))}
          <tr style={{ background: 'var(--surface-2, var(--surface))', borderTop: '1px solid var(--line)' }}>
            <td style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 12.5 }}>Tổng cộng</td>
            <td style={{ textAlign: 'right' }}>
              <span className="tabular-nums" style={{ color: 'var(--ink-2)', fontSize: 12.5 }}>
                {rows.reduce((s, r) => s + r.count, 0)}
              </span>
            </td>
            {CATEGORIES.map(c => {
              const sum = rows.reduce((s, r) => s + r.byCategory[c], 0)
              return (
                <td key={c} style={{ textAlign: 'right' }}>
                  <span className="tabular-nums font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--theme-font-mono)', fontSize: 12.5 }}>
                    {sum > 0 ? formatCurrency(sum) : '—'}
                  </span>
                </td>
              )
            })}
            <td style={{ textAlign: 'right' }}>
              <span className="tabular-nums font-bold" style={{ color: 'var(--ink)', fontSize: 12.5 }}>
                {formatCurrency(totalAll)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Audit log: grouped by day-added ────────────────────────────────────────

type AuditEntry = {
  expense: VehicleExpense
  /** ISO date (YYYY-MM-DD) of createdAt, in local time */
  addedDate: string
  /** Whether updatedAt differs meaningfully from createdAt → "edited" */
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


function AuditLogList({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return null

  return (
    <div className="nepo-table-scroll overflow-x-auto" style={{ maxHeight: 480, overflowY: 'auto' }}>
      <table className="nepo-table w-full" style={{ minWidth: 920, borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface)' }}>
          <tr>
            <th className="text-left" style={{ width: 110, whiteSpace: 'nowrap' }}>Ngày phát sinh</th>
            <th className="text-left" style={{ width: 110 }}>Biển số</th>
            <th className="text-left" style={{ width: 1, whiteSpace: 'nowrap' }}>Loại</th>
            <th className="text-right" style={{ width: 130, whiteSpace: 'nowrap' }}>Số tiền</th>
            <th className="text-left" style={{ width: 110, whiteSpace: 'nowrap' }}>Ngày tạo</th>
            <th className="text-left" style={{ width: 200, whiteSpace: 'nowrap' }}>Mô tả</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ expense: e, edited }) => (
            <tr key={e.id}>
              <td>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-2)',
                    fontFamily: 'var(--theme-font-mono)',
                  }}
                >
                  {formatDate(e.expenseDate, 'full')}
                </span>
              </td>
              <td><Plate>{e.vehiclePlate ?? '—'}</Plate></td>
              <td>
                <Pill variant={CATEGORY_VARIANT[e.category]} dot={false}>
                  {EXPENSE_CATEGORY_LABELS[e.category]}
                </Pill>
              </td>
              <td style={{ textAlign: 'right' }}>
                <span
                  className="tabular-nums font-bold"
                  style={{ fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--theme-font-mono)' }}
                >
                  {formatCurrency(e.amount)}
                </span>
              </td>
              <td>
                <span
                  className="tabular-nums"
                  style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--theme-font-mono)' }}
                >
                  {formatDate(toLocalISODate(edited ? e.updatedAt : e.createdAt), 'full')}
                </span>
              </td>
              <td>
                <span
                  className="truncate block"
                  style={{ fontSize: 12, color: 'var(--ink-2)', maxWidth: 200 }}
                  title={e.description ?? ''}
                >
                  {e.description || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export function VehicleExpensesPage() {
  const toast = useToast()
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [auditSearch, setAuditSearch] = useState('')

  const { data: vehicles } = useVehicles()
  const { data: expensePage, isLoading } = useVehicleExpenses({
    dateFrom,
    dateTo,
    pageSize: 100,
  })

  const createMutation = useCreateVehicleExpense()

  const expenses = useMemo(() => expensePage?.items ?? [], [expensePage])

  const totalByCategory = useMemo(
    () =>
      Object.fromEntries(
        CATEGORIES.map(c => [c, expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0)]),
      ) as Record<VehicleExpenseCategory, number>,
    [expenses],
  )
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)
  const topCategory = CATEGORIES.reduce(
    (top, c) => (totalByCategory[c] > totalByCategory[top] ? c : top),
    CATEGORIES[0],
  )

  // Per-vehicle aggregation for the "Chi phí theo xe" summary table.
  // Filtered by the panel's own search input (matches plate).
  const vehicleSummary = useMemo<VehicleSummary[]>(() => {
    const map = new Map<number, VehicleSummary>()
    for (const e of expenses) {
      const row = map.get(e.vehicleId) ?? {
        vehicleId: e.vehicleId,
        vehiclePlate: e.vehiclePlate ?? `#${e.vehicleId}`,
        count: 0,
        total: 0,
        byCategory: { XANG_DAU: 0, SUA_CHUA: 0, TIEN_LUAT: 0, KHAC: 0 } as Record<VehicleExpenseCategory, number>,
      }
      row.count += 1
      row.total += e.amount
      row.byCategory[e.category] += e.amount
      map.set(e.vehicleId, row)
    }
    const all = Array.from(map.values()).sort((a, b) => b.total - a.total)
    if (!vehicleSearch.trim()) return all
    return all.filter(r => fuzzyMatch(r.vehiclePlate, vehicleSearch))
  }, [expenses, vehicleSearch])

  // Audit log entries: derived from createdAt / updatedAt and filtered by the
  // panel's own search (plate / description / category label).
  const auditEntries = useMemo<AuditEntry[]>(() => {
    const all = expenses
      .map(e => {
        const created = new Date(e.createdAt).getTime()
        const updated = new Date(e.updatedAt).getTime()
        const edited = !isNaN(created) && !isNaN(updated) && updated - created > 5000
        return {
          expense: e,
          addedDate: toLocalISODate(edited ? e.updatedAt : e.createdAt),
          edited,
        }
      })
      .sort((a, b) => {
        const ax = a.edited ? a.expense.updatedAt : a.expense.createdAt
        const bx = b.edited ? b.expense.updatedAt : b.expense.createdAt
        return ax < bx ? 1 : -1
      })
    if (!auditSearch.trim()) return all
    return all.filter(({ expense: e }) =>
      fuzzyMatch(e.vehiclePlate ?? '', auditSearch) ||
      fuzzyMatch(e.description ?? '', auditSearch) ||
      fuzzyMatch(EXPENSE_CATEGORY_LABELS[e.category], auditSearch),
    )
  }, [expenses, auditSearch])

  const handleCreate = useCallback((data: CreateExpenseFormData) => {
    const payload = { ...data, description: data.description || null }
    return new Promise<void>((resolve) => {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Đã thêm chi phí'); setCreateDialogOpen(false); resolve() },
        onError: () => { toast.error('Không thể thêm chi phí'); resolve() },
      })
    })
  }, [createMutation, toast])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Chi phí xe"
        subtitle="Quản lý chi phí vận hành theo từng xe: xăng dầu, sửa chữa, tiền luật và khác"
        lucideIcon={Fuel}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Thêm chi phí
            </Button>
            <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <KpiHeroCard
          label="Tổng chi phí"
          formattedValue={<AnimatedNumber value={totalAmount} format="currency" />}
          value={totalAmount}
          icon={Fuel}
          color="amber"
          sublabel="Kỳ hiện tại"
          className="card-hover-lift"
        />
        <KpiHeroCard
          label="Xăng dầu"
          formattedValue={<AnimatedNumber value={totalByCategory.XANG_DAU} format="currency" />}
          value={totalByCategory.XANG_DAU}
          icon={Coins}
          color="rose"
          sublabel={`${totalAmount > 0 ? Math.round((totalByCategory.XANG_DAU / totalAmount) * 100) : 0}% tổng chi`}
          className="card-hover-lift"
        />
        <KpiHeroCard
          label="Sửa chữa + khác"
          formattedValue={<AnimatedNumber value={totalByCategory.SUA_CHUA + totalByCategory.TIEN_LUAT + totalByCategory.KHAC} format="currency" />}
          value={totalByCategory.SUA_CHUA + totalByCategory.TIEN_LUAT + totalByCategory.KHAC}
          icon={Wrench}
          color="blue"
          sublabel={`Cao nhất: ${EXPENSE_CATEGORY_LABELS[topCategory]}`}
          className="card-hover-lift"
        />
      </div>

      <Panel
        flush
        title={<span className="inline-flex items-center gap-2"><Truck className="h-4 w-4" /> Chi phí theo xe</span>}
        subtitle={`Tổng hợp chi phí ${vehicleSummary.length} xe trong kỳ`}
        actions={
          <div className="flex items-center gap-2">
            <LinkButton onClick={() => setCreateDialogOpen(true)} icon={Plus}>
              Thêm chi phí
            </LinkButton>
            <InlineSearchInput
              value={vehicleSearch}
              onChange={setVehicleSearch}
              placeholder="Tìm biển số..."
              width={220}
            />
          </div>
        }
      >
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : vehicleSummary.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={<Truck className="h-5 w-5" />}
              title={vehicleSearch.trim() ? 'Không có xe phù hợp' : 'Chưa có chi phí xe nào trong tháng này'}
              compact
            />
          </div>
        ) : (
          <ExpensesByVehicleTable rows={vehicleSummary} totalAll={totalAmount} />
        )}
      </Panel>

      <Panel
        flush
        title={<span className="inline-flex items-center gap-2"><History className="h-4 w-4" /> Nhật ký thêm chi phí</span>}
        subtitle={`${auditEntries.length} mục`}
        actions={
          <div className="flex items-center gap-2">
            <InlineSearchInput
              value={auditSearch}
              onChange={setAuditSearch}
              placeholder="Tìm biển số, mô tả..."
              width={240}
            />
            <LinkButton onClick={() => setCreateDialogOpen(true)} icon={Plus}>
              Thêm chi phí
            </LinkButton>
          </div>
        }
      >
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : auditEntries.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={<History className="h-5 w-5" />}
              title={auditSearch.trim() ? 'Không có hoạt động phù hợp' : 'Chưa có hoạt động nào trong tháng này'}
              compact
            />
          </div>
        ) : (
          <AuditLogList entries={auditEntries} />
        )}
      </Panel>

      <CreateExpenseDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onConfirm={handleCreate}
        vehicles={vehicles ?? []}
        saving={createMutation.isPending}
      />
    </div>
  )
}
