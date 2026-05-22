import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Fuel, Plus, Trash2, Coins, Wrench } from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { Pill } from '@/components/shared/Pill'
import { Plate } from '@/components/shared/Plate'
import { Toolbar, ToolbarSearch, FilterPill, ToolbarSpacer } from '@/components/shared/Toolbar'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'
import { DangerConfirmDialog } from '@/components/shared/DangerConfirmDialog/DangerConfirmDialog'
import { Button } from '@/components/ui'
import { FieldActions } from '@/components/shared/ListUtils'
import { useInlineEditForm } from '@/components/shared/useInlineEditForm'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
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

// ─── Inline edit types ──────────────────────────────────────────────────────

type FocusableField = 'vehicleId' | 'category' | 'amount' | 'expenseDate' | 'description'

type FormData = {
  vehicleId: number
  category: VehicleExpenseCategory
  amount: number
  expenseDate: string
  description: string
}

const EMPTY_FORM: FormData = {
  vehicleId: 0,
  category: 'XANG_DAU',
  amount: 0,
  expenseDate: new Date().toISOString().slice(0, 10),
  description: '',
}

// ─── Inline edit row ────────────────────────────────────────────────────────

function ExpenseEditRow({ initial, onSave, onCancel, saving, vehicles, initialFocus = 'amount' }: {
  initial: FormData
  onSave: (data: FormData) => void
  onCancel: () => void
  saving?: boolean
  vehicles: { id: number; plate: string }[]
  initialFocus?: FocusableField
}) {
  const [activeField, setActiveField] = useState<FocusableField>(initialFocus)
  const amountRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)

  const { form, errors, set, anyDirty, handleSave } = useInlineEditForm<FormData>({
    initial,
    validate: (f) => {
      const errs: Record<string, string> = {}
      if (!f.vehicleId) errs.vehicleId = 'Chọn xe'
      if (!f.amount || f.amount <= 0) errs.amount = 'Nhập số tiền'
      if (!f.expenseDate) errs.expenseDate = 'Chọn ngày'
      return errs
    },
    onSave,
    onCancel,
  })

  // Auto-focus text inputs when the active field changes
  useEffect(() => {
    if (activeField === 'amount') amountRef.current?.focus()
    else if (activeField === 'expenseDate') dateRef.current?.focus()
    else if (activeField === 'description') descRef.current?.focus()
  }, [activeField])

  const plateLabel = vehicles.find(v => v.id === form.vehicleId)?.plate

  // Floating actions: right of the active cell normally, left when it's the last column.
  const isLastColumn = activeField === 'description'
  const floatingActions = (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 20,
      ...(isLastColumn
        ? { right: '100%', paddingRight: 6 }
        : { left: '100%', paddingLeft: 6 }),
    }}>
      <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} hintAlign={isLastColumn ? 'right' : 'left'} />
    </div>
  )

  const tdActive: React.CSSProperties = { padding: '5px 8px', position: 'relative' }
  const tdInactive = (field: FocusableField): React.CSSProperties => ({
    padding: '5px 8px', cursor: 'text', opacity: 0, transition: 'opacity 0.15s',
  })

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      {/* Ngày */}
      {activeField === 'expenseDate' ? (
        <td style={tdActive}>
          <input
            ref={dateRef}
            type="date"
            className="nepo-input text-[12px]"
            style={{ width: '100%' }}
            value={form.expenseDate}
            onChange={e => set('expenseDate', e.target.value)}
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdInactive('expenseDate')} onClick={() => setActiveField('expenseDate')}>
          <span className="tabular-nums" style={{ color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)', fontSize: 12.5 }}>
            {formatDate(form.expenseDate)}
          </span>
        </td>
      )}

      {/* Xe */}
      {activeField === 'vehicleId' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="— Chọn xe —"
            value={form.vehicleId ? String(form.vehicleId) : ''}
            options={[
              { value: '', label: '— Chọn xe —' },
              ...vehicles.map(v => ({ value: String(v.id), label: v.plate })),
            ]}
            onChange={v => set('vehicleId', Number(v) || 0)}
          />
          {errors.vehicleId && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.vehicleId}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdInactive('vehicleId')} onClick={() => setActiveField('vehicleId')}>
          {plateLabel
            ? <Plate>{plateLabel}</Plate>
            : <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>— Chọn xe —</span>}
        </td>
      )}

      {/* Loại */}
      {activeField === 'category' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="Loại chi phí"
            value={form.category}
            options={CATEGORIES.map(c => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }))}
            onChange={v => set('category', v as VehicleExpenseCategory)}
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdInactive('category')} onClick={() => setActiveField('category')}>
          <Pill variant={CATEGORY_VARIANT[form.category]} dot={false}>
            {EXPENSE_CATEGORY_LABELS[form.category]}
          </Pill>
        </td>
      )}

      {/* Số tiền */}
      {activeField === 'amount' ? (
        <td style={tdActive}>
          <input
            ref={amountRef}
            type="text"
            inputMode="numeric"
            className="nepo-input text-[12px] tabular-nums"
            style={{ width: '100%', textAlign: 'right', borderColor: errors.amount ? 'var(--status-error, #e53)' : undefined }}
            value={form.amount || ''}
            onChange={e => set('amount', Number(e.target.value.replace(/\D/g, '')) || 0)}
            placeholder="0"
          />
          {errors.amount && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.amount}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={{ ...tdInactive('amount'), textAlign: 'right' }} onClick={() => setActiveField('amount')}>
          <span className="tabular-nums font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--theme-font-mono)', fontSize: 12.5 }}>
            {form.amount ? formatCurrency(form.amount) : '—'}
          </span>
        </td>
      )}

      {/* Mô tả */}
      {activeField === 'description' ? (
        <td style={tdActive}>
          <input
            ref={descRef}
            className="nepo-input text-[12px]"
            style={{ width: '100%' }}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Mô tả..."
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdInactive('description')} onClick={() => setActiveField('description')}>
          <span className="truncate block" style={{ color: 'var(--ink-2)', maxWidth: 320, fontSize: 12.5 }}>
            {form.description || '—'}
          </span>
        </td>
      )}

      <td style={{ width: 32 }} />
    </tr>
  )
}

