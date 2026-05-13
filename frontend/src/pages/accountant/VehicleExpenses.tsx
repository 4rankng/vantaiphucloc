/**
 * Chi phí xe — Vehicle Expense management page.
 *
 * Accountants record fuel, repair, and other vehicle costs here.
 * These feed directly into the per-vehicle P&L report.
 */

import { useState } from 'react'
import { Plus, Pencil, Trash2, Car } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { formatCurrencyFull } from '@/data/domain'
import {
  useVehicleExpenses,
  useCreateVehicleExpense,
  useUpdateVehicleExpense,
  useDeleteVehicleExpense,
  useDrivers,
} from '@/hooks/use-queries'
import type { VehicleExpense, VehicleExpenseCreate } from '@/services/api/vehicleExpenses.api'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'

// ── Form dialog ───────────────────────────────────────────────────────────────

interface ExpenseFormState {
  vehicleId: string
  category: string
  amount: string
  expenseDate: string
  description: string
}

const EMPTY_FORM: ExpenseFormState = {
  vehicleId: '',
  category: 'XANG_DAU',
  amount: '',
  expenseDate: new Date().toISOString().slice(0, 10),
  description: '',
}

function ExpenseFormDialog({
  initial,
  vehicles,
  onSubmit,
  onClose,
  loading,
}: {
  initial?: ExpenseFormState
  vehicles: { id: number; plate: string }[]
  onSubmit: (form: ExpenseFormState) => void
  onClose: () => void
  loading?: boolean
}) {
  const [form, setForm] = useState<ExpenseFormState>(initial ?? EMPTY_FORM)
  const isChung = form.category === 'CHUNG'

  const set = (key: keyof ExpenseFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 space-y-4"
        style={{ background: 'var(--theme-bg-primary)', border: '1px solid var(--theme-border-default)' }}
      >
        <h2 className="typo-h2">{initial ? 'Sửa chi phí' : 'Thêm chi phí xe'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Category */}
          <div>
            <label className="typo-caption mb-1 block">Loại chi phí *</label>
            <select
              value={form.category}
              onChange={set('category')}
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: 'var(--theme-bg-secondary)',
                borderColor: 'var(--theme-border-default)',
                color: 'var(--theme-text-primary)',
              }}
            >
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Vehicle — hidden for CHUNG */}
          {!isChung && (
            <div>
              <label className="typo-caption mb-1 block">Xe *</label>
              <select
                value={form.vehicleId}
                onChange={set('vehicleId')}
                required={!isChung}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  borderColor: 'var(--theme-border-default)',
                  color: 'var(--theme-text-primary)',
                }}
              >
                <option value="">Chọn xe…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={String(v.id)}>{v.plate}</option>
                ))}
              </select>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="typo-caption mb-1 block">Số tiền (VNĐ) *</label>
            <Input
              type="number"
              min={1}
              value={form.amount}
              onChange={set('amount')}
              placeholder="Nhập số tiền"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="typo-caption mb-1 block">Ngày *</label>
            <Input
              type="date"
              value={form.expenseDate}
              onChange={set('expenseDate')}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="typo-caption mb-1 block">Ghi chú</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={2}
              placeholder="Mô tả chi phí…"
              className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
              style={{
                background: 'var(--theme-bg-secondary)',
                borderColor: 'var(--theme-border-default)',
                color: 'var(--theme-text-primary)',
              }}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Hủy
            </Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
              {loading ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function VehicleExpenses() {
  const toast = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<VehicleExpense | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const { data: expensePage, isLoading } = useVehicleExpenses({
    category: (filterCat || undefined) as any,
    dateFrom: filterFrom || undefined,
    dateTo: filterTo || undefined,
  })
  const { data: driverPage } = useDrivers()

  // Build list of (vehicle_id, plate) from driver data
  const vehicles = (driverPage?.items ?? [])
    .filter((d) => d.vehiclePlate)
    .map((d) => ({ id: d.id, plate: d.vehiclePlate! }))

  const createExpense = useCreateVehicleExpense()
  const updateExpense = useUpdateVehicleExpense()
  const deleteExpense = useDeleteVehicleExpense()

  const handleSubmit = (form: ExpenseFormState) => {
    const payload: VehicleExpenseCreate = {
      vehicleId: form.category !== 'CHUNG' && form.vehicleId ? Number(form.vehicleId) : null,
      category: form.category as any,
      amount: Number(form.amount),
      expenseDate: form.expenseDate,
      description: form.description || null,
    }

    if (editing) {
      updateExpense.mutate(
        { id: editing.id, payload },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật chi phí')
            setEditing(null)
          },
          onError: () => toast.error('Lỗi', 'Không thể cập nhật chi phí'),
        },
      )
    } else {
      createExpense.mutate(payload, {
        onSuccess: () => {
          toast.success('Đã thêm chi phí')
          setDialogOpen(false)
        },
        onError: (err: any) => toast.error('Lỗi', err?.message ?? 'Không thể thêm chi phí'),
      })
    }
  }

  const handleDelete = (exp: VehicleExpense) => {
    if (!confirm(`Xóa chi phí ${EXPENSE_CATEGORY_LABELS[exp.category]} — ${formatCurrencyFull(exp.amount)}?`)) return
    deleteExpense.mutate(exp.id, {
      onSuccess: () => toast.success('Đã xóa chi phí'),
      onError: () => toast.error('Lỗi', 'Không thể xóa'),
    })
  }

  const editingForm: ExpenseFormState | undefined = editing
    ? {
        vehicleId: String(editing.vehicleId ?? ''),
        category: editing.category,
        amount: String(editing.amount),
        expenseDate: editing.expenseDate,
        description: editing.description ?? '',
      }
    : undefined

  const expenses = expensePage?.items ?? []
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="typo-display">Chi phí xe</h1>
          <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            Xăng dầu · Sửa chữa · Chi phí khác · Chi phí chung
          </p>
        </div>
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Thêm chi phí
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="typo-caption mb-1 block">Loại chi phí</label>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{
              background: 'var(--theme-bg-secondary)',
              borderColor: 'var(--theme-border-default)',
              color: 'var(--theme-text-primary)',
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="typo-caption mb-1 block">Từ ngày</label>
          <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </div>
        <div>
          <label className="typo-caption mb-1 block">Đến ngày</label>
          <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
        {(filterCat || filterFrom || filterTo) && (
          <Button variant="ghost" onClick={() => { setFilterCat(''); setFilterFrom(''); setFilterTo('') }}>
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Summary total */}
      {!isLoading && expenses.length > 0 && (
        <div
          className="rounded-lg px-4 py-2.5 flex items-center justify-between"
          style={{ background: 'var(--theme-bg-tertiary)' }}
        >
          <span className="typo-caption">Tổng chi phí ({expenses.length} khoản)</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-status-error)' }}>
            {formatCurrencyFull(total)}
          </span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="card p-12 text-center">
          <Car className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
          <p className="typo-h3 mb-1">Chưa có chi phí nào</p>
          <p className="typo-body-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Bấm "Thêm chi phí" để ghi nhận chi phí xe
          </p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--theme-border-default)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                {['Ngày', 'Loại', 'Xe', 'Số tiền', 'Ghi chú', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp, i) => (
                <tr
                  key={exp.id}
                  style={{
                    background: i % 2 === 0 ? 'var(--theme-bg-primary)' : 'var(--theme-bg-secondary)',
                    borderTop: '1px solid var(--theme-border-light)',
                  }}
                >
                  <td className="px-4 py-2.5 tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-text-muted)' }}>
                    {exp.expenseDate}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: exp.category === 'CHUNG' ? 'var(--theme-bg-tertiary)' : 'var(--theme-brand-primary-10)',
                        color: exp.category === 'CHUNG' ? 'var(--theme-text-muted)' : 'var(--theme-brand-primary)',
                      }}
                    >
                      {EXPENSE_CATEGORY_LABELS[exp.category]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                    {exp.vehiclePlate ?? <span style={{ color: 'var(--theme-text-muted)' }}>—</span>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-right" style={{ color: 'var(--theme-status-error)' }}>
                    {formatCurrencyFull(exp.amount)}
                  </td>
                  <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
                    {exp.description ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditing(exp)}
                        className="p-1.5 rounded transition-colors hover:opacity-80"
                        style={{ color: 'var(--theme-text-muted)' }}
                        title="Sửa"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(exp)}
                        className="p-1.5 rounded transition-colors hover:opacity-80"
                        style={{ color: 'var(--theme-status-error)' }}
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      {dialogOpen && (
        <ExpenseFormDialog
          vehicles={vehicles}
          onSubmit={handleSubmit}
          onClose={() => setDialogOpen(false)}
          loading={createExpense.isPending}
        />
      )}

      {/* Edit dialog */}
      {editing && (
        <ExpenseFormDialog
          initial={editingForm}
          vehicles={vehicles}
          onSubmit={handleSubmit}
          onClose={() => setEditing(null)}
          loading={updateExpense.isPending}
        />
      )}
    </div>
  )
}
