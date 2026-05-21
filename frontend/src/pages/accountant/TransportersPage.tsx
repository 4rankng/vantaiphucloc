import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Truck, Plus, User, X, Users, Search, Building2,
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
import { InfoTip } from '@/components/shared/InfoTip'
import {
  useDrivers,
  useVehicleDrivers,
  useAddVehicleDriver,
  useRemoveVehicleDriver,
  useCreateVehicle,
  useCreateDriver,
  useUpdateDriver,
  useVehicles,
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useQueryClient } from '@tanstack/react-query'
import type { Driver, Vendor } from '@/data/domain'
import { api } from '@/services/api/client'
import { fuzzyMatch } from '@/lib/search-utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH = 15
const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/
const EMPTY_VENDOR_FORM = { name: '', type: 'company' as const, phone: '', taxCode: '', address: '', contactPerson: '' }

// ─── Infinite scroll hook ─────────────────────────────────────────────────────

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
  vendorId: number | null
  drivers: { id: number; driverId: number; driverName: string }[]
}

function groupByVehicle(
  rows: { id: number; vehicleId: number; vehiclePlate: string; driverId: number; driverName: string }[],
  vehicles: { id: number; plate: string; vendorId?: number | null }[],
): VehicleGroup[] {
  const map = new Map<number, VehicleGroup>()
  for (const r of rows) {
    if (!map.has(r.vehicleId)) {
      map.set(r.vehicleId, { vehicleId: r.vehicleId, plate: r.vehiclePlate, vendorId: null, drivers: [] })
    }
    map.get(r.vehicleId)!.drivers.push({ id: r.id, driverId: r.driverId, driverName: r.driverName })
  }
  for (const v of vehicles) {
    if (!map.has(v.id)) {
      map.set(v.id, { vehicleId: v.id, plate: v.plate, vendorId: v.vendorId ?? null, drivers: [] })
    } else {
      map.get(v.id)!.vendorId = v.vendorId ?? null
    }
  }
  return [...map.values()].sort((a, b) => a.plate.localeCompare(b.plate))
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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

// ─── Driver row ───────────────────────────────────────────────────────────────

function DriverRow({ driver, vendorName, onOpenDetail }: { driver: Driver; vendorName?: string; onOpenDetail: () => void }) {
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
      <td>
        <span className="text-[13px]" style={{ color: vendorName ? 'var(--ink-2)' : 'var(--ink-3)' }}>
          {vendorName ?? '—'}
        </span>
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

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main fleet section ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function FleetSection() {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: vdRows = [], isLoading: vdLoading } = useVehicleDrivers()
  const { data: driversList = [], isLoading: driversLoading } = useDrivers()
  const { data: vehicles = [] } = useVehicles()
  const { data: vendors = [] } = useVendors()

  const createVehicle = useCreateVehicle()
  const createDriver = useCreateDriver()
  const addVehicleDriver = useAddVehicleDriver()
  const removeVehicleDriver = useRemoveVehicleDriver()

  // Vendor lookup maps
  const vendorMap = useMemo(() => new Map(vendors.map(v => [v.id, v.name])), [vendors])
  const plateVendorMap = useMemo(() => {
    const m = new Map<string, number | null>()
    for (const v of vehicles) m.set(v.plate, v.vendorId ?? null)
    return m
  }, [vehicles])

  const groups = useMemo(() => groupByVehicle(vdRows, vehicles), [vdRows, vehicles])

  const assignedDriverIds = useMemo(() => {
    const set = new Set<number>()
    for (const g of groups) for (const d of g.drivers) set.add(d.driverId)
    return set
  }, [groups])

  const multiDriverVehicles = useMemo(() => groups.filter(g => g.drivers.length > 1).length, [groups])
  const vehiclesWithoutDriver = useMemo(() => groups.filter(g => g.drivers.length === 0).length, [groups])
  const driversWithoutVehicle = Math.max(0, driversList.length - assignedDriverIds.size)

  const [fleetSearch, setFleetSearch] = useState('')
  const [fleetLimit, setFleetLimit] = useState(BATCH)
  const [driverSearch, setDriverSearch] = useState('')
  const [driverLimit, setDriverLimit] = useState(BATCH)

  useEffect(() => { setFleetLimit(BATCH) }, [fleetSearch])
  useEffect(() => { setDriverLimit(BATCH) }, [driverSearch])

  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newPlate, setNewPlate] = useState('')
  const [showCreateDriver, setShowCreateDriver] = useState(false)
  const [editDriver, setEditDriver] = useState<Driver | null>(null)
  const [addingDriverFor, setAddingDriverFor] = useState<number | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
  const [removeDriverTarget, setRemoveDriverTarget] = useState<{ vdId: number; name: string } | null>(null)

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
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatPill count={groups.length} label=" phương tiện" accent />
        <StatPill count={driversList.length} label=" lái xe" />
        {multiDriverVehicles > 0 && <StatPill count={multiDriverVehicles} label=" xe ghép lái" />}
        {vehiclesWithoutDriver > 0 && <StatPill count={vehiclesWithoutDriver} label=" xe chưa có lái" />}
        {driversWithoutVehicle > 0 && <StatPill count={driversWithoutVehicle} label=" lái chưa có xe" />}
      </div>

      {/* Two-column on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Phương tiện */}
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
                  <table className="nepo-table w-full" style={{ minWidth: 400, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left" style={{ width: 120 }}>Biển số</th>
                        <th className="text-left">Lái xe</th>
                        <th className="text-left">Công ty</th>
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
                          <td>
                            <span className="text-[13px]" style={{ color: g.vendorId ? 'var(--ink-2)' : 'var(--ink-3)' }}>
                              {g.vendorId ? (vendorMap.get(g.vendorId) ?? '—') : '—'}
                            </span>
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

        {/* Lái xe */}
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
                  <table className="nepo-table w-full" style={{ minWidth: 420, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }} />
                        <th className="text-left">Họ tên</th>
                        <th className="text-left">SĐT</th>
                        <th className="text-left">Biển số</th>
                        <th className="text-left">Công ty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDrivers.map((d) => {
                        const vId = d.vehiclePlate ? (plateVendorMap.get(d.vehiclePlate) ?? null) : null
                        const vendorName = vId ? (vendorMap.get(vId) ?? undefined) : undefined
                        return (
                          <DriverRow key={d.id} driver={d} vendorName={vendorName} onOpenDetail={() => setEditDriver(d)} />
                        )
                      })}
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

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Vendor management drawer ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function VendorManagementDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const { data: vendors = [], isLoading } = useVendors()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Vendor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [detailTarget, setDetailTarget] = useState<Vendor | null>(null)

  const [limit, setLimit] = useState(BATCH)
  useEffect(() => { setLimit(BATCH) }, [search])

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return vendors
    return vendors.filter(p => fuzzyMatch(p.name, q) || fuzzyMatch(p.phone ?? '', q) || fuzzyMatch(p.taxCode ?? '', q))
  }, [vendors, search])

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit])
  const hasMore = limit < filtered.length
  const loadMore = useCallback(() => setLimit(n => n + BATCH), [])
  const sentinel = useInfiniteScroll(loadMore)

  const companyCount = vendors.filter(v => v.type === 'company').length
  const individualCount = vendors.filter(v => v.type !== 'company').length

  const handleCreate = useCallback((data: typeof EMPTY_VENDOR_FORM) => {
    createVendor.mutate(data, {
      onSuccess: () => { toast.success('Đã thêm nhà thầu'); setShowCreate(false) },
      onError: () => toast.error('Không thể thêm nhà thầu'),
    })
  }, [createVendor, toast])

  const handleUpdate = useCallback((data: typeof EMPTY_VENDOR_FORM) => {
    if (!editTarget) return
    updateVendor.mutate({ id: editTarget.id, data }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setEditTarget(null) },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [editTarget, updateVendor, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteVendor.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setDetailTarget(null) },
      onError: () => toast.error('Không thể xoá'),
    })
  }, [deleteTarget, deleteVendor, toast])

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(o) => { if (!o) onClose() }}
        breadcrumb="Vận tải"
        title="Quản lý nhà thầu"
        width="820px"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <StatPill count={vendors.length} label=" nhà thầu" accent />
              <StatPill count={companyCount} label=" công ty" />
              <StatPill count={individualCount} label=" cá nhân" />
            </div>
            <Button variant="default" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Thêm nhà thầu
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, MST, SĐT…" />
          </div>

          <Panel flush>
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10">
                <EmptyState
                  icon={<Building2 className="h-5 w-5" />}
                  title={search.trim() ? 'Không tìm thấy nhà thầu' : 'Chưa có nhà thầu nào'}
                  compact
                  action={!search.trim() ? (
                    <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
                      <Plus size={14} strokeWidth={2.25} /><span>Thêm nhà thầu</span>
                    </button>
                  ) : undefined}
                />
              </div>
            ) : (
              <>
                <div className="nepo-table-scroll overflow-x-auto">
                  <table className="nepo-table w-full" style={{ minWidth: 600, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 48 }} />
                        <th className="text-left">Tên nhà thầu</th>
                        <th className="text-left">Loại</th>
                        <th className="text-left">SĐT</th>
                        <th className="text-left">Địa chỉ</th>
                        <th className="text-left">Liên hệ</th>
                        <th className="text-left">MST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((v) => (
                        <VendorRow key={v.id} vendor={v} onOpenDetail={() => setDetailTarget(v)} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <LoadMoreSentinel sentinelRef={sentinel} hasMore={hasMore} />
              </>
            )}
          </Panel>
        </div>
      </Drawer>

      {/* Sub-drawers rendered outside parent Drawer to avoid z-index stacking */}
      {detailTarget && !editTarget && (
        <VendorDetailDrawer
          vendor={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => setEditTarget(detailTarget)}
          onDelete={() => { setDeleteTarget(detailTarget); setDetailTarget(null) }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá nhà thầu"
        description={`"${deleteTarget?.name}" sẽ bị xoá vĩnh viễn và không thể khôi phục.`}
        confirmLabel="Xoá"
        variant="warning"
      />

      <VendorFormDrawer open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate}
        title="Thêm nhà thầu đội xe" isPending={createVendor.isPending} />
      <VendorFormDrawer
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        title="Cập nhật nhà thầu"
        isPending={updateVendor.isPending}
        initial={editTarget ? {
          name: editTarget.name,
          type: editTarget.type ?? 'company',
          phone: editTarget.phone ?? '',
          taxCode: editTarget.taxCode ?? '',
          address: editTarget.address ?? '',
          contactPerson: editTarget.contactPerson ?? '',
        } : undefined}
      />
    </>
  )
}

// ─── Vendor row ───────────────────────────────────────────────────────────────

function VendorRow({ vendor, onOpenDetail }: { vendor: Vendor; onOpenDetail: () => void }) {
  const initials = vendor.name.slice(0, 2).toUpperCase()
  return (
    <tr onClick={onOpenDetail} className="cursor-pointer">
      <td>
        <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {initials}
        </div>
      </td>
      <td><span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{vendor.name}</span></td>
      <td>
        <span className="text-[12px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
          {vendor.type === 'company' ? 'Công ty' : 'Cá nhân'}
        </span>
      </td>
      <td><span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.phone || '—'}</span></td>
      <td><span className="text-[13px] line-clamp-1" style={{ color: 'var(--ink-2)' }}>{vendor.address || '—'}</span></td>
      <td><span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.contactPerson || '—'}</span></td>
      <td><span className="text-[13px] font-medium tabular-nums" style={{ color: 'var(--ink)' }}>{vendor.taxCode || '—'}</span></td>
    </tr>
  )
}

