import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Fuel, Plus, Coins, Wrench, History, Truck } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { MonthNavigator } from '@/components/shared/navigation/MonthNavigator'
import { Panel } from '@/components/shared/overlays/Panel'
import { KpiHeroCard } from '@/components/shared/data-display/KpiHeroCard'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { CreateExpenseDialog, type CreateExpenseFormData } from '@/components/shared/overlays/CreateExpenseDialog/CreateExpenseDialog'
import { InlineSearchInput } from '@/components/shared/forms/InlineSearchInput'
import { ExpensesByVehicleTable, AuditLogTable } from '@/components/shared/data-display/ExpenseTables'
import { EXPENSE_CATEGORIES, toLocalISODate } from '@/components/shared/data-display/ExpenseTables'
import type { AuditEntry } from '@/components/shared/data-display/ExpenseTables'
import {
  useVehicleExpenses,
  useVehicleExpensesInfinite,
  useCreateVehicleExpense,
  useVehicles,
} from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'
import { formatCurrency } from '@/data/domain'
import type { VehicleExpenseCategory } from '@/services/api/vehicleExpenses.api'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'
import { fuzzyMatch } from '@/lib/search-utils'
import { AnimatedNumber } from '@/components/shared'
import { Button } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import type { VehicleSummary } from '@/components/shared/cards/VehicleExpenseMobileCard'

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
        EXPENSE_CATEGORIES.map(c => [c, expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0)]),
      ) as Record<VehicleExpenseCategory, number>,
    [expenses],
  )
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)
  const topCategory = EXPENSE_CATEGORIES.reduce(
    (top, c) => (totalByCategory[c] > totalByCategory[top] ? c : top),
    EXPENSE_CATEGORIES[0],
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
  const fetchNextPageRef = useRef(fetchNextPage)
  useEffect(() => { fetchNextPageRef.current = fetchNextPage })

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
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          className="w-full sm:w-auto shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm chi phí
        </Button>
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
