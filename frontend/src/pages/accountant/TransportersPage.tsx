import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Truck, Plus, User, X, Users, Search, Building2, Check, Trash2,
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
const VN_TAX_RE = /^\d{10}(\d{3})?$/

type DriverFormData = { fullName: string; phone: string; plate: string }
type DriverFocusableField = 'fullName' | 'phone' | 'plate' | null

type VendorFormData = {
  name: string; type: 'company' | 'individual'
  phone: string; taxCode: string; address: string; contactPerson: string
}
type VendorFocusableField = 'name' | 'phone' | 'taxCode' | 'address' | 'contactPerson' | null

const EMPTY_VENDOR_FORM: VendorFormData = {
  name: '', type: 'company', phone: '', taxCode: '', address: '', contactPerson: '',
}

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
  icon: React.ReactNode; title: string; count: number; action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: 'var(--ink-2)' }}>{icon}</span>
      <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>{title}</h2>
      <span className="tabular-nums text-[11.5px] font-semibold rounded-full px-2 py-0.5" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
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
      <Search className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ left: 10, color: 'var(--ink-3)' }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="nepo-input text-[13px]" style={{ paddingLeft: 32 }} />
    </div>
  )
}

function LoadMoreSentinel({ sentinelRef, hasMore }: {
  sentinelRef: React.RefObject<HTMLDivElement>; hasMore: boolean
}) {
  if (!hasMore) return null
  return (
    <div ref={sentinelRef} className="flex justify-center py-3">
      <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Đang tải…</span>
    </div>
  )
}

// ─── Inline save/cancel icons ─────────────────────────────────────────────────

function FieldActions({ onSave, onCancel, saving }: {
  onSave: () => void; onCancel: () => void; saving?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 ml-1 shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSave() }}
        disabled={saving}
        className="flex items-center justify-center rounded"
        style={{ width: 20, height: 20, background: 'var(--accent)', color: '#fff', opacity: saving ? 0.5 : 1 }}
        title="Lưu"
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCancel() }}
        className="flex items-center justify-center rounded"
        style={{ width: 20, height: 20, background: 'var(--surface-3)', color: 'var(--ink-2)' }}
        title="Huỷ"
      >
        <X className="h-2.5 w-2.5" strokeWidth={3} />
      </button>
    </div>
  )
}

// ─── Driver inline edit row (for fleet section) ───────────────────────────────

function DriverEditRow({ driver, vendorName, onSave, onCancel, saving, initialFocus, vehicles }: {
  driver: Driver
  vendorName?: string
  onSave: (data: DriverFormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: DriverFocusableField
  vehicles: { id: number; plate: string }[]
}) {
  const initial: DriverFormData = {
    fullName: driver.fullName ?? '',
    phone: driver.phone ?? '',
    plate: driver.vehiclePlate ?? '',
  }
  const [form, setForm] = useState<DriverFormData>(initial)
  const [plateInput, setPlateInput] = useState('')
  const fullNameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const isDirty = (key: keyof DriverFormData) => form[key] !== initial[key]
  const anyDirty = (Object.keys(form) as (keyof DriverFormData)[]).some(k => isDirty(k))
  const set = <K extends keyof DriverFormData>(key: K, val: DriverFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const handleSave = useCallback(() => { onSave(form) }, [form, onSave])

  useEffect(() => {
    if (initialFocus === 'fullName') fullNameRef.current?.focus()
    else if (initialFocus === 'phone') phoneRef.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel, handleSave])

  const showCreatePlate = plateInput.trim() && !vehicles.some(v => v.plate.toLowerCase() === plateInput.toLowerCase().trim())
  const actions = anyDirty ? <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} /> : null

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input ref={fullNameRef} className="nepo-input text-[12px]" style={{ minWidth: 80, flex: 1 }}
            value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Họ tên" />
          {isDirty('fullName') && actions}
        </div>
      </td>
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input ref={phoneRef} className="nepo-input text-[12px]" style={{ minWidth: 90, flex: 1 }}
            type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="SĐT" />
          {isDirty('phone') && actions}
        </div>
      </td>
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center gap-1">
          <div style={{ flex: 1, minWidth: 100 }}>
            <InlineSelect
              placeholder="Chọn hoặc nhập"
              value={form.plate}
              options={vehicles.map(v => ({ value: v.plate, label: v.plate }))}
              onChange={v => set('plate', v)}
              onInputChange={v => setPlateInput(v)}
              onCreateNew={showCreatePlate ? () => set('plate', plateInput.trim()) : undefined}
              createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined}
            />
          </div>
          {isDirty('plate') && actions}
        </div>
      </td>
      {/* Công ty — read only */}
      <td style={{ padding: '5px 8px' }}>
        <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>{vendorName ?? '—'}</span>
      </td>
    </tr>
  )
}

// ─── Driver row (read mode) ───────────────────────────────────────────────────

