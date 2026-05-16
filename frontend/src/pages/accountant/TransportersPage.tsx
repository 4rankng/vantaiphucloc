import { useState, useMemo, type ElementType } from 'react'
import { Truck, MapPin, DollarSign, Plus, User, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label } from '@/components/ui'
import { AccountantPageShell } from '@/components/shared/AccountantPageShell'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { PulseHint } from '@/components/shared/PulseHint'
import { InfoTip } from '@/components/shared/InfoTip/InfoTip'
import { LocationManager } from '@/components/shared/LocationManager'
import { useVehicleExpenses, useCreateVehicleExpense, useSalaryConfig, useDrivers, useVehicleDrivers, useAddVehicleDriver, useRemoveVehicleDriver, useCreateVehicle, useLocations } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { formatCurrency } from '@/data/domain'
import type { Driver } from '@/data/domain'
import type { VehicleExpenseCategory } from '@/services/api/vehicleExpenses.api'
import { useQueryClient } from '@tanstack/react-query'

interface VehicleGroup {
  vehicleId: number
  plate: string
  drivers: { id: number; driverId: number; driverName: string }[]
}

function groupByVehicle(rows: { id: number; vehicleId: number; vehiclePlate: string; driverId: number; driverName: string }[]): VehicleGroup[] {
  const map = new Map<number, VehicleGroup>()
  for (const r of rows) {
    if (!map.has(r.vehicleId)) map.set(r.vehicleId, { vehicleId: r.vehicleId, plate: r.vehiclePlate, drivers: [] })
    map.get(r.vehicleId)!.drivers.push({ id: r.id, driverId: r.driverId, driverName: r.driverName })
  }
  return [...map.values()]
}

const CATEGORIES: { key: VehicleExpenseCategory; label: string }[] = [
  { key: 'XANG_DAU', label: 'Xăng dầu' },
  { key: 'SUA_CHUA', label: 'Sửa chữa' },
]

// ─── KPI Card ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subValue }: { icon: ElementType; label: string; value: string | number; subValue?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)' }}>
          <Icon className="h-4 w-4" style={{ color: 'var(--theme-brand-primary)', opacity: 0.8 }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {subValue && <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{subValue}</p>}
    </div>
  )
}

