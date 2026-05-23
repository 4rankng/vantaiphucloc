import { useState, useMemo, useCallback } from 'react'
import {
  Truck, Plus, User, X, Building2, AlertTriangle, Users,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button,
} from '@/components/ui'

import { Panel } from '@/components/shared/Panel'
import { PageHeader } from '@/components/shared/PageHeader'
import { Plate } from '@/components/shared/Plate'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'
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
import { useToast } from '@/components/atoms/Toast'
import { useQueryClient } from '@tanstack/react-query'
import type { Driver } from '@/data/domain'
import { api } from '@/services/api/client'
import { apiClient } from '@/services/api'
import { fuzzyMatch } from '@/lib/search-utils'
import { groupByVehicle } from '@/lib/accounting-utils'
import { VendorManagementDrawer } from '@/components/shared/VendorManagementDrawer'
import { DriverFormDrawer } from '@/components/shared/DriverFormDrawer'
import { DriverRow, DriverEditRow, type DriverRowFormData, type DriverFocusableField } from '@/components/shared/DriverTableRows'
import { StatPill } from '@/components/shared/StatPill'
import { useInfiniteScroll, LoadMoreSentinel, SearchInput } from '@/components/shared/ListUtils'
// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH = 15


// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main fleet section ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function FleetSection() {
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

  const [fleetSearch, setFleetSearch] = useState('')
  const [fleetLimit, setFleetLimit] = useState(BATCH)
  const [driverSearch, setDriverSearch] = useState('')
  const [driverLimit, setDriverLimit] = useState(BATCH)

  const handleFleetSearch = useCallback((q: string) => { setFleetSearch(q); setFleetLimit(BATCH) }, [])
  const handleDriverSearch = useCallback((q: string) => { setDriverSearch(q); setDriverLimit(BATCH) }, [])

  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newPlate, setNewPlate] = useState('')
  const [showCreateDriver, setShowCreateDriver] = useState(false)
  const [addingDriverFor, setAddingDriverFor] = useState<number | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
  const [removeDriverTarget, setRemoveDriverTarget] = useState<{ vdId: number; name: string } | null>(null)

  // Inline driver editing
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null)
  const [editingDriverField, setEditingDriverField] = useState<DriverFocusableField>(null)
  const [savingDriver, setSavingDriver] = useState(false)

  // Password reset
  const [resetPwdDriver, setResetPwdDriver] = useState<Driver | null>(null)
  const [resetPwdSaving, setResetPwdSaving] = useState(false)
  const [resetPwdValue, setResetPwdValue] = useState('')

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
      fuzzyMatch(d.fullName ?? d.username, q) || fuzzyMatch(d.phone ?? '', q) || fuzzyMatch(d.vehiclePlate ?? '', q),
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

  const handleCreateDriver = async (data: { username: string; fullName: string; phone: string; plate: string; password?: string }) => {
    createDriver.mutate({ username: data.username, fullName: data.fullName, phone: data.phone, password: data.password }, {
      onSuccess: async (newDriver) => {
        if (data.plate.trim() && newDriver?.id) {
          try { await api.put(`/drivers/${newDriver.id}/vehicle`, { plate: data.plate.trim() }) } catch { /* non-critical */ }
        }
        toast.success('Đã thêm lái xe')
        setShowCreateDriver(false)
        qc.invalidateQueries({ queryKey: ['drivers'] })
      },
      onError: () => toast.error('Không thể thêm lái xe'),
    })
  }

  const handleUpdateDriver = useCallback(async (driver: Driver, data: DriverRowFormData) => {
    setSavingDriver(true)
    try {
      const updates: Record<string, string> = {}
      if (data.fullName !== (driver.fullName ?? '')) updates.full_name = data.fullName
      if (data.phone !== (driver.phone ?? '')) updates.phone = data.phone
      if (Object.keys(updates).length > 0) {
        await updateDriver.mutateAsync({ id: driver.id, data: updates })
      }
      if (data.plate !== (driver.vehiclePlate ?? '') && data.plate) {
        await api.put(`/drivers/${driver.id}/vehicle`, { plate: data.plate })
      }
      qc.invalidateQueries({ queryKey: ['drivers'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Đã lưu thay đổi')
      setEditingDriverId(null)
    } catch {
      toast.error('Không thể lưu')
    } finally {
      setSavingDriver(false)
    }
  }, [updateDriver, qc, toast])

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

  const handleResetPassword = async () => {
    if (!resetPwdDriver || !resetPwdValue.trim()) return
    setResetPwdSaving(true)
    try {
      await apiClient.resetDriverPassword(resetPwdDriver.id, resetPwdValue.trim())
      toast.success('Đã đổi mật khẩu')
      setResetPwdDriver(null)
      setResetPwdValue('')
    } catch {
      toast.error('Không thể đổi mật khẩu')
    } finally {
      setResetPwdSaving(false)
    }
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
          <div className="flex items-center gap-2 mb-3">
            <SearchInput value={fleetSearch} onChange={handleFleetSearch} placeholder="Tìm biển số, lái xe…" />
            <Button variant="default" onClick={() => setShowAddVehicle(true)}>
              <Plus className="h-4 w-4" /> Thêm xe
            </Button>
          </div>
          <Panel flush>
            {vdLoading ? (
              <TableSkeleton />
            ) : filteredGroups.length === 0 ? (
              <div className="py-10">
                <EmptyState icon={<Truck className="h-5 w-5" />} title={fleetSearch ? 'Không tìm thấy xe nào' : 'Chưa có xe nào'} compact />
              </div>
            ) : (
              <>
                <div className="nepo-table-scroll overflow-x-auto">
                  <table className="nepo-table w-full" style={{ minWidth: 400, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left" style={{ width: 120 }}>Biển số</th>
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

        {/* Lái xe */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SearchInput value={driverSearch} onChange={handleDriverSearch} placeholder="Tìm tên, SĐT, biển số…" />
            <Button variant="default" onClick={() => setShowCreateDriver(true)}>
              <Plus className="h-4 w-4" /> Thêm lái xe
            </Button>
          </div>
          <Panel flush>
            {driversLoading ? (
              <TableSkeleton />
            ) : filteredDrivers.length === 0 ? (
              <div className="py-10">
                <EmptyState icon={<Users className="h-5 w-5" />} title={driverSearch.trim() ? 'Không tìm thấy lái xe' : 'Chưa có lái xe nào'} compact />
              </div>
            ) : (
              <>
                <div className="nepo-table-scroll overflow-x-auto">
                  <table className="nepo-table w-full" style={{ minWidth: 420, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th className="text-left">Họ tên</th>
                        <th className="text-left">Tài khoản</th>
                        <th className="text-left">SĐT</th>
                        <th className="text-left">Biển số</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDrivers.map((d) => {
                        return editingDriverId === d.id ? (
                          <DriverEditRow
                            key={d.id}
                            driver={d}
                            onSave={(data) => handleUpdateDriver(d, data)}
                            onCancel={() => setEditingDriverId(null)}
                            saving={savingDriver}
                            initialFocus={editingDriverField}
                            vehicles={vehicles}
                          />
                        ) : (
                          <DriverRow
                            key={d.id}
                            driver={d}
                            onEdit={(field) => { setEditingDriverId(d.id); setEditingDriverField(field) }}
                            onResetPassword={() => setResetPwdDriver(d)}
                          />
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

      {/* ── Create Driver Drawer ── */}
      {showCreateDriver && (
        <DriverFormDrawer onSave={handleCreateDriver} onClose={() => setShowCreateDriver(false)} isPending={createDriver.isPending} />
      )}

      <Dialog open={!!removeDriverTarget} onOpenChange={() => setRemoveDriverTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gỡ lái xe?</DialogTitle></DialogHeader>
          <div
            className="flex items-start gap-3 rounded-lg px-3 py-2.5"
            style={{
              background: 'color-mix(in srgb, var(--status-error, #e53) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--status-error, #e53) 15%, transparent)',
            }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--status-error, #e53)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
              Gỡ <strong style={{ color: 'var(--ink)' }}>{removeDriverTarget?.name}</strong> khỏi xe này?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDriverTarget(null)} className="flex-1">Huỷ</Button>
            <Button onClick={confirmRemoveDriver} variant="destructive" className="flex-1">Gỡ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ── */}
      <Dialog open={!!resetPwdDriver} onOpenChange={() => { setResetPwdDriver(null); setResetPwdValue('') }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Đổi mật khẩu</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
              Đổi mật khẩu cho <strong style={{ color: 'var(--ink)' }}>{resetPwdDriver?.fullName || resetPwdDriver?.username}</strong>
            </p>
            <input
              className="nepo-input" type="text" placeholder="Mật khẩu mới"
              value={resetPwdValue} onChange={e => setResetPwdValue(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleResetPassword() }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setResetPwdDriver(null); setResetPwdValue('') }}>Huỷ</Button>
            <Button variant="default" onClick={handleResetPassword} disabled={!resetPwdValue.trim() || resetPwdSaving}>
              {resetPwdSaving ? 'Đang lưu...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
      <PageHeader
        title="Vận tải"
        subtitle="Quản lý đội xe, tài xế và nhà thầu vận chuyển"
        lucideIcon={Truck}
        actions={
          <Button variant="outline" onClick={() => setShowVendorMgmt(true)} className="shrink-0 mt-1">
            <Building2 className="h-4 w-4" />
            Quản lý nhà thầu
          </Button>
        }
      />

      {/* ── Fleet section ── */}
      <FleetSection />

      {/* ── Vendor management drawer ── */}
      <VendorManagementDrawer open={showVendorMgmt} onClose={() => setShowVendorMgmt(false)} />
    </div>
  )
}