// ─── Vendor form drawer ───────────────────────────────────────────────────────

function VendorFormDrawer({ open, onClose, onSave, title, initial, isPending }: {
  open: boolean; onClose: () => void; onSave: (data: typeof EMPTY_VENDOR_FORM) => void
  title: string; initial?: Partial<typeof EMPTY_VENDOR_FORM>; isPending?: boolean
}) {
  const [form, setForm] = useState({ ...EMPTY_VENDOR_FORM, ...initial })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => { setForm({ ...EMPTY_VENDOR_FORM, ...initial }) }, [JSON.stringify(initial)]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const errs: Record<string, string> = {}
    if (form.phone && !VN_PHONE_RE.test(form.phone.replace(/[\s-]/g, ''))) errs.phone = 'SĐT không hợp lệ'
    if (form.taxCode && !VN_TAX_RE.test(form.taxCode)) errs.taxCode = 'MST phải 10 hoặc 13 chữ số'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave({ ...form, name: form.name.trim() })
  }

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose() }} breadcrumb="Nhà thầu đội xe" title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="default" onClick={handleSave} disabled={!form.name.trim() || !!isPending}>
            {isPending ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="vnd-name">
              Tên nhà thầu <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input id="vnd-name" value={form.name} onChange={e => updateField('name', e.target.value)}
              placeholder="Tên nhà thầu" className="nepo-input" autoFocus />
          </div>
          <div>
            <label className="nepo-field-label">Loại</label>
            <div className="flex gap-1">
              {(['company', 'individual'] as const).map(t => (
                <button key={t} type="button" onClick={() => updateField('type', t)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: form.type === t ? 'var(--accent)' : 'var(--surface-3)',
                    color: form.type === t ? '#fff' : 'var(--ink-2)',
                  }}
                >{t === 'company' ? 'Công ty' : 'Cá nhân'}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="vnd-phone">Điện thoại</label>
            <input id="vnd-phone" type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)}
              placeholder="0901234567" className="nepo-input" />
            {errors.phone && <p className="text-[11px] mt-1" style={{ color: 'var(--accent)' }}>{errors.phone}</p>}
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="vnd-tax">
              Mã số thuế <InfoTip text="10 hoặc 13 chữ số" />
            </label>
            <input id="vnd-tax" value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)}
              placeholder="0123456789" className="nepo-input" />
            {errors.taxCode && <p className="text-[11px] mt-1" style={{ color: 'var(--accent)' }}>{errors.taxCode}</p>}
          </div>
        </div>
        <div>
          <label className="nepo-field-label" htmlFor="vnd-addr">Địa chỉ</label>
          <input id="vnd-addr" value={form.address} onChange={e => updateField('address', e.target.value)}
            placeholder="Địa chỉ" className="nepo-input" />
        </div>
        <div>
          <label className="nepo-field-label" htmlFor="vnd-contact">Người liên hệ</label>
          <input id="vnd-contact" value={form.contactPerson} onChange={e => updateField('contactPerson', e.target.value)}
            placeholder="Họ tên người liên hệ" className="nepo-input" />
        </div>
      </div>
    </Drawer>
  )
}

