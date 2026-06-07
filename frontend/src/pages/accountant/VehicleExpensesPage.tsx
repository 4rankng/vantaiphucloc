import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Fuel, Plus, Coins, Wrench, History, Truck, Search, Loader2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { MonthNavigator } from '@/components/shared/navigation/MonthNavigator'
import { Panel } from '@/components/shared/overlays/Panel'
import { KpiHeroCard } from '@/components/shared/data-display/KpiHeroCard'
import { Pill } from '@/components/shared/data-display/Pill'
import { Plate } from '@/components/shared/data-display/Plate'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { CreateExpenseDialog, type CreateExpenseFormData } from '@/components/shared/overlays/CreateExpenseDialog/CreateExpenseDialog'
import {
  useVehicleExpenses,
  useVehicleExpensesInfinite,
  useCreateVehicleExpense,
  useVehicles,
} from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'
import { formatCurrency } from '@/data/domain'
import type { VehicleExpense, VehicleExpenseCategory } from '@/services/api/vehicleExpenses.api'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'
import { fuzzyMatch } from '@/lib/search-utils'
import { formatDate } from '@/lib/format'
import { AnimatedNumber, LinkButton } from '@/components/shared'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  ExpenseByVehicleCard,
  ExpenseAuditCard,
  type VehicleSummary,
} from '@/components/shared/cards/VehicleExpenseMobileCard'

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
  width?: number | string
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

