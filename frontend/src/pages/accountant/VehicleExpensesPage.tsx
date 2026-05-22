import { useState, useMemo } from 'react'
import { Fuel, Plus, Pencil, Trash2, Coins, Wrench, Scale, MoreHorizontal } from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Drawer } from '@/components/shared/Drawer'
import { Pill } from '@/components/shared/Pill'
import { Plate } from '@/components/shared/Plate'
import { Toolbar, ToolbarSearch, FilterPill, ToolbarSpacer } from '@/components/shared/Toolbar'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui'
import {
  useVehicleExpenses,
  useCreateVehicleExpense,
  useUpdateVehicleExpense,
  useDeleteVehicleExpense,
  useVehicles,
} from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'
import { formatCurrency } from '@/data/domain'
import type { VehicleExpense, VehicleExpenseCategory } from '@/services/api/vehicleExpenses.api'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'
import { fuzzyMatch } from '@/lib/search-utils'
import { AnimatedNumber } from '@/components/shared'

const CATEGORIES: VehicleExpenseCategory[] = ['XANG_DAU', 'SUA_CHUA', 'TIEN_LUAT', 'KHAC']

const CATEGORY_PILL: Record<VehicleExpenseCategory, { variant: 'accent' | 'warn' | 'info' | 'neutral'; icon: typeof Coins }> = {
  XANG_DAU: { variant: 'accent', icon: Coins },
  SUA_CHUA: { variant: 'warn', icon: Wrench },
  TIEN_LUAT: { variant: 'info', icon: Scale },
  KHAC: { variant: 'neutral', icon: MoreHorizontal },
}

function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return day && m ? `${day}/${m}` : d
}

