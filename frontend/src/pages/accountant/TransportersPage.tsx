import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Truck, Plus, User, X, Users, Search,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button,
} from '@/components/ui'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { Panel } from '@/components/shared/Panel'
import { Plate } from '@/components/shared/Plate'
import { EmptyState } from '@/components/shared/EmptyState'
import { Drawer } from '@/components/shared/Drawer'
import { InlineSelect } from '@/components/shared/InlineSelect'
import {
  useDrivers,
  useVehicleDrivers,
  useAddVehicleDriver,
  useRemoveVehicleDriver,
  useCreateVehicle,
  useCreateDriver,
  useUpdateDriver,
  useVehicles,
} from '@/hooks/use-queries'
import { useDriverBaseSalaryForm } from '@/components/payroll/useDriverBaseSalaryForm'
import { useToast } from '@/components/atoms/Toast'
import { useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@/data/domain'
import type { Driver } from '@/data/domain'
import { api } from '@/services/api/client'
import { fuzzyMatch } from '@/lib/search-utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH = 15

// ─── Infinite scroll hook ─────────────────────────────────────────────────────
// Watches a sentinel element; when it enters the viewport, calls onLoadMore.

function useInfiniteScroll(onLoadMore: () => void) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore() },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onLoadMore])

  return sentinelRef
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

interface VehicleGroup {
  vehicleId: number
  plate: string
  drivers: { id: number; driverId: number; driverName: string }[]
}

function groupByVehicle(
  rows: { id: number; vehicleId: number; vehiclePlate: string; driverId: number; driverName: string }[],
  vehicles: { id: number; plate: string }[],
): VehicleGroup[] {
  const map = new Map<number, VehicleGroup>()
  for (const r of rows) {
    if (!map.has(r.vehicleId)) {
      map.set(r.vehicleId, { vehicleId: r.vehicleId, plate: r.vehiclePlate, drivers: [] })
    }
    map.get(r.vehicleId)!.drivers.push({ id: r.id, driverId: r.driverId, driverName: r.driverName })
  }
  for (const v of vehicles) {
    if (!map.has(v.id)) {
      map.set(v.id, { vehicleId: v.id, plate: v.plate, drivers: [] })
    }
  }
  return [...map.values()].sort((a, b) => a.plate.localeCompare(b.plate))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ count, label, accent }: { count: number; label: string; accent?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
      style={{
        background: accent ? 'var(--accent-soft)' : 'var(--surface-3)',
        color: accent ? 'var(--accent)' : 'var(--ink-2)',
      }}
    >
      <span className="tabular-nums font-bold" style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}>{count}</span>
      {label}
    </span>
  )
}

function SectionHeader({ icon, title, count, action }: {
  icon: React.ReactNode
  title: string
  count: number
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: 'var(--ink-2)' }}>{icon}</span>
      <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <span
        className="tabular-nums text-[11.5px] font-semibold rounded-full px-2 py-0.5"
        style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
      >
        {count}
      </span>
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="relative" style={{ width: 220, flexShrink: 0 }}>
      <Search
        className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
        style={{ left: 10, color: 'var(--ink-3)' }}
      />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="nepo-input text-[13px]"
        style={{ paddingLeft: 32 }}
      />
    </div>
  )
}