function DriverRow({ driver, vendorName, onEdit }: {
  driver: Driver; vendorName?: string; onEdit: (field: DriverFocusableField) => void
}) {
  return (
    <tr className="cursor-pointer group">
      <td onClick={() => onEdit('fullName')}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{driver.fullName || driver.username}</span>
      </td>
      <td onClick={() => onEdit('phone')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{driver.phone || '—'}</span>
      </td>
      <td onClick={() => onEdit('plate')}>
        {driver.vehiclePlate
          ? <Plate>{driver.vehiclePlate}</Plate>
          : <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>—</span>}
      </td>
      <td>
        <span className="text-[13px]" style={{ color: vendorName ? 'var(--ink-2)' : 'var(--ink-3)' }}>{vendorName ?? '—'}</span>
      </td>
    </tr>
  )
}

// ─── Driver create drawer ─────────────────────────────────────────────────────

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

// ─── Vendor inline edit row (for use inside VendorManagementDrawer) ───────────

function VendorEditRow({ initial, onSave, onCancel, saving, initialFocus = 'name' }: {
  initial: VendorFormData
  onSave: (data: VendorFormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: VendorFocusableField
}) {
  const [form, setForm] = useState<VendorFormData>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const refs: Record<Exclude<VendorFocusableField, null>, React.RefObject<HTMLInputElement | null>> = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    taxCode: useRef<HTMLInputElement>(null),
    address: useRef<HTMLInputElement>(null),
    contactPerson: useRef<HTMLInputElement>(null),
  }

  const isDirty = (key: keyof VendorFormData) => form[key] !== initial[key]
  const anyDirty = (Object.keys(form) as (keyof VendorFormData)[]).some(k => isDirty(k))

  const set = <K extends keyof VendorFormData>(key: K, val: VendorFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Bắt buộc'
    if (form.taxCode && !VN_TAX_RE.test(form.taxCode)) errs.taxCode = 'MST không hợp lệ'
    return errs
  }

  const handleSave = useCallback(() => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave({ ...form, name: form.name.trim() })
  }, [form, onSave]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialFocus) refs[initialFocus]?.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Input-level keyboard handler (prevents the containing Drawer from closing on Escape)
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleSave() }
  }, [onCancel, handleSave])

  const actions = anyDirty ? <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} /> : null

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      {/* Tên */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <div style={{ flex: 1 }}>
            <input ref={refs.name} className="nepo-input text-[12px]"
              style={{ width: '100%', borderColor: errors.name ? 'var(--status-error, #e53)' : undefined }}
              value={form.name} onChange={e => set('name', e.target.value)} placeholder="Tên nhà thầu *"
              onKeyDown={handleInputKeyDown} />
            {errors.name && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.name}</p>}
          </div>
          {isDirty('name') && actions}
        </div>
      </td>
      {/* Loại */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center gap-1">
          <div className="flex gap-1" style={{ minWidth: 90 }}>
            {(['company', 'individual'] as const).map(t => (
              <button key={t} type="button" onClick={() => set('type', t)}
                className="flex-1 rounded text-[11px] font-medium transition-colors"
                style={{ padding: '3px 0', background: form.type === t ? 'var(--accent)' : 'var(--surface-3)', color: form.type === t ? '#fff' : 'var(--ink-2)' }}>
                {t === 'company' ? 'Cty' : 'CN'}
              </button>
            ))}
          </div>
          {isDirty('type') && actions}
        </div>
      </td>
      {/* SĐT */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input ref={refs.phone} className="nepo-input text-[12px]" style={{ minWidth: 90, flex: 1 }}
            type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="SĐT"
            onKeyDown={handleInputKeyDown} />
          {isDirty('phone') && actions}
        </div>
      </td>
      {/* Địa chỉ */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input ref={refs.address} className="nepo-input text-[12px]" style={{ minWidth: 100, flex: 1 }}
            value={form.address} onChange={e => set('address', e.target.value)} placeholder="Địa chỉ"
            onKeyDown={handleInputKeyDown} />
          {isDirty('address') && actions}
        </div>
      </td>
      {/* Liên hệ */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input ref={refs.contactPerson} className="nepo-input text-[12px]" style={{ minWidth: 80, flex: 1 }}
            value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Người liên hệ"
            onKeyDown={handleInputKeyDown} />
          {isDirty('contactPerson') && actions}
        </div>
      </td>
      {/* MST */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <div style={{ flex: 1 }}>
            <input ref={refs.taxCode} className="nepo-input text-[12px]"
              style={{ width: '100%', borderColor: errors.taxCode ? 'var(--status-error, #e53)' : undefined }}
              value={form.taxCode} onChange={e => set('taxCode', e.target.value)} placeholder="MST"
              onKeyDown={handleInputKeyDown} />
            {errors.taxCode && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.taxCode}</p>}
          </div>
          {isDirty('taxCode') && actions}
        </div>
      </td>
      {/* Trash placeholder */}
      <td style={{ width: 32 }} />
    </tr>
  )
}

// ─── Vendor row (read mode, for VendorManagementDrawer) ───────────────────────

function VendorRow({ vendor, onEdit, onDelete }: {
  vendor: Vendor; onEdit: (field: VendorFocusableField) => void; onDelete: () => void
}) {
  const cell = (field: VendorFocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }
  return (
    <tr className="cursor-pointer group">
      <td onClick={cell('name')}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{vendor.name}</span>
      </td>
      <td onClick={() => onEdit(null)}>
        <span className="text-[12px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
          {vendor.type === 'company' ? 'Công ty' : 'Cá nhân'}
        </span>
      </td>
      <td onClick={cell('phone')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.phone || '—'}</span>
      </td>
      <td onClick={cell('address')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 180 }}>{vendor.address || '—'}</span>
      </td>
      <td onClick={cell('contactPerson')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.contactPerson || '—'}</span>
      </td>
      <td onClick={cell('taxCode')}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{vendor.taxCode || '—'}</span>
      </td>
      <td style={{ width: 32 }}>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
          style={{ width: 24, height: 24, color: 'var(--ink-3)' }} title="Xoá">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
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
  const updateDriver = useUpdateDriver()
  const addVehicleDriver = useAddVehicleDriver()
  const removeVehicleDriver = useRemoveVehicleDriver()

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
  const [addingDriverFor, setAddingDriverFor] = useState<number | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
  const [removeDriverTarget, setRemoveDriverTarget] = useState<{ vdId: number; name: string } | null>(null)

  // Inline driver editing
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null)
  const [editingDriverField, setEditingDriverField] = useState<DriverFocusableField>(null)
  const [savingDriver, setSavingDriver] = useState(false)

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

  const handleUpdateDriver = useCallback(async (driver: Driver, data: DriverFormData) => {
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
                <EmptyState icon={<Users className="h-5 w-5" />} title={driverSearch.trim() ? 'Không tìm thấy lái xe' : 'Chưa có lái xe nào'} compact />
              </div>
            ) : (
              <>
                <div className="nepo-table-scroll overflow-x-auto">
                  <table className="nepo-table w-full" style={{ minWidth: 420, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
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
                        return editingDriverId === d.id ? (
                          <DriverEditRow
                            key={d.id}
                            driver={d}
                            vendorName={vendorName}
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
                            vendorName={vendorName}
                            onEdit={(field) => { setEditingDriverId(d.id); setEditingDriverField(field) }}
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
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [editingField, setEditingField] = useState<VendorFocusableField>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

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

  const handleCreate = useCallback((data: VendorFormData) => {
    createVendor.mutate(data, {
      onSuccess: () => { toast.success('Đã thêm nhà thầu'); setEditingId(null) },
      onError: () => toast.error('Không thể thêm nhà thầu'),
    })
  }, [createVendor, toast])

  const handleUpdate = useCallback((id: number, data: VendorFormData) => {
    updateVendor.mutate({ id, data }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setEditingId(null) },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [updateVendor, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteVendor.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setEditingId(null) },
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
            <Button variant="default" onClick={() => { setEditingId('new') }}>
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
            ) : filtered.length === 0 && editingId !== 'new' ? (
              <div className="py-10">
                <EmptyState
                  icon={<Building2 className="h-5 w-5" />}
                  title={search.trim() ? 'Không tìm thấy nhà thầu' : 'Chưa có nhà thầu nào'}
                  compact
                  action={!search.trim() ? (
                    <button onClick={() => setEditingId('new')} className="btn-primary text-xs">
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
                        <th className="text-left">Tên nhà thầu</th>
                        <th className="text-left">Loại</th>
                        <th className="text-left">SĐT</th>
                        <th className="text-left">Địa chỉ</th>
                        <th className="text-left">Liên hệ</th>
                        <th className="text-left">MST</th>
                        <th style={{ width: 32 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {editingId === 'new' && (
                        <VendorEditRow
                          initial={EMPTY_VENDOR_FORM}
                          onSave={handleCreate}
                          onCancel={() => setEditingId(null)}
                          saving={createVendor.isPending}
                        />
                      )}
                      {visible.map((v) =>
                        editingId === v.id ? (
                          <VendorEditRow
                            key={v.id}
                            initial={{
                              name: v.name,
                              type: v.type ?? 'company',
                              phone: v.phone ?? '',
                              taxCode: v.taxCode ?? '',
                              address: v.address ?? '',
                              contactPerson: v.contactPerson ?? '',
                            }}
                            onSave={(data) => handleUpdate(v.id, data)}
                            onCancel={() => setEditingId(null)}
                            saving={updateVendor.isPending}
                            initialFocus={editingField}
                          />
                        ) : (
                          <VendorRow
                            key={v.id}
                            vendor={v}
                            onEdit={(field) => { setEditingId(v.id); setEditingField(field) }}
                            onDelete={() => setDeleteTarget(v)}
                          />
                        )
                      )}
                    </tbody>
                  </table>
                </div>
                <LoadMoreSentinel sentinelRef={sentinel} hasMore={hasMore} />
              </>
            )}
          </Panel>
        </div>
      </Drawer>

      {/* Delete confirmation rendered outside to avoid z-index stacking */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá nhà thầu"
        description={`"${deleteTarget?.name}" sẽ bị xoá vĩnh viễn và không thể khôi phục.`}
        confirmLabel="Xoá"
        variant="warning"
      />
    </>
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