// ─── Vehicles Section ──────────────────────────────────────────────
function VehiclesSection() {
  const toast = useToast()
  const { data: vdRows = [], isLoading } = useVehicleDrivers()
  const { data: driversList = [] } = useDrivers()
  const addDriver = useAddVehicleDriver()
  const removeDriver = useRemoveVehicleDriver()
  const createVehicle = useCreateVehicle()

  const groups = groupByVehicle(vdRows)

  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newPlate, setNewPlate] = useState('')
  const [addingDriverFor, setAddingDriverFor] = useState<number | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)

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

  const handleRemoveDriver = (vdId: number) => {
    removeDriver.mutate(vdId, {
      onSuccess: () => toast.success('Đã gỡ lái xe'),
      onError: () => toast.error('Không thể gỡ lái xe'),
    })
  }

  return (
    <div className="card-shell">
      <div className="toolbar">
        <DashboardSectionHeader title="Xe & Lái xe" subtitle={`${groups.length} xe, ${groups.reduce((s, g) => s + g.drivers.length, 0)} lái xe`} icon={Truck} />
        <PulseHint hintKey="vehicles-add">
          <button onClick={() => setShowAddVehicle(true)} className="btn-primary text-xs">
            <Plus size={14} strokeWidth={2.25} /><span>Thêm xe</span>
          </button>
        </PulseHint>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}>
            <Truck className="h-6 w-6" style={{ color: 'var(--theme-brand-primary)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Chưa có xe nào</p>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Thêm xe để bắt đầu quản lý đội xe</p>
          <PulseHint hintKey="vehicles-add-empty">
            <button onClick={() => setShowAddVehicle(true)} className="btn-primary text-xs mt-2">
              <Plus size={14} strokeWidth={2.25} /><span>Thêm xe</span>
            </button>
          </PulseHint>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Biển số</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Lái xe</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider w-[100px]" style={{ color: 'var(--theme-text-muted)' }}></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => (
                <tr
                  key={g.vehicleId}
                  style={{ borderBottom: i < groups.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-[12px] font-bold tracking-wider" style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}>
                      {g.plate}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {g.drivers.map(d => (
                        <span key={d.id} className="inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-0.5 text-xs font-medium" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)', color: 'var(--theme-text-primary)' }}>
                          <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)' }}>
                            <User className="h-2.5 w-2.5" style={{ color: 'var(--theme-brand-primary)' }} />
                          </div>
                          {d.driverName}
                          <button onClick={() => handleRemoveDriver(d.id)} className="flex h-4 w-4 items-center justify-center rounded-full transition-colors opacity-40 hover:opacity-100" style={{ color: 'var(--theme-status-error)' }} title="Gỡ lái xe">
                            <span className="text-[10px] leading-none">×</span>
                          </button>
                        </span>
                      ))}
                      {g.drivers.length === 0 && (
                        <span className="text-xs italic" style={{ color: 'var(--theme-text-muted)' }}>Chưa gán lái xe</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => { setAddingDriverFor(g.vehicleId); setSelectedDriverId(null) }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors" style={{ color: 'var(--theme-brand-primary)', background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)'}>
                      <Plus className="h-3 w-3" />
                      Thêm lái xe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showAddVehicle} onOpenChange={() => setShowAddVehicle(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm xe mới</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số</Label>
            <Input value={newPlate} onChange={e => setNewPlate(e.target.value)} placeholder="15C-12345" className="text-sm" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAddVehicle() }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVehicle(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleAddVehicle} disabled={!newPlate.trim()} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>Thêm</Button>
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
                  <button key={d.id} type="button" onClick={() => setSelectedDriverId(d.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
                    style={{ borderBottom: i < driversList.length - 1 ? '1px solid var(--theme-border-light)' : 'none', background: selectedDriverId === d.id ? 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)' : 'transparent' }}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: selectedDriverId === d.id ? 'var(--theme-brand-primary)' : 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)' }}>
                      <User className="h-3 w-3" style={{ color: selectedDriverId === d.id ? 'var(--theme-text-on-brand)' : 'var(--theme-brand-primary)', opacity: selectedDriverId === d.id ? 1 : 0.7 }} />
                    </div>
                    <span className="flex-1 text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{d.fullName ?? d.username}</span>
                    {d.vehiclePlate && (
                      <span className="rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wider" style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-muted)' }}>{d.vehiclePlate}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingDriverFor(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleAddDriver} disabled={!selectedDriverId} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Expenses Section ──────────────────────────────────────────────
function ExpensesSection() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: salaryConfig } = useSalaryConfig()
  const fromDay = salaryConfig?.fromDay ?? 26
  const toDay = salaryConfig?.toDay ?? 25

  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  const periodStart = `${month.year}-${String(month.month).padStart(2, '0')}-${String(fromDay).padStart(2, '0')}`
  const endMonth = fromDay > toDay ? (month.month === 12 ? 1 : month.month + 1) : month.month
  const endYear = fromDay > toDay ? (month.month === 12 ? month.year + 1 : month.year) : month.year
  const periodEnd = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(toDay).padStart(2, '0')}`

  const { data: expensePage, isLoading } = useVehicleExpenses({ dateFrom: periodStart, dateTo: periodEnd, pageSize: 200 })
  const createExpense = useCreateVehicleExpense()

  const [showCreate, setShowCreate] = useState(false)
  const [newExpense, setNewExpense] = useState({ vehiclePlate: '', category: 'XANG_DAU' as VehicleExpenseCategory, amount: '', description: '' })

  const expenses = expensePage?.items ?? []

  const byVehicle = useMemo(() => {
    const map = new Map<string, Record<string, number>>()
    for (const e of expenses) {
      const key = e.vehiclePlate ?? 'CHUNG'
      if (!map.has(key)) map.set(key, { XANG_DAU: 0, SUA_CHUA: 0, KHAC: 0, CHUNG: 0 })
      const rec = map.get(key)!
      const cat = e.category as string
      if (rec[cat] !== undefined) rec[cat] += e.amount
    }
    return map
  }, [expenses])

  const grandTotal = useMemo(() => {
    let sum = 0
    for (const cats of byVehicle.values()) sum += Object.values(cats).reduce((s, v) => s + v, 0)
    return sum
  }, [byVehicle])

  const handleCreate = () => {
    const amount = parseInt(newExpense.amount.replace(/\D/g, ''), 10)
    if (!amount) return
    createExpense.mutate({
      category: newExpense.category, amount, expenseDate: periodStart, description: newExpense.description || null,
    }, {
      onSuccess: () => {
        toast.success('Đã thêm chi phí')
        setShowCreate(false)
        setNewExpense({ vehiclePlate: '', category: 'XANG_DAU', amount: '', description: '' })
        qc.invalidateQueries({ queryKey: ['vehicle-expenses'] })
      },
    })
  }

  const prevMonth = () => setMonth(p => { const m = p.month === 1 ? 12 : p.month - 1; const y = p.month === 1 ? p.year - 1 : p.year; return { year: y, month: m } })
  const nextMonth = () => setMonth(p => { const m = p.month === 12 ? 1 : p.month + 1; const y = p.month === 12 ? p.year + 1 : p.year; return { year: y, month: m } })

  return (
    <div className="card-shell">
      <div className="toolbar">
        <DashboardSectionHeader title="Chi phí xe" icon={DollarSign} />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="flex h-7 w-7 items-center justify-center rounded-md transition-colors" style={{ background: 'var(--theme-bg-tertiary)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-border-default)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'}>
              <ChevronLeft className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
            </button>
            <span className="text-sm font-semibold min-w-[72px] text-center" style={{ color: 'var(--theme-text-primary)' }}>{String(month.month).padStart(2, '0')}/{month.year}</span>
            <button onClick={nextMonth} className="flex h-7 w-7 items-center justify-center rounded-md transition-colors" style={{ background: 'var(--theme-bg-tertiary)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-border-default)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'}>
              <ChevronRight className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
            </button>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
            <Plus size={14} strokeWidth={2.25} /><span>Thêm</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      ) : byVehicle.size === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}>
            <DollarSign className="h-6 w-6" style={{ color: 'var(--theme-brand-primary)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Chưa có chi phí</p>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Kỳ {String(month.month).padStart(2, '0')}/{month.year} ({periodStart} → {periodEnd})</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                    Biển số <InfoTip text="Chi phí riêng của từng xe" />
                  </th>
                  {CATEGORIES.map(c => (
                    <th key={c.key} className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>{c.label}</th>
                  ))}
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {[...byVehicle.entries()].map(([plate, cats], i) => {
                  const total = Object.values(cats).reduce((s, v) => s + v, 0)
                  const isChung = plate === 'CHUNG'
                  return (
                    <tr key={plate} style={{ borderBottom: i < byVehicle.size - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td className="px-5 py-3">
                        {isChung ? (
                          <span className="text-xs font-semibold" style={{ color: 'var(--theme-status-warning)' }}>CP Chung <InfoTip text="Phân bổ đều cho tất cả xe" /></span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider" style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}>{plate}</span>
                        )}
                      </td>
                      {CATEGORIES.map(c => (
                        <td key={c.key} className="px-5 py-3 text-right text-xs font-semibold tabular-nums whitespace-nowrap" style={{ color: cats[c.key] > 0 ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>
                          {cats[c.key] > 0 ? formatCurrency(cats[c.key]) : '—'}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-right text-xs font-extrabold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(total)}</td>
                    </tr>
                  )
                })}
              </tbody>
              {byVehicle.size > 1 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--theme-border-default)', background: 'var(--theme-bg-primary)' }}>
                    <td className="px-5 py-3 text-xs font-bold" style={{ color: 'var(--theme-text-primary)' }}>Tổng cộng</td>
                    {CATEGORIES.map(c => {
                      const catTotal = [...byVehicle.values()].reduce((s, cats) => s + (cats[c.key] ?? 0), 0)
                      return (
                        <td key={c.key} className="px-5 py-3 text-right text-xs font-bold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
                          {catTotal > 0 ? formatCurrency(catTotal) : '—'}
                        </td>
                      )
                    })}
                    <td className="px-5 py-3 text-right text-sm font-extrabold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrency(grandTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="px-5 py-2.5 border-t flex items-center justify-between" style={{ borderColor: 'var(--theme-border-light)' }}>
            <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Kỳ {periodStart} → {periodEnd}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrency(grandTotal)}</span>
          </div>
        </>
      )}

      <Dialog open={showCreate} onOpenChange={() => setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm chi phí</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại chi phí</Label>
              <div className="flex gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.key} type="button" onClick={() => setNewExpense(p => ({ ...p, category: c.key }))} className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: newExpense.category === c.key ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: newExpense.category === c.key ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số tiền (VNĐ)</Label>
              <Input value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} placeholder="5000000" className="text-sm" type="number" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Ghi chú</Label>
              <Input value={newExpense.description} onChange={e => setNewExpense(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả (tuỳ chọn)" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleCreate} disabled={!newExpense.amount} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Locations Section (compact) ──────────────────────────────────
function LocationsSection() {
  const [search, setSearch] = useState('')
  return (
    <div className="card-shell flex flex-col" style={{ minHeight: 400 }}>
      <div className="toolbar">
        <DashboardSectionHeader title="Địa điểm" icon={MapPin} />
      </div>
      <div className="px-4 pb-3">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm địa điểm..." className="text-sm h-9" />
      </div>
      <div className="flex-1 overflow-hidden">
        <LocationManager search={search} compact />
      </div>
    </div>
  )
}

// ─── Main Transporters Page ──────────────────────────────────────
export function TransportersPage() {
  const { data: vdRows = [] } = useVehicleDrivers()
  const { data: driversList = [] } = useDrivers()
  const { data: locations = [] } = useLocations()

  const groups = groupByVehicle(vdRows)
  const totalDrivers = driversList.length
  const totalLocations = locations.length

  return (
    <AccountantPageShell title="Vận tải" subtitle="Quản lý xe, địa điểm và chi phí" icon={Truck}>
      <div className="space-y-5">
        <div className="kpi-grid">
          <StatCard icon={Truck} label="Tổng xe" value={groups.length} />
          <StatCard icon={Users} label="Lái xe" value={totalDrivers} />
          <StatCard icon={MapPin} label="Địa điểm" value={totalLocations} />
          <StatCard icon={DollarSign} label="Chi phí tháng" value="—" subValue="Chọn kỳ bên dưới" />
        </div>

        <VehiclesSection />

        <div className="main-grid">
          <ExpensesSection />
          <LocationsSection />
        </div>
      </div>
    </AccountantPageShell>
  )
}
