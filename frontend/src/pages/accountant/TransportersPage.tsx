import { useState, useEffect } from 'react'
import { Truck, MapPin, DollarSign, Plus, X, Loader2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label } from '@/components/ui'
import { AccountantPageShell } from '@/components/shared/AccountantPageShell'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { VehicleDriverCard } from '@/components/shared/VehicleDriverCard'
import { AliasManager } from '@/components/shared/AliasManager'
import { InfoTip } from '@/components/shared/InfoTip'
import { PulseHint } from '@/components/shared/PulseHint'
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, useVehicleExpenses, useCreateVehicleExpense, useSalaryConfig } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api/client'
import { toCamel } from '@/services/api/utils'
import { formatCurrency } from '@/data/domain'
import type { Driver, Location as Loc, LocationAlias } from '@/data/domain'
import type { VehicleExpenseCategory } from '@/services/api/vehicleExpenses.api'

// ─── Vehicle-Driver API (not yet in service layer) ────────────────────
interface VehicleDriverRow {
  id: number
  vehicleId: number
  vehiclePlate: string
  driverId: number
  driverName: string
  role: 'PRIMARY' | 'SECONDARY'
}

interface VehicleGroup {
  vehicleId: number
  plate: string
  drivers: VehicleDriverRow[]
}

async function fetchVehicleDrivers(): Promise<VehicleGroup[]> {
  const res = await api.get('/vehicle-drivers', { params: { active_only: true } })
  const rows: VehicleDriverRow[] = (res.data?.items ?? res.data ?? []).map((r: Record<string, unknown>) => toCamel<VehicleDriverRow>(r))
  const map = new Map<number, VehicleGroup>()
  for (const r of rows) {
    if (!map.has(r.vehicleId)) map.set(r.vehicleId, { vehicleId: r.vehicleId, plate: r.vehiclePlate, drivers: [] })
    map.get(r.vehicleId)!.drivers.push(r)
  }
  return [...map.values()]
}

async function fetchDrivers(): Promise<Driver[]> {
  const res = await api.get('/drivers')
  return (res.data?.items ?? res.data ?? []).map((r: Record<string, unknown>) => toCamel<Driver>(r))
}

async function addVehicleDriver(vehicleId: number, driverId: number, role: string) {
  await api.post('/vehicle-drivers', { vehicle_id: vehicleId, driver_id: driverId, role })
}

async function removeVehicleDriver(id: number) {
  await api.delete(`/vehicle-drivers/${id}`)
}

async function createVehicle(plate: string) {
  const res = await api.post('/drivers/0/vehicle', { plate }) // hack: use any endpoint that creates vehicle
  return res.data
}

async function fetchLocationAliases(locationId: number): Promise<LocationAlias[]> {
  const res = await api.get('/location-aliases', { params: { location_id: locationId } })
  return (res.data?.items ?? res.data ?? []).map((r: Record<string, unknown>) => toCamel<LocationAlias>(r))
}

async function createAlias(locationId: number, alias: string) {
  await api.post('/location-aliases', { location_id: locationId, alias, source: 'manual' })
}

async function confirmAlias(id: number) {
  await api.post(`/location-aliases/${id}/confirm`)
}

async function rejectAlias(id: number) {
  await api.post(`/location-aliases/${id}/reject`)
}