export function VehicleExpensesPage() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const [categoryFilter, setCategoryFilter] = useState<VehicleExpenseCategory | ''>('')
  const [vehicleFilter, setVehicleFilter] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<VehicleExpense | null>(null)

  const { data: vehicles } = useVehicles()
  const { data: expensePage, isLoading } = useVehicleExpenses({
    vehicleId: vehicleFilter || undefined,
    category: categoryFilter || undefined,
    dateFrom,
    dateTo,
    pageSize: 100,
  })

  const createMutation = useCreateVehicleExpense()
  const updateMutation = useUpdateVehicleExpense()
  const deleteMutation = useDeleteVehicleExpense()

  const expenses = expensePage?.items ?? []

  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return expenses
    return expenses.filter(e =>
      fuzzyMatch(e.vehiclePlate ?? '', search) ||
      fuzzyMatch(e.description ?? '', search) ||
      fuzzyMatch(EXPENSE_CATEGORY_LABELS[e.category], search),
    )
  }, [expenses, search])

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

  function handleSave(form: {
    vehicleId: number
    category: VehicleExpenseCategory
    amount: number
    expenseDate: string
    description: string
  }) {
    const payload = { ...form, description: form.description || null }
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, payload },
        { onSuccess: () => { setShowForm(false); setEditing(null) } },
      )
    } else {
      createMutation.mutate(payload, { onSuccess: () => { setShowForm(false) } })
    }
  }

  function handleDelete(id: number) {
    if (window.confirm('Xoá chi phí này?')) {
      deleteMutation.mutate(id)
    }
  }

  const columns: Column<VehicleExpense>[] = [
    {
      key: 'date',
      header: 'Ngày',
      width: 80,
      render: (e) => (
        <span className="tabular-nums" style={{ color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)', fontSize: 12.5 }}>
          {formatDate(e.expenseDate)}
        </span>
      ),
    },
    {
      key: 'plate',
      header: 'Biển số',
      width: 120,
      render: (e) => <Plate>{e.vehiclePlate ?? '—'}</Plate>,
    },
    {
      key: 'category',
      header: 'Loại',
      width: 140,
      render: (e) => (
        <Pill variant={CATEGORY_PILL[e.category].variant} dot={false}>
          {EXPENSE_CATEGORY_LABELS[e.category]}
        </Pill>
      ),
    },
    {
      key: 'amount',
      header: 'Số tiền',
      align: 'right',
      width: 140,
      render: (e) => (
        <span className="tabular-nums font-bold" style={{ color: 'var(--ink)' }}>
          {formatCurrency(e.amount)}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (e) => (
        <span className="truncate block" style={{ color: 'var(--ink-2)', maxWidth: 320 }}>
          {e.description ?? '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 88,
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); setEditing(e); setShowForm(true) }}
            className="nepo-row-action"
            aria-label="Sửa"
            title="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id) }}
            className="nepo-row-action"
            aria-label="Xoá"
            title="Xoá"
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="typo-display">Chi phí xe</h1>
          <p className="typo-body-sm mt-1.5">
            Theo dõi chi phí xăng dầu, sửa chữa, tiền luật và các khoản khác theo từng xe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
          <Button variant="default" onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="h-4 w-4" />
            Thêm chi phí
          </Button>
        </div>
      </header>

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
        title="Danh sách chi phí"
        subtitle={`${filteredExpenses.length}/${expenses.length} mục · Kỳ ${dateFrom} → ${dateTo}`}
        flush
      >
        <Toolbar bordered>
          <FilterPill
            isActive={categoryFilter === ''}
            onClick={() => setCategoryFilter('')}
          >
            Tất cả loại
          </FilterPill>
          {CATEGORIES.map(c => (
            <FilterPill
              key={c}
              isActive={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
            >
              {EXPENSE_CATEGORY_LABELS[c]}
            </FilterPill>
          ))}
          <div className="w-px h-5 mx-1" style={{ background: 'var(--line)' }} />
          <select
            value={vehicleFilter}
            onChange={e => setVehicleFilter(e.target.value ? Number(e.target.value) : '')}
            className="nepo-select"
            style={{ minHeight: 32, padding: '6px 32px 6px 11px', fontSize: 12.5, width: 'auto' }}
          >
            <option value="">Tất cả xe</option>
            {vehicles?.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
          </select>
          <ToolbarSpacer />
          <ToolbarSearch value={search} onChange={setSearch} placeholder="Tìm biển số, mô tả..." width={260} />
        </Toolbar>

        <DataTable
          columns={columns}
          rows={filteredExpenses}
          rowKey={(e) => e.id}
          isLoading={isLoading}
          minWidth={900}
          empty={
            <div className="py-10">
              <EmptyState
                icon={<Fuel className="h-5 w-5" />}
                title={search.trim() || categoryFilter || vehicleFilter ? 'Không có chi phí phù hợp' : 'Chưa có chi phí nào trong tháng này'}
                compact
              />
            </div>
          }
        />
      </Panel>

      {showForm && (
        <ExpenseFormDrawer
          expense={editing}
          vehicles={vehicles ?? []}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}

function ExpenseFormDrawer({
  expense,
  vehicles,
  onSave,
  onClose,
  isPending,
}: {
  expense: VehicleExpense | null
  vehicles: { id: number; plate: string }[]
  onSave: (form: { vehicleId: number; category: VehicleExpenseCategory; amount: number; expenseDate: string; description: string }) => void
  onClose: () => void
  isPending: boolean
}) {
  const [vehicleId, setVehicleId] = useState(expense?.vehicleId?.toString() ?? '')
  const [category, setCategory] = useState<VehicleExpenseCategory>(expense?.category ?? 'XANG_DAU')
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '')
  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate ?? new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState(expense?.description ?? '')

  const canSave = !!vehicleId && !!amount && Number(amount) > 0 && !isPending

  return (
    <Drawer
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb={expense ? 'Chỉnh sửa' : 'Thêm mới'}
      title={expense ? 'Sửa chi phí' : 'Thêm chi phí xe'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button
            variant="default"
            onClick={() => onSave({ vehicleId: Number(vehicleId), category, amount: Number(amount), expenseDate, description })}
            disabled={!canSave}
          >
            {isPending ? 'Đang lưu...' : 'Lưu chi phí'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="nepo-field-label" htmlFor="expense-vehicle">Xe</label>
          <select id="expense-vehicle" value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="nepo-select">
            <option value="">— Chọn xe —</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate}</option>)}
          </select>
        </div>
        <div>
          <label className="nepo-field-label" htmlFor="expense-category">Loại chi phí</label>
          <select id="expense-category" value={category} onChange={e => setCategory(e.target.value as VehicleExpenseCategory)} className="nepo-select">
            {CATEGORIES.map(c => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="expense-amount">Số tiền (đ)</label>
            <input
              id="expense-amount"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="nepo-input tabular-nums"
              placeholder="0"
            />
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="expense-date">Ngày</label>
            <input
              id="expense-date"
              type="date"
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
              className="nepo-input"
            />
          </div>
        </div>
        <div>
          <label className="nepo-field-label" htmlFor="expense-description">Mô tả</label>
          <textarea
            id="expense-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="nepo-textarea"
            placeholder="Ghi chú thêm về chi phí này..."
          />
        </div>
      </div>
    </Drawer>
  )
}
