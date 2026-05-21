import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Car, Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import { Panel } from '@/components/shared/Panel'
import { useInfiniteScroll, LoadMoreSentinel, SearchInput, FieldActions } from '@/components/shared/ListUtils'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'
import { StatPill } from '@/components/shared/StatPill'
import { Drawer } from '@/components/shared/Drawer'
import { EmptyState } from '@/components/shared/EmptyState'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { useDrivers, useCreateDriver, useUpdateDriver, useVehicles } from '@/hooks/use-queries'
import { useDriverBaseSalaryForm } from '@/components/payroll/useDriverBaseSalaryForm'
import { useToast } from '@/components/atoms/Toast'
import { useQueryClient } from '@tanstack/react-query'
import { fuzzyMatch } from '@/lib/search-utils'
import { formatCurrency } from '@/data/domain'
import type { Driver } from '@/data/domain'
import { api } from '@/services/api/client'

async function assignVehicle(driverId: number, plate: string) {
  await api.put(`/drivers/${driverId}/vehicle`, { plate })
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH = 15

type DriverFormData = {
  fullName: string
  phone: string
  plate: string
}

type FocusableField = 'fullName' | 'phone' | 'plate' | null

// ─── Inline edit row ──────────────────────────────────────────────────────────

function DriverEditRow({ driver, onSave, onCancel, saving, initialFocus, vehicles }: {
  driver: Driver
  onSave: (data: DriverFormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: FocusableField
  vehicles: { id: number; plate: string }[]
}) {
  const salary = useDriverBaseSalaryForm({ driverId: driver.id })
  const currentSalary = salary.currentRate
  const salaryDisplay = currentSalary ? formatCurrency(currentSalary.baseSalary) : '—'
  const salaryFrom = currentSalary?.effectiveFrom ?? ''

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

  const handleSave = useCallback(() => {
    onSave(form)
  }, [form, onSave])

  useEffect(() => {
    if (initialFocus === 'fullName') fullNameRef.current?.focus()
    else if (initialFocus === 'phone') phoneRef.current?.focus()
    // 'plate' — InlineSelect manages its own focus
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
      {/* Họ tên */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input
            ref={fullNameRef}
            className="nepo-input text-[12px]"
            style={{ minWidth: 80, flex: 1 }}
            value={form.fullName}
            onChange={e => set('fullName', e.target.value)}
            placeholder="Họ tên"
          />
          {isDirty('fullName') && actions}
        </div>
      </td>
      {/* SĐT */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input
            ref={phoneRef}
            className="nepo-input text-[12px]"
            style={{ minWidth: 90, flex: 1 }}
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="SĐT"
          />
          {isDirty('phone') && actions}
        </div>
      </td>
      {/* Biển số */}
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
      {/* Lương cơ bản — read only */}
      <td className="text-right" style={{ padding: '5px 8px' }}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-3)' }}>{salaryDisplay}</span>
      </td>
      {/* Từ ngày — read only */}
      <td style={{ padding: '5px 8px' }}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-3)' }}>{salaryFrom || '—'}</span>
      </td>
    </tr>
  )
}

// ─── Driver row (read mode) ───────────────────────────────────────────────────

function DriverRow({ driver, onEdit }: {
  driver: Driver
  onEdit: (field: FocusableField) => void
}) {
  const salary = useDriverBaseSalaryForm({ driverId: driver.id })
  const currentSalary = salary.currentRate
  const salaryDisplay = currentSalary ? formatCurrency(currentSalary.baseSalary) : '—'
  const salaryFrom = currentSalary?.effectiveFrom ?? ''

  return (
    <tr className="cursor-pointer group">
      <td onClick={() => onEdit('fullName')}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{driver.fullName || driver.username}</span>
      </td>
      <td onClick={() => onEdit('phone')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{driver.phone || '—'}</span>
      </td>
      <td onClick={() => onEdit('plate')}>
        {driver.vehiclePlate ? (
          <span
            className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider"
            style={{ background: 'var(--surface-3)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          >
            {driver.vehiclePlate}
          </span>
        ) : <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>—</span>}
      </td>
      <td className="text-right">
        <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{salaryDisplay}</span>
      </td>
      <td>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{salaryFrom || '—'}</span>
      </td>
    </tr>
  )
}

// ─── Create drawer ─────────────────────────────────────────────────────────────
// (Kept because creating a driver requires a username field not shown in the table)

function DriverFormDrawer({ open, onClose, onSave, saving }: {
  open: boolean; onClose: () => void; onSave: (data: { username: string; fullName: string; phone: string; plate: string }) => void; saving?: boolean
}) {
  const [form, setForm] = useState({ username: '', fullName: '', phone: '', plate: '' })
  const { data: vehicles = [] } = useVehicles()
  const [plateInput, setPlateInput] = useState('')
  const showCreatePlate = plateInput.trim() && !vehicles.some(v => v.plate.toLowerCase() === plateInput.toLowerCase().trim())

  const handleSave = () => {
    if (!form.username.trim()) return
    onSave({ ...form, plate: plateInput.trim() || form.plate.trim() })
    setForm({ username: '', fullName: '', phone: '', plate: '' })
    setPlateInput('')
  }

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Lái xe" title="Thêm lái xe"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="default" onClick={handleSave} disabled={!form.username.trim() || !!saving}>
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="drv-new-user">
              Tên đăng nhập <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input id="drv-new-user" value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              placeholder="taixe1" className="nepo-input" autoFocus />
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="drv-new-name">Họ và tên</label>
            <input id="drv-new-name" value={form.fullName}
              onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
              placeholder="Nguyễn Văn A" className="nepo-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="drv-new-phone">Số điện thoại</label>
            <input id="drv-new-phone" type="tel" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="0912345678" className="nepo-input" />
          </div>
          <div>
            <label className="nepo-field-label">Biển số xe</label>
            <InlineSelect
              placeholder="Chọn hoặc nhập"
              value={form.plate}
              options={vehicles.map(v => ({ value: v.plate, label: v.plate }))}
              onChange={v => setForm(p => ({ ...p, plate: v }))}
              onInputChange={v => setPlateInput(v)}
              onCreateNew={showCreatePlate ? () => setForm(p => ({ ...p, plate: plateInput.trim() })) : undefined}
              createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined}
            />
          </div>
        </div>
      </div>
    </Drawer>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DriversPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: drivers = [], isLoading } = useDrivers()
  const { data: vehicles = [] } = useVehicles()
  const createDriver = useCreateDriver()
  const updateDriver = useUpdateDriver()

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingField, setEditingField] = useState<FocusableField>(null)
  const [saving, setSaving] = useState(false)

  // Infinite scroll
  const [limit, setLimit] = useState(BATCH)
  useEffect(() => { setLimit(BATCH) }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search.trim()) return drivers
    return drivers.filter(d => fuzzyMatch(d.fullName ?? d.username, search) || fuzzyMatch(d.phone ?? '', search) || fuzzyMatch(d.vehiclePlate ?? '', search))
  }, [drivers, search])

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit])
  const hasMore = limit < filtered.length
  const loadMore = useCallback(() => setLimit(n => n + BATCH), [])
  const sentinel = useInfiniteScroll(loadMore)

  const assignedCount = drivers.filter(d => d.vehiclePlate).length
  const unassignedCount = drivers.length - assignedCount

  const handleCreate = useCallback(async (data: { username: string; fullName: string; phone: string; plate: string }) => {
    createDriver.mutate({ username: data.username, fullName: data.fullName, phone: data.phone }, {
      onSuccess: async (newDriver) => {
        if (data.plate.trim() && newDriver?.id) try { await assignVehicle(newDriver.id, data.plate.trim()) } catch {}
        toast.success('Đã thêm lái xe')
        setShowCreate(false)
        qc.invalidateQueries({ queryKey: ['drivers'] })
      },
      onError: () => toast.error('Không thể thêm lái xe'),
    })
  }, [createDriver, toast, qc])

  const handleUpdate = useCallback(async (driver: Driver, data: DriverFormData) => {
    setSaving(true)
    try {
      const updates: Record<string, string> = {}
      if (data.fullName !== (driver.fullName ?? '')) updates.full_name = data.fullName
      if (data.phone !== (driver.phone ?? '')) updates.phone = data.phone
      if (Object.keys(updates).length > 0) {
        await updateDriver.mutateAsync({ id: driver.id, data: updates })
      }
      if (data.plate !== (driver.vehiclePlate ?? '') && data.plate) {
        await assignVehicle(driver.id, data.plate)
      }
      qc.invalidateQueries({ queryKey: ['drivers'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Đã lưu thay đổi')
      setEditingId(null)
    } catch {
      toast.error('Không thể lưu')
    } finally {
      setSaving(false)
    }
  }, [updateDriver, qc, toast])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <header>
        <h1 className="typo-display">Lái xe</h1>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <StatPill count={drivers.length} label=" lái xe" accent />
          <StatPill count={assignedCount} label=" đã gắn xe" />
          <StatPill count={unassignedCount} label=" chưa gắn xe" />
        </div>
      </header>

      {/* ── Table section ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, SĐT, xe…" />
          <Button variant="default" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Thêm
          </Button>
        </div>
        <Panel flush>
          {isLoading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={<Car className="h-5 w-5" />}
                title={search.trim() ? 'Không tìm thấy lái xe' : 'Chưa có lái xe nào'}
                compact
                action={!search.trim() ? (
                  <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
                    <Plus size={14} strokeWidth={2.25} /><span>Thêm lái xe</span>
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <>
              <div className="nepo-table-scroll overflow-x-auto">
                <table className="nepo-table w-full" style={{ minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th className="text-left">Họ tên</th>
                      <th className="text-left">SĐT</th>
                      <th className="text-left">Biển số</th>
                      <th className="text-right">Lương cơ bản</th>
                      <th className="text-left">Từ ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(d =>
                      editingId === d.id ? (
                        <DriverEditRow
                          key={d.id}
                          driver={d}
                          onSave={(data) => handleUpdate(d, data)}
                          onCancel={() => setEditingId(null)}
                          saving={saving}
                          initialFocus={editingField}
                          vehicles={vehicles}
                        />
                      ) : (
                        <DriverRow
                          key={d.id}
                          driver={d}
                          onEdit={(field) => { setEditingId(d.id); setEditingField(field) }}
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
      </section>

      {/* ── Create drawer ── */}
      <DriverFormDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleCreate}
        saving={createDriver.isPending}
      />
    </div>
  )
}
