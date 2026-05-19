import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useMonthParams } from './use-month-params'
import { Truck, Plus, User, X, MapPin, Users, Coins, Wrench, Scale, MoreHorizontal } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { LocationManager } from '@/components/shared/LocationManager'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { Plate } from '@/components/shared/Plate'
import { Toolbar, ToolbarSearch, ToolbarSpacer } from '@/components/shared/Toolbar'
import { EmptyState } from '@/components/shared/EmptyState'
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
    if (!map.has(r.vehicleId)) {
      map.set(r.vehicleId, { vehicleId: r.vehicleId, plate: r.vehiclePlate, drivers: [] })
    }
    map.get(r.vehicleId)!.drivers.push({ id: r.id, driverId: r.driverId, driverName: r.driverName })
  }
  return [...map.values()]
}

const VEHICLE_CATEGORIES: VehicleExpenseCategory[] = ['XANG_DAU', 'SUA_CHUA', 'TIEN_LUAT', 'KHAC']

const CATEGORY_ICON: Record<VehicleExpenseCategory, typeof Coins> = {
  XANG_DAU: Coins,
  SUA_CHUA: Wrench,
  TIEN_LUAT: Scale,
  KHAC: MoreHorizontal,
}

function buildExpenseLookup(expenses: VehicleExpense[]): Map<string, VehicleExpense> {
  const map = new Map<string, VehicleExpense>()
  for (const e of expenses) {
    if (e.vehiclePlate) map.set(`${e.vehiclePlate}:${e.category}`, e)
  }
  return map
}

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
        className="w-full text-right tabular-nums outline-none"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--accent)',
          boxShadow: '0 0 0 3px var(--accent-soft)',
          color: 'var(--ink)',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'var(--theme-font-mono)',
          padding: '6px 10px',
          borderRadius: 'var(--r-sm)',
        }}
        autoFocus
      />
    )
  }

  return (
    <button
      type="button"
      onClick={onStartEdit}
      className="nepo-editable-cell"
      title={amount > 0 ? `${formatCurrency(amount)} — nhấn để sửa` : 'Nhấn để thêm'}
    >
      <span
        className="tabular-nums"
        style={{
          color: amount > 0 ? 'var(--ink)' : 'var(--ink-3)',
          fontFamily: 'var(--theme-font-mono)',
          fontSize: 13,
          fontWeight: amount > 0 ? 600 : 400,
        }}
      >
        {amount > 0 ? formatCurrency(amount) : '—'}
      </span>
    </button>
  )
}

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
    const totals: Record<VehicleExpenseCategory, number> = { XANG_DAU: 0, SUA_CHUA: 0, TIEN_LUAT: 0, KHAC: 0 }
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
        const vehicleId = plateToVehicleId.get(plate)
        if (!vehicleId) {
          toast.error('Không tìm thấy xe')
          setEditingCell(null)
          return
        }
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
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="typo-display">Vận tải</h1>
          <p className="typo-body-sm mt-1.5">
            Quản lý xe, lái xe, chi phí theo kỳ lương và địa điểm
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
      </header>

      <div className="grid grid-cols-3 gap-3">
        <KpiHeroCard
          label="Xe vận tải"
          value={groups.length}
          icon={Truck}
          color="blue"
          sublabel={multiDriverVehicles > 0 ? `${multiDriverVehicles} xe nhiều tài` : undefined}
        />
        <KpiHeroCard
          label="Lái xe"
          value={assignedDrivers}
          icon={Users}
          color="emerald"
          sublabel={`${Math.max(0, driversList.length - assignedDrivers)} chưa gán`}
        />
        <KpiHeroCard
          label="Chi phí kỳ"
          formattedValue={formatCurrency(grandTotal)}
          value={grandTotal}
          icon={Coins}
          color="amber"
          sublabel={`Sửa chữa: ${formatCurrency(catTotals.SUA_CHUA ?? 0)}`}
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList variant="underline">
          <TabsTrigger value="fleet">
            <Truck className="h-3.5 w-3.5 mr-1.5" /> Xe &amp; chi phí
          </TabsTrigger>
          <TabsTrigger value="locations">
            <MapPin className="h-3.5 w-3.5 mr-1.5" /> Địa điểm
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="mt-5">
          <Panel
            title="Chi phí xe theo kỳ lương"
            subtitle={`${groups.length} xe · ${periodStart} → ${periodEnd}`}
            actions={
              <Button variant="default" onClick={() => setShowAddVehicle(true)}>
                <Plus className="h-4 w-4" />
                Thêm xe
              </Button>
            }
            flush
          >
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="py-10">
                <EmptyState icon={<Truck className="h-5 w-5" />} title="Chưa có xe nào" compact />
              </div>
            ) : (
              <div className="nepo-table-scroll overflow-x-auto">
                <table className="nepo-table w-full" style={{ minWidth: 980, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th className="text-left" style={{ width: 130 }}>Biển số</th>
                      <th className="text-left">Lái xe</th>
                      {VEHICLE_CATEGORIES.map(cat => {
                        const Icon = CATEGORY_ICON[cat]
                        return (
                          <th key={cat} className="text-right" style={{ width: 140 }}>
                            <span className="inline-flex items-center gap-1 justify-end">
                              <Icon className="h-3 w-3" />
                              {EXPENSE_CATEGORY_LABELS[cat]}
                            </span>
                          </th>
                        )
                      })}
                      <th className="text-right" style={{ width: 140 }}>Tổng CP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => {
                      const rowTotal = VEHICLE_CATEGORIES.reduce(
                        (s, cat) => s + (expenseLookup.get(`${g.plate}:${cat}`)?.amount ?? 0),
                        0,
                      )
                      return (
                        <tr key={g.vehicleId}>
                          <td>
                            <Plate>{g.plate}</Plate>
                          </td>
                          <td>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {g.drivers.map(d => (
                                <span
                                  key={d.id}
                                  className="nepo-driver-chip"
                                >
                                  <User className="h-3 w-3" />
                                  <span className="truncate max-w-[140px]">{d.driverName}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setRemoveDriverTarget({ vdId: d.id, name: d.driverName })
                                    }}
                                    className="nepo-driver-chip__x"
                                    aria-label="Gỡ lái xe"
                                    title="Gỡ lái xe"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              ))}
                              <button
                                type="button"
                                onClick={() => { setAddingDriverFor(g.vehicleId); setSelectedDriverId(null) }}
                                className="nepo-driver-chip-add"
                                aria-label="Thêm lái xe"
                                title="Thêm lái xe"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          {VEHICLE_CATEGORIES.map(cat => {
                            const key = `${g.plate}:${cat}`
                            const amount = expenseLookup.get(key)?.amount ?? 0
                            return (
                              <td key={cat} className="text-right" style={{ padding: '8px 6px' }}>
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
                          <td className="text-right">
                            <span
                              className="tabular-nums font-bold"
                              style={{
                                color: rowTotal > 0 ? 'var(--ink)' : 'var(--ink-3)',
                                fontFamily: 'var(--theme-font-mono)',
                              }}
                            >
                              {rowTotal > 0 ? formatCurrency(rowTotal) : '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="nepo-tfoot">
                    <tr>
                      <td>
                        <span className="font-bold" style={{ color: 'var(--ink)' }}>TỔNG</span>
                      </td>
                      <td />
                      {VEHICLE_CATEGORIES.map(cat => (
                        <td key={cat} className="text-right tabular-nums" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--ink-2)' }}>
                          {(catTotals[cat] ?? 0) > 0 ? formatCurrency(catTotals[cat]) : '—'}
                        </td>
                      ))}
                      <td className="text-right tabular-nums font-bold" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--accent)' }}>
                        {grandTotal > 0 ? formatCurrency(grandTotal) : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="locations" className="mt-5">
          <Panel title="Quản lý địa điểm" subtitle="Danh sách địa điểm và các alias đã ghi nhận" flush>
            <Toolbar bordered>
              <ToolbarSpacer />
              <ToolbarSearch
                value={locationSearch}
                onChange={setLocationSearch}
                placeholder="Tìm địa điểm..."
                width={280}
              />
            </Toolbar>
            <LocationManager search={locationSearch} />
          </Panel>
        </TabsContent>
      </Tabs>

      {/* ── Add Vehicle Dialog ── */}
      <Dialog open={showAddVehicle} onOpenChange={() => setShowAddVehicle(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm xe mới</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="nepo-field-label" htmlFor="new-plate">Biển số</label>
              <input
                id="new-plate"
                value={newPlate}
                onChange={e => setNewPlate(e.target.value)}
                placeholder="15C-12345"
                className="nepo-input"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleAddVehicle() }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddVehicle(false)}>Huỷ</Button>
            <Button variant="default" onClick={handleAddVehicle} disabled={!newPlate.trim()}>Thêm xe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Driver Dialog ── */}
      <Dialog open={addingDriverFor !== null} onOpenChange={() => setAddingDriverFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm lái xe</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-2">
            <label className="nepo-field-label">Chọn lái xe</label>
            <div
              className="max-h-64 overflow-y-auto"
              style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}
            >
              {driversList.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>Chưa có lái xe nào</p>
                </div>
              ) : (
                driversList.map((d: Driver, i: number) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDriverId(d.id)}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors"
                    style={{
                      borderBottom: i < driversList.length - 1 ? '1px solid var(--line)' : 'none',
                      background: selectedDriverId === d.id ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: selectedDriverId === d.id ? 'var(--accent)' : 'var(--surface-3)',
                        color: selectedDriverId === d.id ? '#fff' : 'var(--ink-2)',
                      }}
                    >
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1 text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>
                      {d.fullName ?? d.username}
                    </span>
                    {d.vehiclePlate && (
                      <Plate>{d.vehiclePlate}</Plate>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddingDriverFor(null)}>Huỷ</Button>
            <Button variant="default" onClick={handleAddDriver} disabled={!selectedDriverId}>Thêm lái xe</Button>
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