/** Thin sentinel row shown at the end of a table while more rows exist */
function LoadMoreSentinel({ sentinelRef, hasMore }: {
  sentinelRef: React.RefObject<HTMLDivElement>
  hasMore: boolean
}) {
  if (!hasMore) return null
  return (
    <div ref={sentinelRef} className="flex justify-center py-3">
      <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Đang tải…</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TransportersPage() {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: vdRows = [], isLoading: vdLoading } = useVehicleDrivers()
  const { data: driversList = [], isLoading: driversLoading } = useDrivers()
  const { data: vehicles = [] } = useVehicles()

  const createVehicle = useCreateVehicle()
  const createDriver = useCreateDriver()
  const updateDriver = useUpdateDriver()
  const addVehicleDriver = useAddVehicleDriver()
  const removeVehicleDriver = useRemoveVehicleDriver()

  const groups = useMemo(() => groupByVehicle(vdRows, vehicles), [vdRows, vehicles])

  const assignedDriverIds = useMemo(() => {
    const set = new Set<number>()
    for (const g of groups) for (const d of g.drivers) set.add(d.driverId)
    return set
  }, [groups])

  const multiDriverVehicles = useMemo(() => groups.filter(g => g.drivers.length > 1).length, [groups])
  const vehiclesWithoutDriver = useMemo(() => groups.filter(g => g.drivers.length === 0).length, [groups])
  const driversWithoutVehicle = Math.max(0, driversList.length - assignedDriverIds.size)

  // Fleet filters + infinite scroll
  const [fleetSearch, setFleetSearch] = useState('')
  const [fleetLimit, setFleetLimit] = useState(BATCH)

  // Driver filters + infinite scroll
  const [driverSearch, setDriverSearch] = useState('')
  const [driverLimit, setDriverLimit] = useState(BATCH)

  // Reset limits when filters change
  useEffect(() => { setFleetLimit(BATCH) }, [fleetSearch])
  useEffect(() => { setDriverLimit(BATCH) }, [driverSearch])

  // Dialogs
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newPlate, setNewPlate] = useState('')
  const [showCreateDriver, setShowCreateDriver] = useState(false)
  const [editDriver, setEditDriver] = useState<Driver | null>(null)
  const [addingDriverFor, setAddingDriverFor] = useState<number | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
  const [removeDriverTarget, setRemoveDriverTarget] = useState<{ vdId: number; name: string } | null>(null)

  // Filtered fleet
  const filteredGroups = useMemo(() => {
    const q = fleetSearch.trim()
    if (!q) return groups
    return groups.filter(g =>
      fuzzyMatch(g.plate, q) || g.drivers.some(d => fuzzyMatch(d.driverName, q)),
    )
  }, [groups, fleetSearch])

  const visibleGroups = filteredGroups.slice(0, fleetLimit)
  const fleetHasMore = fleetLimit < filteredGroups.length
  const loadMoreFleet = useCallback(() => setFleetLimit(n => n + BATCH), [])
  const fleetSentinel = useInfiniteScroll(loadMoreFleet)

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim()
    if (!q) return driversList
    return driversList.filter(d =>
      fuzzyMatch(d.fullName ?? d.username, q) ||
      fuzzyMatch(d.phone ?? '', q) ||
      fuzzyMatch(d.vehiclePlate ?? '', q),
    )
  }, [driversList, driverSearch])

  const visibleDrivers = filteredDrivers.slice(0, driverLimit)
  const driverHasMore = driverLimit < filteredDrivers.length
  const loadMoreDrivers = useCallback(() => setDriverLimit(n => n + BATCH), [])
  const driverSentinel = useInfiniteScroll(loadMoreDrivers)

  // Handlers
  const handleAddVehicle = () => {
    if (!newPlate.trim()) return
    createVehicle.mutate({ plate: newPlate.trim().toUpperCase() }, {
      onSuccess: () => { toast.success('Đã thêm xe'); setNewPlate(''); setShowAddVehicle(false) },
      onError: () => toast.error('Không thể thêm xe'),
    })
  }

  const handleCreateDriver = async (data: { username: string; fullName: string; phone: string; plate: string }) => {
    createDriver.mutate({ username: data.username, fullName: data.fullName, phone: data.phone }, {
      onSuccess: async (newDriver) => {
        if (data.plate.trim() && newDriver?.id) {
          try { await api.put(`/drivers/${newDriver.id}/vehicle`, { plate: data.plate.trim() }) } catch {}
        }
        toast.success('Đã thêm lái xe')
        setShowCreateDriver(false)
        qc.invalidateQueries({ queryKey: ['drivers'] })
      },
      onError: () => toast.error('Không thể thêm lái xe'),
    })
  }

  const handleAddDriverToVehicle = () => {
    if (!addingDriverFor || !selectedDriverId) return
    addVehicleDriver.mutate({ vehicleId: addingDriverFor, driverId: selectedDriverId }, {
      onSuccess: () => { toast.success('Đã thêm lái xe'); setAddingDriverFor(null); setSelectedDriverId(null) },
      onError: () => toast.error('Không thể thêm lái xe'),
    })
  }

  const confirmRemoveDriver = () => {
    if (!removeDriverTarget) return
    removeVehicleDriver.mutate(removeDriverTarget.vdId, {
      onSuccess: () => { toast.success('Đã gỡ lái xe'); setRemoveDriverTarget(null) },
      onError: () => toast.error('Không thể gỡ lái xe'),
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <header>
        <h1 className="typo-display">Đội xe</h1>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <StatPill count={groups.length} label=" phương tiện" accent />
          <StatPill count={driversList.length} label=" lái xe" />
          {multiDriverVehicles > 0 && <StatPill count={multiDriverVehicles} label=" xe ghép lái" />}
          {vehiclesWithoutDriver > 0 && <StatPill count={vehiclesWithoutDriver} label=" xe chưa có lái" />}
          {driversWithoutVehicle > 0 && <StatPill count={driversWithoutVehicle} label=" lái chưa có xe" />}
        </div>
      </header>

      {/* ── Two-column on lg+, stacked below ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Phương tiện ── */}
        <section>
          <SectionHeader
            icon={<Truck className="h-4 w-4" />}
            title="Phương tiện"
            count={filteredGroups.length}
            action={
              <Button variant="default" onClick={() => setShowAddVehicle(true)}>
                <Plus className="h-4 w-4" /> Thêm xe
              </Button>
            }
          />
          <div className="mb-3">
            <SearchInput value={fleetSearch} onChange={setFleetSearch} placeholder="Tìm biển số, lái xe…" />
          </div>
          <Panel flush>
            {vdLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-10">
                <EmptyState
                  icon={<Truck className="h-5 w-5" />}
                  title={fleetSearch ? 'Không tìm thấy xe nào' : 'Chưa có xe nào'}
                  compact
                />
              </div>
            ) : (
              <>
                <div className="nepo-table-scroll overflow-x-auto">
                  <table className="nepo-table w-full" style={{ minWidth: 360, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left" style={{ width: 130 }}>Biển số</th>
                        <th className="text-left">Lái xe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleGroups.map((g) => (
                        <tr key={g.vehicleId}>
                          <td><Plate>{g.plate}</Plate></td>
                          <td>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {g.drivers.length === 0 ? (
                                <span className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>—</span>
                              ) : g.drivers.map(d => (
                                <span key={d.id} className="nepo-driver-chip"
                                  style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
                                  <User className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]">{d.driverName}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setRemoveDriverTarget({ vdId: d.id, name: d.driverName }) }}
                                    className="nepo-driver-chip__x"
                                    style={{ color: 'var(--ink-2)' }}
                                    aria-label="Gỡ lái xe"
                                  ><X className="h-2.5 w-2.5" /></button>
                                </span>
                              ))}
                              <button
                                type="button"
                                onClick={() => { setAddingDriverFor(g.vehicleId); setSelectedDriverId(null) }}
                                className="nepo-driver-chip-add" aria-label="Thêm lái xe"
                              ><Plus className="h-3 w-3" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <LoadMoreSentinel sentinelRef={fleetSentinel} hasMore={fleetHasMore} />
              </>
            )}
          </Panel>
        </section>

        {/* ── Lái xe ── */}
        <section>
          <SectionHeader
            icon={<Users className="h-4 w-4" />}
            title="Lái xe"
            count={filteredDrivers.length}
            action={
              <Button variant="default" onClick={() => setShowCreateDriver(true)}>
                <Plus className="h-4 w-4" /> Thêm lái xe
              </Button>
            }
          />
          <div className="mb-3">
            <SearchInput value={driverSearch} onChange={setDriverSearch} placeholder="Tìm tên, SĐT, biển số…" />
          </div>
          <Panel flush>
            {driversLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
                ))}
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="py-10">
                <EmptyState
                  icon={<Users className="h-5 w-5" />}
                  title={driverSearch.trim() ? 'Không tìm thấy lái xe' : 'Chưa có lái xe nào'}
                  compact
                />
              </div>
            ) : (
              <>
                <div className="nepo-table-scroll overflow-x-auto">
                  <table className="nepo-table w-full" style={{ minWidth: 380, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left" style={{ width: 40 }} />
                        <th className="text-left">Họ tên</th>
                        <th className="text-left">SĐT</th>
                        <th className="text-left">Biển số</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDrivers.map((d) => (
                        <DriverRow key={d.id} driver={d} onOpenDetail={() => setEditDriver(d)} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <LoadMoreSentinel sentinelRef={driverSentinel} hasMore={driverHasMore} />
              </>
            )}
          </Panel>
        </section>

      </div>

      {/* ── Add Vehicle Dialog ── */}
      <Dialog open={showAddVehicle} onOpenChange={() => setShowAddVehicle(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm xe mới</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="nepo-field-label" htmlFor="new-plate">Biển số</label>
              <input
                id="new-plate" value={newPlate} onChange={e => setNewPlate(e.target.value)}
                placeholder="15C-12345" className="nepo-input" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleAddVehicle() }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddVehicle(false)}>Huỷ</Button>
            <Button variant="default" onClick={handleAddVehicle} disabled={!newPlate.trim() || createVehicle.isPending}>
              Thêm xe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Driver Dialog ── */}
      <Dialog open={addingDriverFor !== null} onOpenChange={() => setAddingDriverFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gán lái xe</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-2">
            <label className="nepo-field-label">Chọn lái xe</label>
            <div className="max-h-64 overflow-y-auto" style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}>
              {driversList.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>Chưa có lái xe nào</p>
                </div>
              ) : driversList.map((d: Driver, i: number) => (
                <button key={d.id} type="button" onClick={() => setSelectedDriverId(d.id)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors"
                  style={{
                    borderBottom: i < driversList.length - 1 ? '1px solid var(--line)' : 'none',
                    background: selectedDriverId === d.id ? 'var(--accent-soft)' : 'transparent',
                  }}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: selectedDriverId === d.id ? 'var(--accent)' : 'var(--surface-3)',
                      color: selectedDriverId === d.id ? '#fff' : 'var(--ink-2)',
                    }}
                  ><User className="h-3.5 w-3.5" /></div>
                  <span className="flex-1 text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>
                    {d.fullName ?? d.username}
                  </span>
                  {d.vehiclePlate && <Plate>{d.vehiclePlate}</Plate>}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddingDriverFor(null)}>Huỷ</Button>
            <Button variant="default" onClick={handleAddDriverToVehicle} disabled={!selectedDriverId}>Gán</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Driver Drawers ── */}
      {showCreateDriver && (
        <DriverFormDrawer onSave={handleCreateDriver} onClose={() => setShowCreateDriver(false)} isPending={createDriver.isPending} />
      )}
      {editDriver && (
        <DriverEditDrawer driver={editDriver} onClose={() => setEditDriver(null)} />
      )}

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

// ─── Driver row ───────────────────────────────────────────────────────────────

function DriverRow({ driver, onOpenDetail }: { driver: Driver; onOpenDetail: () => void }) {
  const initials = (driver.fullName ?? driver.username).slice(0, 2).toUpperCase()
  return (
    <tr onClick={onOpenDetail} className="cursor-pointer">
      <td>
        <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {initials}
        </div>
      </td>
      <td><span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{driver.fullName || driver.username}</span></td>
      <td><span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{driver.phone || '—'}</span></td>
      <td>
        {driver.vehiclePlate
          ? <Plate>{driver.vehiclePlate}</Plate>
          : <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>—</span>}
      </td>
    </tr>
  )
}

// ─── Driver form drawers ──────────────────────────────────────────────────────

function DriverFormDrawer({ onSave, onClose, isPending }: {
  onSave: (data: { username: string; fullName: string; phone: string; plate: string }) => void
  onClose: () => void
  isPending: boolean
}) {
  const { data: vehicles = [] } = useVehicles()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [plate, setPlate] = useState('')
  const [plateInput, setPlateInput] = useState('')
  const showCreatePlate = plateInput.trim() && !vehicles.some(v => v.plate.toLowerCase() === plateInput.toLowerCase().trim())

  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose() }} breadcrumb="Đội xe" title="Thêm lái xe"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="default"
            onClick={() => onSave({ username, fullName, phone, plate: plateInput.trim() || plate.trim() })}
            disabled={!username.trim() || isPending}>
            {isPending ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="drv-username">Tên đăng nhập</label>
            <input id="drv-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="taixe1" className="nepo-input" autoFocus />
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="drv-fullname">Họ và tên</label>
            <input id="drv-fullname" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className="nepo-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="drv-phone">Số điện thoại</label>
            <input id="drv-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912345678" className="nepo-input" />
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="drv-plate">Biển số xe</label>
            <InlineSelect
              placeholder="Chọn hoặc nhập" value={plate}
              options={vehicles.map(v => ({ value: v.plate, label: v.plate }))}
              onChange={v => setPlate(v)} onInputChange={v => setPlateInput(v)}
              onCreateNew={showCreatePlate ? () => setPlate(plateInput.trim()) : undefined}
              createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined}
            />
          </div>
        </div>
      </div>
    </Drawer>
  )
}

