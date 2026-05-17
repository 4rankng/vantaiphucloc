import { useState, useMemo } from 'react'
import { Car, Plus, X, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui'
import { Sheet, SheetContent } from '@/components/ui/Sheet'
import { EntityDetailSheet } from '@/components/shared/EntityDetailSheet/EntityDetailSheet'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { PulseHint } from '@/components/shared/PulseHint'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { StatBreakdownCard } from '@/components/shared/StatBreakdownCard'
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

import { DashboardCard } from '@/components/shared/DashboardCard/DashboardCard'
import { EmptyState } from '@/components/shared/EmptyState'

// ─── Subcomponents ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500,
  color: 'var(--theme-text-primary)', padding: 0, outline: 'none', fontFamily: 'inherit',
}
const cellStyle: React.CSSProperties = { padding: '10px 16px', borderRight: '0.5px solid var(--theme-border-light)' }
const cellStyleLast: React.CSSProperties = { padding: '10px 16px' }

function DriverRow({ driver, onOpenDetail, isLast }: { driver: Driver; onOpenDetail: () => void; isLast: boolean }) {
  const salary = useDriverBaseSalaryForm({ driverId: driver.id })
  const initials = (driver.fullName ?? driver.username).slice(0, 2).toUpperCase()
  const currentSalary = salary.currentRate
  const salaryDisplay = currentSalary ? formatCurrency(currentSalary.baseSalary) : '—'
  const salaryFrom = currentSalary?.effectiveFrom ?? ''

  return (
    <tr
      onClick={onOpenDetail}
      className="transition-colors cursor-pointer"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      <td className="px-3 py-2.5 w-12">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}
        >
          {initials}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-[13px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{driver.fullName || driver.username}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-[13px] font-normal" style={{ color: 'var(--theme-text-secondary)' }}>{driver.phone || '—'}</span>
      </td>
      <td className="px-3 py-2.5">
        {driver.vehiclePlate ? (
          <span
            className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider"
            style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
          >
            {driver.vehiclePlate}
          </span>
        ) : <span className="text-[13px] font-normal" style={{ color: 'var(--theme-text-muted)' }}>—</span>}
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{salaryDisplay}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-[13px] font-normal tabular-nums" style={{ color: 'var(--theme-text-secondary)' }}>{salaryFrom || '—'}</span>
      </td>
    </tr>
  )
}

function DriverDetailSheet({ driver, onClose, onEdit }: { driver: Driver; onClose: () => void; onEdit: () => void }) {
  const salary = useDriverBaseSalaryForm({ driverId: driver.id })

  const fields = [
    { label: 'Họ và tên', value: driver.fullName },
    { label: 'Tên đăng nhập', value: driver.username },
    { label: 'Số điện thoại', value: driver.phone },
    { label: 'Xe đang lái', value: driver.vehiclePlate || 'Chưa gán xe' },
    { label: 'Lương cơ bản', value: salary.currentRate ? formatCurrency(salary.currentRate.baseSalary) : 'Chưa thiết lập' },
  ]

  const actions = (
    <>
      <div className="flex-1" />
      <Button variant="outline" onClick={onClose} className="text-[12px] h-7">Đóng</Button>
      <Button onClick={onEdit} className="text-[12px] h-7">Sửa</Button>
    </>
  )

  return <EntityDetailSheet open onOpenChange={o => !o && onClose()} title={driver.fullName ?? driver.username} fields={fields} actions={actions} maxWidth={440} />
}

