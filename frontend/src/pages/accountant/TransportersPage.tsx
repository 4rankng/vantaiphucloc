import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useMonthParams } from './use-month-params'
import { Truck, Plus, User, Search, MapPin } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label } from '@/components/ui'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { PulseHint } from '@/components/shared/PulseHint'
import { LocationManager } from '@/components/shared/LocationManager'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { StatBreakdownCard } from '@/components/shared/StatBreakdownCard'
import {
  useVehicleExpenses, useCreateVehicleExpense, useUpdateVehicleExpense,
  useSalaryConfig, useDrivers, useVehicleDrivers, useAddVehicleDriver,
  useRemoveVehicleDriver, useCreateVehicle,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { formatCurrency } from '@/data/domain'
import type { Driver } from '@/data/domain'
import type { VehicleExpenseCategory, VehicleExpense } from '@/services/api/vehicleExpenses.api'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'

// ─── Types & helpers ─────────────────────────────────────────────────────────

interface VehicleGroup {
  vehicleId: number
  plate: string
  drivers: { id: number; driverId: number; driverName: string }[]
}

function groupByVehicle(
  rows: { id: number; vehicleId: number; vehiclePlate: string; driverId: number; driverName: string }[],
): VehicleGroup[] {
  const map = new Map<number, VehicleGroup>()
  for (const r of rows) {
    if (!map.has(r.vehicleId)) map.set(r.vehicleId, { vehicleId: r.vehicleId, plate: r.vehiclePlate, drivers: [] })
    map.get(r.vehicleId)!.drivers.push({ id: r.id, driverId: r.driverId, driverName: r.driverName })
  }
  return [...map.values()]
}

const VEHICLE_CATEGORIES: VehicleExpenseCategory[] = ['XANG_DAU', 'SUA_CHUA', 'KHAC']

const CATEGORY_COLORS: Record<VehicleExpenseCategory, string> = {
  XANG_DAU: 'var(--theme-status-warning-text)',
  SUA_CHUA: 'var(--theme-status-success-text)',
  KHAC: 'var(--theme-status-info-text)',
  CHUNG: 'var(--theme-text-muted)',
}

function buildExpenseLookup(expenses: VehicleExpense[]): Map<string, VehicleExpense> {
  const map = new Map<string, VehicleExpense>()
  for (const e of expenses) {
    if (e.vehiclePlate) map.set(`${e.vehiclePlate}:${e.category}`, e)
  }
  return map
}

import { DashboardCard } from '@/components/shared/DashboardCard/DashboardCard'
import { EmptyState } from '@/components/shared/EmptyState'

// ─── Editable Cell ────────────────────────────────────────────────────────────

function EditableCell({
  amount,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}: {
  amount: number
  isEditing: boolean
  onStartEdit: () => void
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (isEditing) {
      setDraft(amount > 0 ? String(amount) : '')
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }, [isEditing, amount])

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={e => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave(draft)
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={() => onSave(draft)}
        className="w-full text-right tabular-nums rounded px-2 py-1 outline-none"
        style={{
          background: 'var(--theme-bg-primary)',
          border: '1px solid var(--theme-brand-primary)',
          boxShadow: '0 0 0 2px color-mix(in srgb, var(--theme-brand-primary) 15%, transparent)',
          color: 'var(--theme-text-primary)',
          fontSize: 13,
          fontWeight: 500,
        }}
        autoFocus
      />
    )
  }

  return (
    <button
      onClick={onStartEdit}
      className="w-full text-right tabular-nums rounded px-2 py-1 transition-colors cursor-pointer"
      style={{ color: amount > 0 ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)', fontSize: 13, fontWeight: 500 }}
      title={amount > 0 ? `${formatCurrency(amount)} — click để sửa` : 'Click để thêm'}
    >
      {amount > 0 ? formatCurrency(amount) : '—'}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'fleet' | 'locations'

export function TransportersPage() {
  const toast = useToast()

  const { data: vdRows = [], isLoading: vdLoading } = useVehicleDrivers()
  const { data: driversList = [] } = useDrivers()
  const { data: salaryConfig } = useSalaryConfig()

  const addDriver = useAddVehicleDriver()
  const removeDriver = useRemoveVehicleDriver()
  const createVehicle = useCreateVehicle()
  const createExpense = useCreateVehicleExpense()
  const updateExpense = useUpdateVehicleExpense()

  const groups = useMemo(() => groupByVehicle(vdRows), [vdRows])
  const plateToVehicleId = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of groups) m.set(g.plate, g.vehicleId)
    return m
  }, [groups])

  const fromDay = salaryConfig?.fromDay ?? 26
  const toDay = salaryConfig?.toDay ?? 25

  const { year: monthYear, month: monthMonth, onPrev, onNext } = useMonthParams()

  const periodStart = `${monthYear}-${String(monthMonth).padStart(2, '0')}-${String(fromDay).padStart(2, '0')}`
  const endMonth = fromDay > toDay ? (monthMonth === 12 ? 1 : monthMonth + 1) : monthMonth
  const endYear = fromDay > toDay ? (monthMonth === 12 ? monthYear + 1 : monthYear) : monthYear
  const periodEnd = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(toDay).padStart(2, '0')}`

  const { data: expensePage, isLoading: expenseLoading } = useVehicleExpenses({ dateFrom: periodStart, dateTo: periodEnd, pageSize: 200 })
  const expenses = expensePage?.items ?? []
  const expenseLookup = useMemo(() => buildExpenseLookup(expenses), [expenses])

  const catTotals = useMemo(() => {
    const totals: Record<VehicleExpenseCategory, number> = { XANG_DAU: 0, SUA_CHUA: 0, KHAC: 0, CHUNG: 0 }
    for (const e of expenses) {
      if (VEHICLE_CATEGORIES.includes(e.category)) {
        totals[e.category] = (totals[e.category] ?? 0) + e.amount
      }
    }
    return totals
  }, [expenses])

  const grandTotal = VEHICLE_CATEGORIES.reduce((s, cat) => s + (catTotals[cat] ?? 0), 0)

  const assignedDrivers = useMemo(() => {
    const set = new Set<number>()
    for (const g of groups) for (const d of g.drivers) set.add(d.driverId)
    return set.size
  }, [groups])

  const multiDriverVehicles = useMemo(() => groups.filter(g => g.drivers.length > 1).length, [groups])

  const [editingCell, setEditingCell] = useState<string | null>(null)

  const handleCellSave = useCallback(
    (plate: string, category: VehicleExpenseCategory, rawValue: string) => {
      const amount = parseInt(rawValue, 10)
      if (!amount || isNaN(amount)) { setEditingCell(null); return }

      const key = `${plate}:${category}`
      const existing = expenseLookup.get(key)

      if (existing) {
        updateExpense.mutate({ id: existing.id, payload: { amount } }, {
          onSuccess: () => { toast.success('Đã cập nhật'); setEditingCell(null) },
          onError: () => toast.error('Không thể cập nhật'),
        })
      } else {
        const vehicleId = plateToVehicleId.get(plate) ?? null
        createExpense.mutate({ vehicleId, category, amount, expenseDate: periodStart }, {
          onSuccess: () => { toast.success('Đã thêm chi phí'); setEditingCell(null) },
          onError: () => toast.error('Không thể thêm chi phí'),
        })
      }
    },
    [expenseLookup, plateToVehicleId, updateExpense, createExpense, toast, periodStart],
  )

  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newPlate, setNewPlate] = useState('')
  const [addingDriverFor, setAddingDriverFor] = useState<number | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('fleet')
  const [locationSearch, setLocationSearch] = useState('')
  const [removeDriverTarget, setRemoveDriverTarget] = useState<{ vdId: number; name: string } | null>(null)

  const handleAddVehicle = () => {
    if (!newPlate.trim()) return
    createVehicle.mutate(newPlate.trim().toUpperCase(), {
      onSuccess: () => { toast.success('Đã thêm xe'); setNewPlate(''); setShowAddVehicle(false) },
      onError: () => toast.error('Không thể thêm xe'),
    })
  }

  const handleAddDriver = () => {
    if (!addingDriverFor || !selectedDriverId) return
    addDriver.mutate({ vehicleId: addingDriverFor, driverId: selectedDriverId }, {
      onSuccess: () => { toast.success('Đã thêm lái xe'); setAddingDriverFor(null); setSelectedDriverId(null) },
      onError: () => toast.error('Không thể thêm lái xe'),
    })
  }

  const confirmRemoveDriver = () => {
    if (!removeDriverTarget) return
    removeDriver.mutate(removeDriverTarget.vdId, {
      onSuccess: () => { toast.success('Đã gỡ lái xe'); setRemoveDriverTarget(null) },
      onError: () => toast.error('Không thể gỡ lái xe'),
    })
  }

  const isLoading = vdLoading || expenseLoading
  const periodStartDate = new Date(monthYear, monthMonth - 1, fromDay)
  const periodEndDate = new Date(endYear, endMonth - 1, toDay)

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-display" style={{ color: 'var(--theme-text-primary)' }}>Vận tải</h1>
          <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            Quản lý xe, lái xe, chi phí & địa điểm
          </p>
        </div>
        <MonthNavigator
          year={monthYear}
          month={monthMonth}
          onPrev={onPrev}
          onNext={onNext}
          periodStart={periodStartDate}
          periodEnd={periodEndDate}
        />
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatBreakdownCard
          label="Xe vận tải"
          total={groups.length}
          items={[
            { label: 'Có lái xe', value: assignedDrivers },
            { label: 'Thiếu lái xe', value: driversList.length - assignedDrivers },
            { label: 'Xe nhiều tài', value: multiDriverVehicles },
          ]}
        />
        <StatBreakdownCard
          label="Tổng chi phí"
          total={formatCurrency(grandTotal)}
          items={VEHICLE_CATEGORIES.map(cat => ({
            label: EXPENSE_CATEGORY_LABELS[cat],
            value: formatCurrency(catTotals[cat] ?? 0),
          }))}
        />
      </div>

      {/* ── Tab navigation ── */}
      <div className="flex items-center justify-between">
        <div className="tab-row">
          <button className={activeTab === 'fleet' ? 'active' : ''} onClick={() => setActiveTab('fleet')}>
            Xe & Chi phí
          </button>
          <button className={activeTab === 'locations' ? 'active' : ''} onClick={() => setActiveTab('locations')}>
            Địa điểm
          </button>
        </div>
        {activeTab === 'fleet' && (
          <PulseHint hintKey="vehicles-add">
            <button onClick={() => setShowAddVehicle(true)} className="btn-primary text-xs">
              <Plus size={14} strokeWidth={2.25} /><span>Thêm xe</span>
            </button>
          </PulseHint>
        )}
        {activeTab === 'locations' && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--theme-text-muted)' }} />
            <input
              value={locationSearch}
              onChange={e => setLocationSearch(e.target.value)}
              placeholder="Tìm địa điểm..."
              className="search-pill h-9 w-64"
            />
          </div>
        )}
      </div>

      {/* ── Fleet tab ── */}
      {activeTab === 'fleet' && (
        <DashboardCard>
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
            <DashboardSectionHeader
              title="Chi phí xe theo kỳ lương"
              icon={Truck}
              right={
                groups.length > 0
                  ? <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{groups.length} xe</span>
                  : undefined
              }
            />
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <EmptyState icon={<Truck className="h-5 w-5" />} title="Chưa có xe nào" compact />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full [&_td]:align-middle" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)', width: 140 }}>Biển số</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Lái xe</th>
                    {VEHICLE_CATEGORIES.map(cat => (
                      <th key={cat} className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: CATEGORY_COLORS[cat], width: 130 }}>
                        {EXPENSE_CATEGORY_LABELS[cat]}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-primary)', width: 130 }}>Tổng CP</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g, i) => {
                    const rowTotal = VEHICLE_CATEGORIES.reduce(
                      (s, cat) => s + (expenseLookup.get(`${g.plate}:${cat}`)?.amount ?? 0),
                      0,
                    )
                    return (
                      <tr
                        key={g.vehicleId}
                        className="transition-colors"
                        style={{ borderBottom: i < groups.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider"
                            style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
                          >
                            {g.plate}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {g.drivers.map(d => (
                              <span
                                key={d.id}
                                className="inline-flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-xs font-semibold"
                                style={{ background: 'color-mix(in srgb, var(--theme-status-success) 10%, transparent)', color: 'var(--theme-status-success)' }}
                              >
                                <User className="h-3 w-3" />
                                {d.driverName}
                                <button
                                  onClick={() => setRemoveDriverTarget({ vdId: d.id, name: d.driverName })}
                                  className="flex h-4 w-4 items-center justify-center rounded-full transition-opacity opacity-30 hover:opacity-100"
                                  style={{ color: 'var(--theme-status-error)' }}
                                  title="Gỡ lái xe"
                                >
                                  <span className="text-[10px] leading-none">×</span>
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => { setAddingDriverFor(g.vehicleId); setSelectedDriverId(null) }}
                              className="inline-flex items-center justify-center rounded-full transition-colors"
                              style={{
                                color: 'var(--theme-text-muted)',
                                background: 'transparent',
                                border: '1.5px dashed var(--theme-border-default)',
                                width: 24,
                                height: 24,
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        {VEHICLE_CATEGORIES.map(cat => {
                          const key = `${g.plate}:${cat}`
                          const amount = expenseLookup.get(key)?.amount ?? 0
                          return (
                            <td key={cat} className="px-1 py-2">
                              <EditableCell
                                amount={amount}
                                isEditing={editingCell === key}
                                onStartEdit={() => setEditingCell(key)}
                                onSave={raw => handleCellSave(g.plate, cat, raw)}
                                onCancel={() => setEditingCell(null)}
                              />
                            </td>
                          )
                        })}
                        <td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
                          {rowTotal > 0 ? formatCurrency(rowTotal) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--theme-brand-primary)', background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)' }}>
                    <td className="px-3 py-3" style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-brand-primary)' }}>TỔNG</td>
                    <td className="px-3 py-3" />
                    {VEHICLE_CATEGORIES.map(cat => (
                      <td key={cat} className="px-3 py-3 text-right tabular-nums whitespace-nowrap" style={{ fontSize: 13, fontWeight: 700, color: CATEGORY_COLORS[cat] }}>
                        {(catTotals[cat] ?? 0) > 0 ? formatCurrency(catTotals[cat]) : '—'}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap" style={{ fontSize: 15, fontWeight: 900, color: 'var(--theme-brand-primary)' }}>
                      {grandTotal > 0 ? formatCurrency(grandTotal) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </DashboardCard>
      )}

      {/* ── Locations tab ── */}
      {activeTab === 'locations' && (
        <DashboardCard>
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
            <DashboardSectionHeader
              title="Quản lý địa điểm"
              icon={MapPin}
            />
          </div>
          <LocationManager search={locationSearch} />
        </DashboardCard>
      )}

      {/* ── Dialogs ── */}

      <Dialog open={showAddVehicle} onOpenChange={() => setShowAddVehicle(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm xe mới</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số</Label>
            <Input
              value={newPlate}
              onChange={e => setNewPlate(e.target.value)}
              placeholder="15C-12345"
              className="text-sm"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleAddVehicle() }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVehicle(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleAddVehicle} disabled={!newPlate.trim()} className="flex-1">Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addingDriverFor !== null} onOpenChange={() => setAddingDriverFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm lái xe</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chọn lái xe</Label>
            <div className="max-h-52 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--theme-border-default)' }}>
              {driversList.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có lái xe nào</p>
                </div>
              ) : (
                driversList.map((d: Driver, i: number) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDriverId(d.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
                    style={{
                      borderBottom: i < driversList.length - 1 ? '1px solid var(--theme-border-light)' : 'none',
                      background: selectedDriverId === d.id ? 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)' : 'transparent',
                    }}
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: selectedDriverId === d.id ? 'var(--theme-brand-primary)' : 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)' }}
                    >
                      <User className="h-3 w-3" style={{ color: selectedDriverId === d.id ? 'var(--theme-text-on-brand)' : 'var(--theme-brand-primary)' }} />
                    </div>
                    <span className="flex-1 text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                      {d.fullName ?? d.username}
                    </span>
                    {d.vehiclePlate && (
                      <span
                        className="rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wider"
                        style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-muted)' }}
                      >
                        {d.vehiclePlate}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingDriverFor(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleAddDriver} disabled={!selectedDriverId} className="flex-1">Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeDriverTarget}
        onClose={() => setRemoveDriverTarget(null)}
        onConfirm={confirmRemoveDriver}
        title="Gỡ lái xe"
        description={`Gỡ "${removeDriverTarget?.name}" khỏi xe này?`}
        confirmLabel="Gỡ"
        variant="warning"
      />
    </div>
  )
}