function DriverEditDrawer({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const updateDriverMutation = useUpdateDriver()
  const { data: vehicles = [] } = useVehicles()
  const [fullName, setFullName] = useState(driver.fullName ?? '')
  const [username, setUsername] = useState(driver.username)
  const [phone, setPhone] = useState(driver.phone ?? '')
  const [selectedPlate, setSelectedPlate] = useState(driver.vehiclePlate ?? '')
  const [plateInput, setPlateInput] = useState('')
  const showCreatePlate = plateInput.trim() && !vehicles.some(v => v.plate.toLowerCase() === plateInput.toLowerCase().trim())
  const hasChanges = fullName !== (driver.fullName ?? '') || username !== driver.username || phone !== (driver.phone ?? '') || selectedPlate !== (driver.vehiclePlate ?? '')

  const handleSave = async () => {
    try {
      const updates: Record<string, string> = {}
      if (fullName !== (driver.fullName ?? '')) updates.full_name = fullName
      if (username !== driver.username) updates.username = username
      if (phone !== (driver.phone ?? '')) updates.phone = phone
      if (Object.keys(updates).length > 0) await updateDriverMutation.mutateAsync({ id: driver.id, data: updates })
      if (selectedPlate !== (driver.vehiclePlate ?? '') && selectedPlate) await api.put(`/drivers/${driver.id}/vehicle`, { plate: selectedPlate })
      qc.invalidateQueries({ queryKey: ['drivers'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Đã lưu thay đổi')
      onClose()
    } catch { toast.error('Không thể lưu') }
  }

  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose() }} breadcrumb="Đội xe" title="Sửa lái xe"
      meta={driver.fullName ?? driver.username}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="default" onClick={handleSave} disabled={updateDriverMutation.isPending || !hasChanges}>
            {updateDriverMutation.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="edit-fullname">Họ và tên</label>
            <input id="edit-fullname" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className="nepo-input" autoFocus />
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="edit-username">Tên đăng nhập</label>
            <input id="edit-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="taixe1" className="nepo-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="edit-phone">Số điện thoại</label>
            <input id="edit-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912345678" className="nepo-input" />
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="edit-plate">Biển số xe</label>
            <InlineSelect
              placeholder="Chọn hoặc nhập" value={selectedPlate}
              options={vehicles.map(v => ({ value: v.plate, label: v.plate }))}
              onChange={v => setSelectedPlate(v)} onInputChange={v => setPlateInput(v)}
              onCreateNew={showCreatePlate ? () => setSelectedPlate(plateInput.trim()) : undefined}
              createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined}
            />
          </div>
        </div>
      </div>
    </Drawer>
  )
}