function DriverEditSheet({ driver, onClose }: { driver: Driver; onClose: () => void }) {
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
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 gap-0" style={{ width: '100%', maxWidth: 440, border: 'none' }}>
        <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Sửa lái xe</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--theme-text-muted)' }} aria-label="Đóng"><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={cellStyle}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Họ và tên</p>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A" style={inputStyle} autoFocus />
          </div>
          <div style={cellStyleLast}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Tên đăng nhập</p>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="taixe1" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={cellStyle}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Số điện thoại</p>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912345678" style={inputStyle} />
          </div>
          <div style={cellStyleLast}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Biển số xe</p>
            <InlineSelect placeholder="Chọn hoặc nhập" value={selectedPlate} options={vehicles.map(v => ({ value: v.plate, label: v.plate }))} onChange={v => setSelectedPlate(v)} onInputChange={v => setPlateInput(v)} onCreateNew={showCreatePlate ? () => setSelectedPlate(plateInput.trim()) : undefined} createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined} />
          </div>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSave} disabled={updateDriver.isPending || !hasChanges} className="flex-1">
            {updateDriver.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DriverFormSheet({ open, onClose, onSave, saving }: {
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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 gap-0" style={{ width: '100%', maxWidth: 440, border: 'none' }}>
        <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Thêm lái xe</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--theme-text-muted)' }} aria-label="Đóng"><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={cellStyle}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Tên đăng nhập <span style={{ color: 'var(--theme-status-error)' }}>*</span></p>
            <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="taixe1" style={inputStyle} autoFocus />
          </div>
          <div style={cellStyleLast}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Họ và tên</p>
            <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Nguyễn Văn A" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={cellStyle}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Số điện thoại</p>
            <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0912345678" style={inputStyle} />
          </div>
          <div style={cellStyleLast}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Biển số xe</p>
            <InlineSelect placeholder="Chọn hoặc nhập" value={form.plate} options={vehicles.map(v => ({ value: v.plate, label: v.plate }))} onChange={v => setForm(p => ({ ...p, plate: v }))} onInputChange={v => setPlateInput(v)} onCreateNew={showCreatePlate ? () => setForm(p => ({ ...p, plate: plateInput.trim() })) : undefined} createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined} />
          </div>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSave} disabled={!form.username.trim() || saving} className="flex-1">{saving ? 'Đang lưu...' : 'Xác nhận'}</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DriversPage() {
  const toast = useToast(); const qc = useQueryClient()
  const { data: drivers = [], isLoading } = useDrivers(); const createDriver = useCreateDriver()
  const [search, setSearch] = useState(''); const [showCreate, setShowCreate] = useState(false); const [detailTarget, setDetailTarget] = useState<Driver | null>(null); const [editTarget, setEditTarget] = useState<Driver | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return drivers
    return drivers.filter(d => fuzzyMatch(d.fullName ?? d.username, search) || fuzzyMatch(d.phone ?? '', search) || fuzzyMatch(d.vehiclePlate ?? '', search))
  }, [drivers, search])

  const assignedCount = drivers.filter(d => d.vehiclePlate).length
  const unassignedCount = drivers.length - assignedCount

  const handleCreate = async (data: { username: string; fullName: string; phone: string; plate: string }) => {
    createDriver.mutate({ username: data.username, fullName: data.fullName, phone: data.phone }, {
      onSuccess: async (newDriver) => {
        if (data.plate.trim() && newDriver?.id) try { await assignVehicle(newDriver.id, data.plate.trim()) } catch {}
        toast.success('Đã thêm lái xe'); setShowCreate(false); qc.invalidateQueries({ queryKey: ['drivers'] })
      },
      onError: () => toast.error('Không thể thêm lái xe'),
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-display" style={{ color: 'var(--theme-text-primary)' }}>Lái xe</h1>
          <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>Quản lý tài khoản và lương lái xe</p>
        </div>
        <PulseHint hintKey="drivers-add">
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} strokeWidth={2.25} /><span>Thêm lái xe</span>
          </button>
        </PulseHint>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-1 w-full md:max-w-[360px]">
        <StatBreakdownCard
          label="Tổng lái xe"
          total={drivers.length}
          items={[
            { label: 'Đã gắn xe', value: assignedCount },
            { label: 'Chưa gắn xe', value: unassignedCount },
          ]}
        />
      </div>

      {/* ── Table card ── */}
      <DashboardCard>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader
            title="Danh sách lái xe"
            icon={Users}
            right={
              <div className="flex items-center gap-3">
                {filtered.length !== drivers.length && (
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{filtered.length}/{drivers.length}</span>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--theme-text-muted)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, SĐT, xe..." className="search-pill h-8 w-56" />
                </div>
              </div>
            }
          />
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full [&_td]:align-middle" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                  <th className="px-3 py-2.5 w-12"></th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Họ tên</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>SĐT</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Biển số</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Lương cơ bản</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Từ ngày</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => <DriverRow key={d.id} driver={d} onOpenDetail={() => setDetailTarget(d)} isLast={i === filtered.length - 1} />)}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      {/* ── Sheets ── */}
      {detailTarget && !editTarget && <DriverDetailSheet driver={detailTarget} onClose={() => setDetailTarget(null)} onEdit={() => setEditTarget(detailTarget)} />}
      {editTarget && <DriverEditSheet driver={editTarget} onClose={() => setEditTarget(null)} />}
      <DriverFormSheet open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} saving={createDriver.isPending} />
    </div>
  )
}
