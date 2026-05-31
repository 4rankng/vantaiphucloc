import { useState } from 'react'
import { Truck, Plus, User, X, Building2, Users, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui'

import { Panel } from '@/components/shared/overlays/Panel'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { Plate } from '@/components/shared/data-display/Plate'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { VendorManagementDrawer } from '@/components/shared/overlays/VendorManagementDrawer'
import { DriverFormDrawer } from '@/components/shared/overlays/DriverFormDrawer'
import { LoadMoreSentinel, SearchInput } from '@/components/shared/data-display/ListUtils'
import { StatPill } from '@/components/shared/data-display/StatPill'
import { useIsMobile } from '@/hooks/use-mobile'

import { useFleetManager, type FocusState } from '@/hooks/use-fleet-manager'
import type { Driver } from '@/data/domain'

import {
  AddVehicleDialog,
  AssignDriverDialog,
  ResetPasswordDialog,
  DriverEditRow,
  DriverRow,
  DriverMobileCard,
  DriverMobileEditCard,
} from '@/components/shared'
import { DangerConfirmDialog } from '@/components/shared/overlays/DangerConfirmDialog/DangerConfirmDialog'

async function exportDriversXlsx(drivers: import('@/data/domain').Driver[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Vận tải Phúc Lộc'
  wb.created = new Date()

  const ws = wb.addWorksheet('Lái xe', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { fitToPage: true, fitToWidth: 1 },
  })

  ws.columns = [
    { key: 'fullName',     width: 28 },
    { key: 'username',     width: 18 },
    { key: 'phone',        width: 16 },
    { key: 'vehiclePlate', width: 16 },
  ]

  // ── Header row ─────────────────────────────────────────────────────────
  const HEADERS = ['Họ tên', 'Tên đăng nhập', 'SĐT', 'Biển số xe']
  const headerRow = ws.addRow(HEADERS)
  headerRow.height = 24
  headerRow.eachCell((cell) => {
    cell.font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
    cell.border    = {
      bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
    }
  })

  // ── Data rows ───────────────────────────────────────────────────────────
  drivers.forEach((d, i) => {
    const row = ws.addRow([
      d.fullName ?? '',
      d.username,
      d.phone ?? '',
      d.vehiclePlate ?? '',
    ])
    row.height = 20
    const isEven = i % 2 === 0
    row.eachCell((cell) => {
      cell.font      = { size: 10.5 }
      cell.alignment = { vertical: 'middle' }
      cell.fill      = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF0F5FF' },
      }
      cell.border    = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
    })
  })

  // ── Download ────────────────────────────────────────────────────────────
  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `Danh_sach_lai_xe_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

function FleetSection() {
  const isMobile = useIsMobile(768)

  const {
    data: { vehicles, drivers },
    stats: {
      vehicleCount,
      driverCount,
      multiDriverVehicles,
      vehiclesWithoutDriver,
      driversWithoutVehicle,
    },
    fleet: {
      search: fleetSearch,
      setSearch: handleFleetSearch,
      visibleGroups,
      hasMore: fleetHasMore,
      sentinel: fleetSentinel,
    },
    driverList: {
      search: driverSearch,
      setSearch: handleDriverSearch,
      visibleDrivers,
      hasMore: driverHasMore,
      sentinel: driverSentinel,
    },
    actions: {
      addVehicle,
      createDriver,
      updateDriver,
      addDriverToVehicle,
      removeDriver,
      resetPassword,
      deleteVehicle,
      deleteDriver,
    },
    loading: {
      vdLoading,
      driversLoading,
      addVehiclePending,
      createDriverPending,
      savingDriver,
      deleteVehiclePending,
      deleteDriverPending,
    },
  } = useFleetManager()

  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showCreateDriver, setShowCreateDriver] = useState(false)
  const [addingDriverFor, setAddingDriverFor] = useState<number | null>(null)
  const [removeDriverTarget, setRemoveDriverTarget] = useState<{ vdId: number; name: string } | null>(null)
  const [resetPwdDriver, setResetPwdDriver] = useState<Driver | null>(null)
  const [deleteVehicleTarget, setDeleteVehicleTarget] = useState<{ id: number; plate: string } | null>(null)
  const [deleteDriverTarget, setDeleteDriverTarget] = useState<{ id: number; name: string } | null>(null)

  const [editingDriverId, setEditingDriverId] = useState<number | null>(null)
  const [editingDriverField, setEditingDriverField] = useState<FocusState>(null)

  const handleAddVehicleConfirm = async (plate: string) => {
    await addVehicle(plate)
    setShowAddVehicle(false)
  }

  const handleCreateDriverConfirm = async (data: {
    username: string
    fullName: string
    phone: string
    plate: string
    password?: string
  }) => {
    await createDriver(data)
    setShowCreateDriver(false)
  }

  const handleAssignDriverConfirm = async (data: { driverId: number; effectiveFrom: string }) => {
    if (addingDriverFor === null) return
    await addDriverToVehicle(addingDriverFor, data.driverId, data.effectiveFrom)
    setAddingDriverFor(null)
  }

  const handleResetPasswordConfirm = async (data: { username: string; password: string }) => {
    if (!resetPwdDriver) return
    await resetPassword(resetPwdDriver.id, resetPwdDriver.username, data)
    setResetPwdDriver(null)
  }

  const handleRemoveDriverConfirm = async () => {
    if (!removeDriverTarget) return
    await removeDriver(removeDriverTarget.vdId)
    setRemoveDriverTarget(null)
  }

  const handleDeleteVehicleConfirm = async () => {
    if (!deleteVehicleTarget) return
    await deleteVehicle(deleteVehicleTarget.id)
    setDeleteVehicleTarget(null)
  }

  const handleDeleteDriverConfirm = async () => {
    if (!deleteDriverTarget) return
    await deleteDriver(deleteDriverTarget.id)
    setDeleteDriverTarget(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <StatPill count={vehicleCount} label=" phương tiện" accent />
        <StatPill count={driverCount} label=" lái xe" />
        {multiDriverVehicles > 0 && <StatPill count={multiDriverVehicles} label=" xe ghép lái" />}
        {vehiclesWithoutDriver > 0 && <StatPill count={vehiclesWithoutDriver} label=" xe chưa có lái" />}
        {driversWithoutVehicle > 0 && <StatPill count={driversWithoutVehicle} label=" lái chưa có xe" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <SearchInput value={fleetSearch} onChange={handleFleetSearch} placeholder="Tìm biển số, lái xe…" />
            <Button size="sm" onClick={() => setShowAddVehicle(true)}>
              <Plus className="h-4 w-4" /> Thêm xe
            </Button>
          </div>
          <Panel flush>
            {vdLoading ? (
              <TableSkeleton />
            ) : visibleGroups.length === 0 ? (
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
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleGroups.map((g) => (
                        <tr key={g.vehicleId} className="group">
                          <td><Plate>{g.plate}</Plate></td>
                          <td>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {g.drivers.length === 0 ? (
                                <span className="text-[12.5px]" style={{ color: 'var(--ink-3)' }}>—</span>
                              ) : (
                                g.drivers.map((d) => (
                                  <span key={d.id} className="nepo-driver-chip" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
                                    <User className="h-3 w-3" />
                                    <span className="truncate max-w-[120px]">{d.driverName}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setRemoveDriverTarget({ vdId: d.id, name: d.driverName })
                                      }}
                                      className="nepo-driver-chip__x"
                                      style={{ color: 'var(--ink-2)' }}
                                      aria-label="Gỡ lái xe"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                ))
                              )}
                              <button
                                type="button"
                                onClick={() => setAddingDriverFor(g.vehicleId)}
                                className="nepo-driver-chip-add"
                                aria-label="Thêm lái xe"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td>
                            <button
                              onClick={() => setDeleteVehicleTarget({ id: g.vehicleId, plate: g.plate })}
                              className="p-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                              title="Vô hiệu hoá xe"
                            >
                              <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--theme-status-error, var(--status-error, #e53))' }} />
                            </button>
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

        <section>
          <div className="flex items-center gap-2 mb-3">
            <SearchInput value={driverSearch} onChange={handleDriverSearch} placeholder="Tìm tên, SĐT, biển số…" />
            <Button size="sm" variant="outline" onClick={() => exportDriversXlsx(drivers)} title="Xuất danh sách lái xe ra Excel">
              <Download className="h-4 w-4" /> Xuất Excel
            </Button>
            <Button size="sm" onClick={() => setShowCreateDriver(true)}>
              <Plus className="h-4 w-4" /> Thêm lái xe
            </Button>
          </div>
          <Panel flush>
            {driversLoading ? (
              <TableSkeleton />
            ) : visibleDrivers.length === 0 ? (
              <div className="py-10">
                <EmptyState icon={<Users className="h-5 w-5" />} title={driverSearch.trim() ? 'Không tìm thấy lái xe' : 'Chưa có lái xe nào'} compact />
              </div>
            ) : (
              <>
                {isMobile ? (
                  <div className="flex flex-col gap-3 p-4">
                    {visibleDrivers.map((d) => {
                      return editingDriverId === d.id ? (
                        <DriverMobileEditCard
                          key={d.id}
                          driver={d}
                          onSave={(data) => {
                            updateDriver(d, data).then(() => setEditingDriverId(null))
                          }}
                          onCancel={() => setEditingDriverId(null)}
                          saving={savingDriver}
                          vehicles={vehicles}
                        />
                      ) : (
                        <DriverMobileCard
                          key={d.id}
                          driver={d}
                          onEdit={() => setEditingDriverId(d.id)}
                          onResetPassword={() => setResetPwdDriver(d)}
                          onDelete={() => setDeleteDriverTarget({ id: d.id, name: d.fullName || d.username })}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="nepo-table-scroll overflow-x-auto">
                    <table className="nepo-table w-full" style={{ minWidth: 340, borderCollapse: 'collapse' }}>
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
                              onSave={(data) => {
                                updateDriver(d, data).then(() => setEditingDriverId(null))
                              }}
                              onCancel={() => setEditingDriverId(null)}
                              saving={savingDriver}
                              initialFocus={editingDriverField}
                              vehicles={vehicles}
                            />
                          ) : (
                            <DriverRow
                              key={d.id}
                              driver={d}
                              onEdit={(field) => {
                                setEditingDriverId(d.id)
                                setEditingDriverField(field)
                              }}
                              onResetPassword={() => setResetPwdDriver(d)}
                              onDelete={() => setDeleteDriverTarget({ id: d.id, name: d.fullName || d.username })}
                            />
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <LoadMoreSentinel sentinelRef={driverSentinel} hasMore={driverHasMore} />
              </>
            )}
          </Panel>
        </section>
      </div>

      <AddVehicleDialog
        open={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onConfirm={handleAddVehicleConfirm}
        loading={addVehiclePending}
      />

      <AssignDriverDialog
        open={addingDriverFor !== null}
        onClose={() => setAddingDriverFor(null)}
        onConfirm={handleAssignDriverConfirm}
        drivers={drivers}
      />

      {showCreateDriver && (
        <DriverFormDrawer
          open={showCreateDriver}
          onClose={() => setShowCreateDriver(false)}
          onSave={handleCreateDriverConfirm}
          saving={createDriverPending}
        />
      )}

      <ResetPasswordDialog
        open={!!resetPwdDriver}
        onClose={() => setResetPwdDriver(null)}
        onConfirm={handleResetPasswordConfirm}
        driver={resetPwdDriver}
      />

      <DangerConfirmDialog
        open={!!removeDriverTarget}
        onClose={() => setRemoveDriverTarget(null)}
        onConfirm={handleRemoveDriverConfirm}
        title="Gỡ lái xe?"
        entityName={removeDriverTarget?.name ?? ''}
        warningText="sẽ bị gỡ khỏi xe này."
        confirmLabel="Gỡ"
      />

      <DangerConfirmDialog
        open={!!deleteVehicleTarget}
        onClose={() => setDeleteVehicleTarget(null)}
        onConfirm={handleDeleteVehicleConfirm}
        title="Xoá xe?"
        entityName={deleteVehicleTarget?.plate ?? ''}
        warningText="sẽ bị xoá vĩnh viễn khỏi hệ thống. Tất cả phân công lái xe cũng sẽ bị xoá."
        confirmLabel="Xoá"
        loading={deleteVehiclePending}
      />

      <DangerConfirmDialog
        open={!!deleteDriverTarget}
        onClose={() => setDeleteDriverTarget(null)}
        onConfirm={handleDeleteDriverConfirm}
        title="Xoá lái xe?"
        entityName={deleteDriverTarget?.name ?? ''}
        warningText="sẽ bị xoá vĩnh viễn khỏi hệ thống. Tất cả phân công xe cũng sẽ bị xoá."
        confirmLabel="Xoá"
        loading={deleteDriverPending}
      />
    </div>
  )
}

export function TransportersPage() {
  const [showVendorMgmt, setShowVendorMgmt] = useState(false)

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Vận tải"
        subtitle="Quản lý đội xe, tài xế và nhà thầu vận chuyển"
        lucideIcon={Truck}
        actions={
          <Button variant="outline" size="sm" onClick={() => setShowVendorMgmt(true)} className="shrink-0 mt-1">
            <Building2 className="h-4 w-4" />
            Quản lý nhà thầu
          </Button>
        }
      />

      <FleetSection />

      <VendorManagementDrawer open={showVendorMgmt} onClose={() => setShowVendorMgmt(false)} />
    </div>
  )
}