// ─── Expense row (read mode) ────────────────────────────────────────────────

function ExpenseRow({ expense, onEdit, onDelete }: {
  expense: VehicleExpense
  onEdit: (field: FocusableField) => void
  onDelete: () => void
}) {
  const cell = (field: FocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }

  return (
    <tr className="cursor-pointer group">
      <td onClick={cell('expenseDate')}>
        <span className="tabular-nums" style={{ color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)', fontSize: 12.5 }}>
          {formatDate(expense.expenseDate)}
        </span>
      </td>
      <td onClick={cell('vehicleId')}>
        <Plate>{expense.vehiclePlate ?? '—'}</Plate>
      </td>
      <td onClick={cell('category')}>
        <Pill variant={CATEGORY_VARIANT[expense.category]} dot={false}>
          {EXPENSE_CATEGORY_LABELS[expense.category]}
        </Pill>
      </td>
      <td onClick={cell('amount')} style={{ textAlign: 'right' }}>
        <span className="tabular-nums font-bold" style={{ color: 'var(--ink)' }}>
          {formatCurrency(expense.amount)}
        </span>
      </td>
      <td onClick={cell('description')}>
        <span className="truncate block" style={{ color: 'var(--ink-2)', maxWidth: 320 }}>
          {expense.description ?? '—'}
        </span>
      </td>
      <td style={{ width: 32 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
          style={{ width: 24, height: 24, color: 'var(--ink-3)' }}
          title="Xoá"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export function VehicleExpensesPage() {
  const toast = useToast()
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const [categoryFilter, setCategoryFilter] = useState<VehicleExpenseCategory | ''>('')
  const [vehicleFilter, setVehicleFilter] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [editingField, setEditingField] = useState<FocusableField>('amount')
  const [deleteTarget, setDeleteTarget] = useState<VehicleExpense | null>(null)

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

  const handleCreate = useCallback((data: FormData) => {
    const payload = { ...data, description: data.description || null }
    createMutation.mutate(payload, {
      onSuccess: () => { toast.success('Đã thêm chi phí'); setEditingId(null) },
      onError: () => toast.error('Không thể thêm chi phí'),
    })
  }, [createMutation, toast])

  const handleUpdate = useCallback((id: number, data: FormData) => {
    const payload = { ...data, description: data.description || null }
    updateMutation.mutate(
      { id, payload },
      {
        onSuccess: () => { toast.success('Đã cập nhật'); setEditingId(null) },
        onError: () => toast.error('Không thể cập nhật'),
      },
    )
  }, [updateMutation, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setEditingId(null) },
      onError: () => toast.error('Không thể xoá'),
    })
  }, [deleteTarget, deleteMutation, toast])

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
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />
          <Button variant="default" onClick={() => setEditingId('new')}>
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

      <Panel flush>
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
          <div style={{ width: 160 }}>
            <InlineSelect
              placeholder="Tất cả xe"
              value={vehicleFilter !== '' ? String(vehicleFilter) : ''}
              options={[
                { value: '', label: 'Tất cả xe' },
                ...(vehicles ?? []).map(v => ({ value: String(v.id), label: v.plate })),
              ]}
              onChange={v => setVehicleFilter(v ? Number(v) : '')}
            />
          </div>
          <ToolbarSpacer />
          <ToolbarSearch value={search} onChange={setSearch} placeholder="Tìm biển số, mô tả..." width={260} />
        </Toolbar>

        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : filteredExpenses.length === 0 && editingId !== 'new' ? (
          <div className="py-10">
            <EmptyState
              icon={<Fuel className="h-5 w-5" />}
              title={search.trim() || categoryFilter || vehicleFilter ? 'Không có chi phí phù hợp' : 'Chưa có chi phí nào trong tháng này'}
              compact
            />
          </div>
        ) : (
          <div className="nepo-table-scroll overflow-x-auto">
            <table className="nepo-table w-full" style={{ minWidth: 900, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="text-left" style={{ width: 80 }}>Ngày</th>
                  <th className="text-left" style={{ width: 120 }}>Biển số</th>
                  <th className="text-left" style={{ width: 1, whiteSpace: 'nowrap' }}>Loại</th>
                  <th className="text-right" style={{ width: 130, whiteSpace: 'nowrap' }}>Số tiền</th>
                  <th className="text-left">Mô tả</th>
                  <th style={{ width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {editingId === 'new' && (
                  <ExpenseEditRow
                    initial={EMPTY_FORM}
                    onSave={handleCreate}
                    onCancel={() => setEditingId(null)}
                    saving={createMutation.isPending}
                    vehicles={vehicles ?? []}
                  />
                )}
                {filteredExpenses.map(e =>
                  editingId === e.id ? (
                    <ExpenseEditRow
                      key={e.id}
                      initial={{
                        vehicleId: e.vehicleId,
                        category: e.category,
                        amount: e.amount,
                        expenseDate: e.expenseDate,
                        description: e.description ?? '',
                      }}
                      onSave={(data) => handleUpdate(e.id, data)}
                      onCancel={() => setEditingId(null)}
                      saving={updateMutation.isPending}
                      vehicles={vehicles ?? []}
                      initialFocus={editingField}
                    />
                  ) : (
                    <ExpenseRow
                      key={e.id}
                      expense={e}
                      onEdit={(field) => { setEditingId(e.id); setEditingField(field) }}
                      onDelete={() => setDeleteTarget(e)}
                    />
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <DangerConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá chi phí?"
        entityName={`Chi phí ${deleteTarget ? formatCurrency(deleteTarget.amount) : ''}`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