// ─── Vendor detail drawer ─────────────────────────────────────────────────────

function VendorDetailDrawer({ vendor, onClose, onEdit, onDelete }: {
  vendor: Vendor; onClose: () => void; onEdit: () => void; onDelete: () => void
}) {
  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Nhà thầu đội xe" title={vendor.name} meta={vendor.taxCode || undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onDelete}
            style={{ color: 'var(--accent)', marginRight: 'auto' }}>Xoá</Button>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button variant="default" onClick={onEdit}>Sửa</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label">Loại</label>
            <p className="text-[13px]" style={{ color: 'var(--ink)' }}>
              {vendor.type === 'company' ? 'Công ty' : 'Cá nhân'}
            </p>
          </div>
          <div>
            <label className="nepo-field-label">SĐT</label>
            <p className="text-[13px]" style={{ color: vendor.phone ? 'var(--ink)' : 'var(--ink-3)' }}>
              {vendor.phone || '—'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label">MST</label>
            <p className="text-[13px]" style={{ color: vendor.taxCode ? 'var(--ink)' : 'var(--ink-3)' }}>
              {vendor.taxCode || '—'}
            </p>
          </div>
          <div>
            <label className="nepo-field-label">Liên hệ</label>
            <p className="text-[13px]" style={{ color: vendor.contactPerson ? 'var(--ink)' : 'var(--ink-3)' }}>
              {vendor.contactPerson || '—'}
            </p>
          </div>
        </div>
        <div>
          <label className="nepo-field-label">Địa chỉ</label>
          <p className="text-[13px]" style={{ color: vendor.address ? 'var(--ink)' : 'var(--ink-3)' }}>
            {vendor.address || '—'}
          </p>
        </div>
      </div>
    </Drawer>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Page ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function TransportersPage() {
  const [showVendorMgmt, setShowVendorMgmt] = useState(false)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="typo-display">Vận tải</h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
            Quản lý đội xe nội bộ và nhà thầu vận chuyển
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowVendorMgmt(true)} className="shrink-0 mt-1">
          <Building2 className="h-4 w-4" />
          Quản lý nhà thầu
        </Button>
      </header>

      {/* ── Fleet section ── */}
      <FleetSection />

      {/* ── Vendor management drawer ── */}
      <VendorManagementDrawer open={showVendorMgmt} onClose={() => setShowVendorMgmt(false)} />
    </div>
  )
}
