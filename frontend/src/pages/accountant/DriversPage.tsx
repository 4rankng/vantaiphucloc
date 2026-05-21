import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Car, Plus, Users, Search } from 'lucide-react'
import { Button } from '@/components/ui'
import { Panel } from '@/components/shared/Panel'
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

function DriverRow({ driver, onOpenDetail }: { driver: Driver; onOpenDetail: () => void }) {
  const salary = useDriverBaseSalaryForm({ driverId: driver.id })
  const initials = (driver.fullName ?? driver.username).slice(0, 2).toUpperCase()
  const currentSalary = salary.currentRate
  const salaryDisplay = currentSalary ? formatCurrency(currentSalary.baseSalary) : '—'
  const salaryFrom = currentSalary?.effectiveFrom ?? ''

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
      <td><span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{salaryFrom || '—'}</span></td>
    </tr>
  )
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function DriverDetailDrawer({ driver, onClose, onEdit }: {
  driver: Driver; onClose: () => void; onEdit: () => void
}) {
  const salary = useDriverBaseSalaryForm({ driverId: driver.id })

  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Lái xe" title={driver.fullName ?? driver.username} meta={driver.phone || undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button variant="default" onClick={onEdit}>Sửa</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label">Họ và tên</label>
            <p className="text-[13px]" style={{ color: driver.fullName ? 'var(--ink)' : 'var(--ink-3)' }}>
              {driver.fullName || '—'}
            </p>
          </div>
          <div>
            <label className="nepo-field-label">Tên đăng nhập</label>
            <p className="text-[13px]" style={{ color: 'var(--ink)' }}>{driver.username}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label">Số điện thoại</label>
            <p className="text-[13px]" style={{ color: driver.phone ? 'var(--ink)' : 'var(--ink-3)' }}>
              {driver.phone || '—'}
            </p>
          </div>
          <div>
            <label className="nepo-field-label">Xe đang lái</label>
            <p className="text-[13px]" style={{ color: driver.vehiclePlate ? 'var(--ink)' : 'var(--ink-3)' }}>
              {driver.vehiclePlate || 'Chưa gán xe'}
            </p>
          </div>
        </div>
        <div>
          <label className="nepo-field-label">Lương cơ bản</label>
          <p className="text-[13px]" style={{ color: salary.currentRate ? 'var(--ink)' : 'var(--ink-3)' }}>
            {salary.currentRate ? formatCurrency(salary.currentRate.baseSalary) : 'Chưa thiết lập'}
          </p>
        </div>
      </div>
    </Drawer>
  )
}

// ─── Edit drawer ──────────────────────────────────────────────────────────────

function DriverEditDrawer({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const updateDriver = useUpdateDriver()
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
      if (Object.keys(updates).length > 0) await updateDriver.mutateAsync({ id: driver.id, data: updates })
      if (selectedPlate !== (driver.vehiclePlate ?? '') && selectedPlate) await api.put(`/drivers/${driver.id}/vehicle`, { plate: selectedPlate })
      qc.invalidateQueries({ queryKey: ['drivers'] }); qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Đã lưu thay đổi'); onClose()
    } catch { toast.error('Không thể lưu') }
  }

  return (
    <Drawer open onOpenChange={onClose}
      breadcrumb="Lái xe" title="Sửa lái xe"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="default" onClick={handleSave}
            disabled={updateDriver.isPending || !hasChanges}>
            {updateDriver.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="drv-fullname">Họ và tên</label>
            <input id="drv-fullname" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A" className="nepo-input" autoFocus />
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="drv-username">Tên đăng nhập</label>
            <input id="drv-username" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="taixe1" className="nepo-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="drv-phone">Số điện thoại</label>
            <input id="drv-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="0912345678" className="nepo-input" />
          </div>
          <div>
            <label className="nepo-field-label">Biển số xe</label>
            <InlineSelect
              placeholder="Chọn hoặc nhập"
              value={selectedPlate}
              options={vehicles.map(v => ({ value: v.plate, label: v.plate }))}
              onChange={v => setSelectedPlate(v)}
              onInputChange={v => setPlateInput(v)}
              onCreateNew={showCreatePlate ? () => setSelectedPlate(plateInput.trim()) : undefined}
              createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined}
            />
          </div>
        </div>
      </div>
    </Drawer>
  )
}

// ─── Create drawer ────────────────────────────────────────────────────────────

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
    setForm({ username: '', fullName: '', phone: '', plate: '' }); setPlateInput('')
  }

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Lái xe" title="Thêm lái xe"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="default" onClick={handleSave}
            disabled={!form.username.trim() || !!saving}>
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
  const toast = useToast(); const qc = useQueryClient()
  const { data: drivers = [], isLoading } = useDrivers(); const createDriver = useCreateDriver()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [detailTarget, setDetailTarget] = useState<Driver | null>(null)
  const [editTarget, setEditTarget] = useState<Driver | null>(null)

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
        toast.success('Đã thêm lái xe'); setShowCreate(false); qc.invalidateQueries({ queryKey: ['drivers'] })
      },
      onError: () => toast.error('Không thể thêm lái xe'),
    })
  }, [createDriver, toast, qc])

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
        <SectionHeader
          icon={<Users className="h-4 w-4" />}
          title="Danh sách lái xe"
          count={filtered.length}
          action={
            <Button variant="default" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Thêm
            </Button>
          }
        />
        <div className="mb-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, SĐT, xe…" />
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
                      <th style={{ width: 48 }} />
                      <th className="text-left">Họ tên</th>
                      <th className="text-left">SĐT</th>
                      <th className="text-left">Biển số</th>
                      <th className="text-right">Lương cơ bản</th>
                      <th className="text-left">Từ ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(d => (
                      <DriverRow key={d.id} driver={d} onOpenDetail={() => setDetailTarget(d)} />
                    ))}
                  </tbody>
                </table>
              </div>
              <LoadMoreSentinel sentinelRef={sentinel} hasMore={hasMore} />
            </>
          )}
        </Panel>
      </section>

      {/* ── Detail drawer ── */}
      {detailTarget && !editTarget && (
        <DriverDetailDrawer
          driver={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => setEditTarget(detailTarget)}
        />
      )}

      {/* ── Form drawers ── */}
      {editTarget && (
        <DriverEditDrawer driver={editTarget} onClose={() => setEditTarget(null)} />
      )}
      <DriverFormDrawer open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} saving={createDriver.isPending} />
    </div>
  )
}