// ─── Tab 1: Xe ────────────────────────────────────────────────────────
function VehiclesTab() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: groups = [], isLoading } = useQuery({ queryKey: ['vehicle-drivers'], queryFn: fetchVehicleDrivers })
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers-list'], queryFn: fetchDrivers })

  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newPlate, setNewPlate] = useState('')
  const [addingDriverFor, setAddingDriverFor] = useState<number | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
  const [selectedRole, setSelectedRole] = useState<'PRIMARY' | 'SECONDARY'>('PRIMARY')

  const handleAddVehicle = async () => {
    if (!newPlate.trim()) return
    try {
      // Create by assigning a temp driver, backend creates vehicle
      await api.post('/vehicles', { plate: newPlate.trim() })
      toast.success('Đã thêm xe')
      setNewPlate('')
      setShowAddVehicle(false)
      qc.invalidateQueries({ queryKey: ['vehicle-drivers'] })
    } catch {
      toast.error('Không thể thêm xe')
    }
  }

  const handleAddDriver = async () => {
    if (!addingDriverFor || !selectedDriverId) return
    try {
      await addVehicleDriver(addingDriverFor, selectedDriverId, selectedRole)
      toast.success('Đã thêm lái xe')
      setAddingDriverFor(null)
      setSelectedDriverId(null)
      qc.invalidateQueries({ queryKey: ['vehicle-drivers'] })
    } catch {
      toast.error('Không thể thêm lái xe')
    }
  }

  const handleRemoveDriver = async (vdId: number) => {
    try {
      await removeVehicleDriver(vdId)
      toast.success('Đã gỡ lái xe')
      qc.invalidateQueries({ queryKey: ['vehicle-drivers'] })
    } catch {
      toast.error('Không thể gỡ lái xe')
    }
  }

  const unassignedDrivers = drivers.filter(d => !groups.some(g => g.drivers.some(vd => vd.driverId === d.id)))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{groups.length} xe</span>
        <PulseHint hintKey="vehicles-add">
          <button onClick={() => setShowAddVehicle(true)} className="btn-primary text-xs">
            <Plus size={14} strokeWidth={2.25} /><span>Thêm xe</span>
          </button>
        </PulseHint>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border p-4 animate-pulse" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
              <div className="h-5 w-24 rounded" style={{ background: 'var(--theme-bg-tertiary)' }} />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}>
              <Truck className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có xe nào.</p>
            <PulseHint hintKey="vehicles-add-empty">
              <button onClick={() => setShowAddVehicle(true)} className="btn-primary text-xs mt-1">
                <Plus size={14} strokeWidth={2.25} />
                <span>Thêm xe</span>
              </button>
            </PulseHint>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map(g => (
            <VehicleDriverCard
              key={g.vehicleId}
              plate={g.plate}
              drivers={g.drivers}
              onRemoveDriver={handleRemoveDriver}
              onAddDriver={() => { setAddingDriverFor(g.vehicleId); setSelectedDriverId(null) }}
            />
          ))}
        </div>
      )}

      {/* Add vehicle dialog */}
      <Dialog open={showAddVehicle} onOpenChange={() => setShowAddVehicle(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm xe mới</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Biển số</Label>
            <Input value={newPlate} onChange={e => setNewPlate(e.target.value)} placeholder="15C-12345" className="text-sm" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleAddVehicle() }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVehicle(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleAddVehicle} disabled={!newPlate.trim()} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add driver to vehicle dialog */}
      <Dialog open={addingDriverFor !== null} onOpenChange={() => setAddingDriverFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm lái xe</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chọn lái xe</Label>
              <select
                value={selectedDriverId ?? ''}
                onChange={e => setSelectedDriverId(Number(e.target.value) || null)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
              >
                <option value="">— Chọn lái xe —</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName ?? d.username} {d.vehiclePlate ? `(${d.vehiclePlate})` : ''}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Vai trò</Label>
              <div className="flex gap-2">
                {(['PRIMARY', 'SECONDARY'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setSelectedRole(r)} className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: selectedRole === r ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: selectedRole === r ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                    {r === 'PRIMARY' ? 'Chính' : 'Phụ'}
                  </button>
                ))}
              </div>
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