function ExpensesByVehicleTable({ rows, totalAll, isMobile }: { rows: VehicleSummary[]; totalAll: number; isMobile: boolean }) {
  if (rows.length === 0) return null
  if (isMobile) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {rows.map(r => <ExpenseByVehicleCard key={r.vehicleId} summary={r} />)}
        <div
          className="p-4 rounded-xl border space-y-1.5"
          style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}
        >
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--ink-2)' }}>Tổng cộng</div>
          {CATEGORIES.map(c => {
            const sum = rows.reduce((s, r) => s + r.byCategory[c], 0)
            return (
              <div key={c} className="flex justify-between text-sm">
                <span style={{ color: 'var(--ink-3)' }}>{EXPENSE_CATEGORY_LABELS[c]}</span>
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: 'var(--theme-font-mono)',
                    color: sum > 0 ? 'var(--ink)' : 'var(--ink-4)',
                  }}
                >
                  {sum > 0 ? formatCurrency(sum) : '—'}
                </span>
              </div>
            )
          })}
          <div
            className="flex justify-between font-bold pt-2 mt-1"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <span>Tổng</span>
            <span
              className="tabular-nums"
              style={{
                fontFamily: 'var(--theme-font-mono)',
                color: 'var(--theme-brand-primary-dark, var(--accent))',
              }}
            >
              {formatCurrency(totalAll)}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="nepo-table-scroll overflow-x-auto">
      <table className="nepo-table w-full" style={{ minWidth: 480, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th className="text-left" style={{ width: 100 }}>Biển số</th>
            <th className="text-right" style={{ width: 36 }}>SL</th>
            {CATEGORIES.map(c => (
              <th key={c} className="text-right" style={{ whiteSpace: 'nowrap' }}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </th>
            ))}
            <th className="text-right" style={{ width: 110, whiteSpace: 'nowrap' }}>Tổng</th>
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
          <tr style={{ background: 'var(--surface-2, var(--surface))', borderTop: '2px solid var(--line-2)' }}>
            <td style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12.5 }}>Tổng cộng</td>
            <td style={{ textAlign: 'right' }}>
              <span className="tabular-nums" style={{ color: 'var(--ink-2)', fontSize: 12.5 }}>
                {rows.reduce((s, r) => s + r.count, 0)}
              </span>
            </td>
            {CATEGORIES.map(c => {
              const sum = rows.reduce((s, r) => s + r.byCategory[c], 0)
              return (
                <td key={c} style={{ textAlign: 'right' }}>
                  <span className="tabular-nums font-bold" style={{ color: sum > 0 ? 'var(--ink)' : 'var(--ink-4)', fontFamily: 'var(--theme-font-mono)', fontSize: 12.5 }}>
                    {sum > 0 ? formatCurrency(sum) : '—'}
                  </span>
                </td>
              )
            })}
            <td style={{ textAlign: 'right' }}>
              <span className="tabular-nums font-bold" style={{ color: 'var(--theme-brand-primary-dark)', fontSize: 13, fontFamily: 'var(--theme-font-mono)' }}>
                {formatCurrency(totalAll)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Audit log table ─────────────────────────────────────────────────────────

type AuditEntry = {
  expense: VehicleExpense
  addedDate: string
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

function AuditLogTable({
  entries,
  isFetchingNextPage,
  hasNextPage,
  sentinelRef,
  isMobile,
}: {
  entries: AuditEntry[]
  isFetchingNextPage: boolean
  hasNextPage: boolean
  sentinelRef: React.RefObject<HTMLDivElement>
  isMobile: boolean
}) {
  if (entries.length === 0) return null
  if (isMobile) {
    return (
      <>
        <div className="flex flex-col gap-3 p-4">
          {entries.map(({ expense: e, edited }) => (
            <ExpenseAuditCard key={e.id} expense={e} edited={edited} />
          ))}
        </div>
        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--ink-4)' }} />
          </div>
        )}
        {!hasNextPage && entries.length > 0 && (
          <div className="py-3 text-center" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
            Đã hiển thị tất cả {entries.length} mục
          </div>
        )}
      </>
    )
  }
  return (
    <>
      <div className="nepo-table-scroll overflow-x-auto">
        <table className="nepo-table w-full" style={{ minWidth: 520, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="text-left" style={{ width: 90, whiteSpace: 'nowrap' }}>Ngày CP</th>
              <th className="text-left" style={{ width: 90 }}>Biển số</th>
              <th className="text-left" style={{ width: 1, whiteSpace: 'nowrap' }}>Loại</th>
              <th className="text-right" style={{ width: 110, whiteSpace: 'nowrap' }}>Số tiền</th>
              <th className="text-left" style={{ width: 90, whiteSpace: 'nowrap' }}>Ngày tạo</th>
              <th className="text-left" style={{ whiteSpace: 'nowrap' }}>Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(({ expense: e, edited }) => (
              <tr key={e.id}>
                <td>
                  <span className="tabular-nums" style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)' }}>
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
                  <span className="tabular-nums font-bold" style={{ fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--theme-font-mono)' }}>
                    {formatCurrency(e.amount)}
                  </span>
                </td>
                <td>
                  <span className="tabular-nums" style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--theme-font-mono)' }}>
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

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--ink-4)' }} />
        </div>
      )}
      {!hasNextPage && entries.length > 0 && (
        <div className="py-3 text-center" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
          Đã hiển thị tất cả {entries.length} mục
        </div>
      )}
    </>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export function VehicleExpensesPage() {
  const toast = useToast()
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const isMobile = useIsMobile(768)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data: vehicles } = useVehicles()

  // All expenses for the period — used for KPI cards + Chi phí theo xe tab
  const { data: expensePage, isLoading: isLoadingExpenses } = useVehicleExpenses({
    dateFrom,
    dateTo,
    pageSize: 100,
  })

  // Infinite query for Nhật ký tab
  const {
    data: auditData,
    isLoading: isLoadingAudit,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useVehicleExpensesInfinite({ dateFrom, dateTo, pageSize: 30 })

  const createMutation = useCreateVehicleExpense()

  // ── KPI data (from full-load query) ─────────────────────────────────────
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

  // ── Chi phí theo xe aggregation ──────────────────────────────────────────
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
    if (!search.trim()) return all
    return all.filter(r => fuzzyMatch(r.vehiclePlate, search))
  }, [expenses, search])

  // ── Nhật ký entries (from infinite query) ────────────────────────────────
  const auditEntries = useMemo<AuditEntry[]>(() => {
    const raw = (auditData?.pages ?? []).flatMap(p => p.items)
    const all = raw
      .map(e => {
        const created = new Date(e.createdAt).getTime()
        const updated = new Date(e.updatedAt).getTime()
        const edited = !isNaN(created) && !isNaN(updated) && updated - created > 5000
        return { expense: e, addedDate: toLocalISODate(edited ? e.updatedAt : e.createdAt), edited }
      })
      .sort((a, b) => {
        const ax = a.edited ? a.expense.updatedAt : a.expense.createdAt
        const bx = b.edited ? b.expense.updatedAt : b.expense.createdAt
        return ax < bx ? 1 : -1
      })
    if (!search.trim()) return all
    return all.filter(({ expense: e }) =>
      fuzzyMatch(e.vehiclePlate ?? '', search) ||
      fuzzyMatch(e.description ?? '', search) ||
      fuzzyMatch(EXPENSE_CATEGORY_LABELS[e.category], search),
    )
  }, [auditData, search])

  // ── Infinite scroll via IntersectionObserver ──────────────────────────────
  // fetchNextPage is a fresh ref each render (React Query), so we use a ref
  // to avoid tearing down the observer on every render.
  const fetchNextPageRef = useRef(fetchNextPage)
  fetchNextPageRef.current = fetchNextPage

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) fetchNextPageRef.current() },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage])

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
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* ── Controls row + Panel grouped tightly ── */}
      <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
        <div className="w-full sm:w-[200px]">
          <InlineSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm biển số, mô tả..."
            width="100%"
          />
        </div>
        <LinkButton
          onClick={() => setCreateDialogOpen(true)}
          icon={Plus}
          variant="brand"
          className="w-full sm:w-auto justify-center"
        >
          Thêm chi phí
        </LinkButton>
      </div>

      <Panel flush>
        <Tabs defaultValue="by-vehicle">
          {/* ── Tab bar ── */}
          <div className="px-5 pt-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <TabsList className="border-b-0" style={{ marginBottom: -1 }}>
              <TabsTrigger value="by-vehicle" className="inline-flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Chi phí theo xe
              </TabsTrigger>
              <TabsTrigger value="audit" className="inline-flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Nhật ký chi phí
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Chi phí theo xe ── */}
          <TabsContent value="by-vehicle" className="mt-0">
            {isLoadingExpenses ? (
              <div className="px-0 py-0"><TableSkeleton rows={4} /></div>
            ) : vehicleSummary.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<Truck className="h-5 w-5" />}
                  title={search.trim() ? 'Không có xe phù hợp' : 'Chưa có chi phí xe nào trong tháng này'}
                  compact
                />
              </div>
            ) : (
              <ExpensesByVehicleTable rows={vehicleSummary} totalAll={totalAmount} isMobile={isMobile} />
            )}
          </TabsContent>

          {/* ── Nhật ký chi phí ── */}
          <TabsContent value="audit" className="mt-0">
            {isLoadingAudit ? (
              <div className="px-0 py-0"><TableSkeleton rows={6} /></div>
            ) : auditEntries.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  icon={<History className="h-5 w-5" />}
                  title={search.trim() ? 'Không có hoạt động phù hợp' : 'Chưa có hoạt động nào trong tháng này'}
                  compact
                />
              </div>
            ) : (
              <AuditLogTable
                entries={auditEntries}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={!!hasNextPage}
                sentinelRef={sentinelRef}
                isMobile={isMobile}
              />
            )}
          </TabsContent>
        </Tabs>
      </Panel>
      </div>{/* end controls+panel group */}

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