// ─── Tab 2: Địa điểm ─────────────────────────────────────────────────
function LocationsTab() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: locations = [], isLoading } = useLocations()
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()
  const deleteLocation = useDeleteLocation()

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [aliasData, setAliasData] = useState<Record<number, LocationAlias[]>>({})

  const filtered = search.trim()
    ? locations.filter((l: Loc) => l.name.toLowerCase().includes(search.toLowerCase()))
    : locations

  // Load aliases for visible locations
  useEffect(() => {
    filtered.slice(0, 30).forEach((l: Loc) => {
      if (aliasData[l.id]) return
      fetchLocationAliases(l.id).then(aliases => {
        setAliasData(prev => ({ ...prev, [l.id]: aliases }))
      })
    })
  }, [filtered])

  const handleCreate = () => {
    if (!newName.trim()) return
    createLocation.mutate({ name: newName.trim() }, {
      onSuccess: () => { toast.success('Đã thêm địa điểm'); setNewName(''); setShowCreate(false); qc.invalidateQueries({ queryKey: ['locations'] }) },
    })
  }

  const handleAddAlias = async (locationId: number, alias: string) => {
    await createAlias(locationId, alias)
    const aliases = await fetchLocationAliases(locationId)
    setAliasData(prev => ({ ...prev, [locationId]: aliases }))
  }

  const handleConfirmAlias = async (locationId: number, aliasId: number | string) => {
    await confirmAlias(aliasId as number)
    const aliases = await fetchLocationAliases(locationId)
    setAliasData(prev => ({ ...prev, [locationId]: aliases }))
  }

  const handleRejectAlias = async (locationId: number, aliasId: number | string) => {
    await rejectAlias(aliasId as number)
    const aliases = await fetchLocationAliases(locationId)
    setAliasData(prev => ({ ...prev, [locationId]: aliases }))
  }

  const handlePromote = async (locationId: number, aliasId: number | string) => {
    const aliases = aliasData[locationId] ?? []
    const alias = aliases.find(a => a.id === aliasId)
    if (!alias) return
    const loc = locations.find((l: Loc) => l.id === locationId)
    if (!loc) return
    // Swap: alias becomes the new name, old name becomes an alias
    const oldName = loc.name
    const newName = alias.alias
    updateLocation.mutate({ id: locationId, name: newName }, {
      onSuccess: async () => {
        await api.post('/location-aliases', { location_id: locationId, alias: oldName, source: 'manual' })
        const freshAliases = await fetchLocationAliases(locationId)
        setAliasData(prev => ({ ...prev, [locationId]: freshAliases }))
        qc.invalidateQueries({ queryKey: ['locations'] })
        toast.success(`Đã đổi tên chính thành "${newName}"`)
      },
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm địa điểm..." className="text-sm" />
        </div>
        <InfoTip text="Mỗi địa điểm có thể có nhiều tên gọi (aliases). Di chuột lên tên phụ để đặt làm tên chính." side="left" />
        <PulseHint hintKey="locations-add">
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
            <Plus size={14} strokeWidth={2.25} /><span>Thêm</span>
          </button>
        </PulseHint>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06)' }}>
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}>
              <MapPin className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có địa điểm</p>
          </div>
        ) : (
          <div>
            {filtered.map((loc: Loc, i: number) => {
              const aliases = (aliasData[loc.id] ?? []).filter(a => a.status !== 'REJECTED' && a.status !== 'MERGED')
              return (
                <div key={loc.id} className="px-5 py-3.5 group" style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)' }}>
                      <MapPin className="h-3.5 w-3.5" style={{ color: 'var(--theme-brand-primary)', opacity: 0.7 }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{loc.name}</p>
                      <div className="mt-1">
                        <AliasManager
                          aliases={aliases.map(a => ({ id: a.id, alias: a.alias, status: a.status as 'PENDING' | 'CONFIRMED' | 'REJECTED' | undefined }))}
                          primaryName={loc.name}
                          onAddAlias={(alias) => handleAddAlias(loc.id, alias)}
                          onConfirmAlias={(id) => handleConfirmAlias(loc.id, id)}
                          onRejectAlias={(id) => handleRejectAlias(loc.id, id)}
                          onPromoteAlias={(id) => handlePromote(loc.id, id)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={() => setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm địa điểm</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên địa điểm</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="VD: HẢI AN, NHĐV..." className="text-sm" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Tab 3: Chi phí xe ───────────────────────────────────────────────
const CATEGORIES: { key: VehicleExpenseCategory; label: string }[] = [
  { key: 'XANG_DAU', label: 'Xăng dầu' },
  { key: 'SUA_CHUA', label: 'Sửa chữa' },
]

function ExpensesTab() {
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

  // Group by vehicle
  const byVehicle = new Map<string, Record<string, number>>()
  for (const e of expenses) {
    const key = e.vehiclePlate ?? 'CHUNG'
    if (!byVehicle.has(key)) byVehicle.set(key, { XANG_DAU: 0, SUA_CHUA: 0, KHAC: 0, CHUNG: 0 })
    const rec = byVehicle.get(key)!
    const cat = e.category as string
    if (rec[cat] !== undefined) rec[cat] += e.amount
  }

  const handleCreate = () => {
    const amount = parseInt(newExpense.amount.replace(/\D/g, ''), 10)
    if (!amount) return
    createExpense.mutate({
      category: newExpense.category,
      amount,
      expenseDate: periodStart,
      description: newExpense.description || null,
    }, {
      onSuccess: () => {
        toast.success('Đã thêm chi phí')
        setShowCreate(false)
        setNewExpense({ vehiclePlate: '', category: 'XANG_DAU', amount: '', description: '' })
        qc.invalidateQueries({ queryKey: ['vehicle-expenses'] })
      },
    })
  }

  const prevMonth = () => setMonth(p => {
    const m = p.month === 1 ? 12 : p.month - 1
    const y = p.month === 1 ? p.year - 1 : p.year
    return { year: y, month: m }
  })
  const nextMonth = () => setMonth(p => {
    const m = p.month === 12 ? 1 : p.month + 1
    const y = p.month === 12 ? p.year + 1 : p.year
    return { year: y, month: m }
  })

  return (
    <div className="space-y-4">
      {/* Period header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="h-7 w-7 flex items-center justify-center rounded-md" style={{ background: 'var(--theme-bg-tertiary)' }}>
            <span style={{ color: 'var(--theme-text-muted)' }}>←</span>
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Kỳ {String(month.month).padStart(2, '0')}/{month.year}</span>
          <button onClick={nextMonth} className="h-7 w-7 flex items-center justify-center rounded-md" style={{ background: 'var(--theme-bg-tertiary)' }}>
            <span style={{ color: 'var(--theme-text-muted)' }}>→</span>
          </button>
        </div>
        <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {periodStart} → {periodEnd}
        </span>
      </div>

      {/* Expense table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06)' }}>
        <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader title="Chi phí xe" icon={DollarSign} />
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
            <Plus size={14} strokeWidth={2.25} /><span>Thêm chi phí</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
          </div>
        ) : byVehicle.size === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}>
              <DollarSign className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có chi phí trong kỳ này</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Biển số <InfoTip text="Chi phí riêng của từng xe" /></th>
                  {CATEGORIES.map(c => (
                    <th key={c.key} className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>{c.label}</th>
                  ))}
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tổng</th>
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
                      <td className="px-4 py-2.5">
                        {isChung ? (
                          <span className="text-xs font-semibold" style={{ color: 'var(--theme-status-warning)' }}>CP Chung <InfoTip text="Phân bổ đều cho tất cả xe" /></span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider"
                            style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}>{plate}</span>
                        )}
                      </td>
                      {CATEGORIES.map(c => (
                        <td key={c.key} className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums whitespace-nowrap"
                          style={{ color: cats[c.key] > 0 ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>
                          {cats[c.key] > 0 ? formatCurrency(cats[c.key]) : '—'}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right text-xs font-extrabold tabular-nums whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create expense dialog */}
      <Dialog open={showCreate} onOpenChange={() => setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm chi phí</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại chi phí</Label>
              <div className="flex gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.key} type="button" onClick={() => setNewExpense(p => ({ ...p, category: c.key }))}
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
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

// ─── Main Transporters Page ──────────────────────────────────────────
export function TransportersPage() {
  return (
    <AccountantPageShell title="Vận tải" subtitle="Quản lý xe, địa điểm và chi phí" icon={Truck}>
      <Tabs defaultValue="vehicles">
        <TabsList className="w-full mb-4" style={{ background: 'var(--theme-bg-secondary)' }}>
          <TabsTrigger value="vehicles" className="flex-1 gap-1.5 text-xs">
            <Truck className="h-3.5 w-3.5" />Xe
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex-1 gap-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5" />Địa điểm
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 gap-1.5 text-xs">
            <DollarSign className="h-3.5 w-3.5" />Chi phí
          </TabsTrigger>
        </TabsList>
        <TabsContent value="vehicles"><VehiclesTab /></TabsContent>
        <TabsContent value="locations"><LocationsTab /></TabsContent>
        <TabsContent value="expenses"><ExpensesTab /></TabsContent>
      </Tabs>
    </AccountantPageShell>
  )
}
