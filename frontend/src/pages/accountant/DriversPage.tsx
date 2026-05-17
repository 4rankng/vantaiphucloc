import { useState, useMemo, useRef, useEffect } from 'react'
import { Car, Plus, Wallet, Phone, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input } from '@/components/ui'
import { Sheet, SheetContent } from '@/components/ui/Sheet'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { AccountantPageShell } from '@/components/shared/AccountantPageShell'
import { PulseHint } from '@/components/shared/PulseHint'
import { InfoTip } from '@/components/shared/InfoTip'
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--theme-text-primary)',
  padding: 0,
  outline: 'none',
  fontFamily: 'inherit',
}

const cellStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRight: `0.5px solid var(--theme-border-light)`,
}

const cellStyleLast: React.CSSProperties = {
  padding: '10px 16px',
}

const labelRow = (icon: React.ReactNode, label: string) => (
  <div className="flex items-center gap-[5px]" style={{ marginBottom: 3 }}>
    {icon}
    <p style={{ fontSize: 10, color: 'var(--theme-text-muted)', margin: 0, letterSpacing: '0.04em' }}>{label}</p>
  </div>
)

export function DriversPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: drivers = [], isLoading } = useDrivers()
  const createDriver = useCreateDriver()

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [detailTarget, setDetailTarget] = useState<Driver | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return drivers
    const q = search
    return drivers.filter(d =>
      fuzzyMatch(d.fullName ?? d.username, q) || fuzzyMatch(d.phone ?? '', q) || fuzzyMatch(d.vehiclePlate ?? '', q)
    )
  }, [drivers, search])

  const handleCreate = async (data: { username: string; fullName: string; phone: string; plate: string }) => {
    createDriver.mutate({ username: data.username, fullName: data.fullName, phone: data.phone }, {
      onSuccess: async (newDriver) => {
        if (data.plate.trim() && newDriver?.id) {
          try { await assignVehicle(newDriver.id, data.plate.trim()) } catch {}
        }
        toast.success('Đã thêm lái xe')
        setShowCreate(false)
        qc.invalidateQueries({ queryKey: ['drivers'] })
      },
      onError: () => toast.error('Không thể thêm lái xe'),
    })
  }

  return (
    <>
      <AccountantPageShell
        title="Lái xe"
        subtitle="Quản lý tài khoản và lương lái xe"
        icon={Car}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên, SĐT, biển xe..."
        count={filtered.length}
        countLabel={`${filtered.length} lái xe`}
        onAdd={() => setShowCreate(true)}
        addLabel="Thêm"
        addIcon={Plus}
        addHintKey="drivers-add"
      >
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06)' }}>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}>
                <Car className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có lái xe nào.</p>
              <PulseHint hintKey="drivers-add-empty">
                <button onClick={() => setShowCreate(true)} className="btn-primary text-xs mt-1">
                  <Plus size={14} strokeWidth={2.25} />
                  <span>Thêm lái xe</span>
                </button>
              </PulseHint>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider w-10" style={{ color: 'var(--theme-text-muted)' }}></th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Họ tên</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>SĐT</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Biển số xe</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Lương cơ bản</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Từ ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <DriverRow key={d.id} driver={d} onOpenDetail={() => setDetailTarget(d)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AccountantPageShell>

      {detailTarget && <DriverDetailDialog driver={detailTarget} onClose={() => setDetailTarget(null)} />}
      <CreateDriverDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} />
    </>
  )
}

function DriverRow({ driver, onOpenDetail }: { driver: Driver; onOpenDetail: () => void }) {
  const salary = useDriverBaseSalaryForm({ driverId: driver.id })

  const initials = (driver.fullName ?? driver.username).slice(0, 2).toUpperCase()
  const currentSalary = salary.currentRate
  const salaryDisplay = currentSalary ? formatCurrency(currentSalary.baseSalary) : '—'
  const salaryFrom = currentSalary?.effectiveFrom ?? ''

  return (
    <tr
      onClick={onOpenDetail}
      style={{ borderBottom: '1px solid var(--theme-border-light)', cursor: 'pointer' }}
      className="transition-colors"
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      <td className="px-4 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold select-none shrink-0"
          style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)', color: 'var(--theme-brand-primary)' }}>
          {initials}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{driver.fullName || driver.username}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm" style={{ color: driver.phone ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>{driver.phone || '—'}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm" style={{ color: driver.vehiclePlate ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)', letterSpacing: '0.04em' }}>
          {driver.vehiclePlate || '—'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="text-sm font-semibold tabular-nums" style={{ color: currentSalary ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>
          {salaryDisplay}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-xs" style={{ color: salaryFrom ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>
          {salaryFrom || '—'}
        </span>
      </td>
    </tr>
  )
}

function DriverDetailDialog({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const updateDriver = useUpdateDriver()
  const salary = useDriverBaseSalaryForm({ driverId: driver.id })
  const { data: vehicles = [] } = useVehicles()
  const [showSalaryForm, setShowSalaryForm] = useState(true)
  const [showNewVehicle, setShowNewVehicle] = useState(false)
  const [newPlate, setNewPlate] = useState('')
  const [salaryDirty, setSalaryDirty] = useState(false)
  const salaryPrefilled = useRef(false)

  useEffect(() => {
    if (salaryPrefilled.current || !salary.currentRate) return
    salaryPrefilled.current = true
    salary.setBaseSalary(String(salary.currentRate.baseSalary))
    salary.setEffectiveFrom(salary.currentRate.effectiveFrom)
  }, [salary.currentRate])

  const [fullName, setFullName] = useState(driver.fullName ?? '')
  const [username, setUsername] = useState(driver.username)
  const [phone, setPhone] = useState(driver.phone ?? '')
  const [selectedPlate, setSelectedPlate] = useState(driver.vehiclePlate ?? '')

  const initials = (driver.fullName ?? driver.username).slice(0, 2).toUpperCase()
  const hasChanges =
    fullName !== (driver.fullName ?? '') ||
    username !== driver.username ||
    phone !== (driver.phone ?? '') ||
    selectedPlate !== (driver.vehiclePlate ?? '')

  const handleSave = async () => {
    try {
      const updates: Record<string, string> = {}
      if (fullName !== (driver.fullName ?? '')) updates.full_name = fullName
      if (username !== driver.username) updates.username = username
      if (phone !== (driver.phone ?? '')) updates.phone = phone
      if (Object.keys(updates).length > 0) {
        await updateDriver.mutateAsync({ id: driver.id, data: updates })
      }
      if (selectedPlate !== (driver.vehiclePlate ?? '') && selectedPlate) {
        await api.put(`/drivers/${driver.id}/vehicle`, { plate: selectedPlate })
      }
      qc.invalidateQueries({ queryKey: ['drivers'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Đã lưu thay đổi')
      onClose()
    } catch {
      toast.error('Không thể lưu')
    }
  }

  const handleCreateVehicle = async () => {
    if (!newPlate.trim()) return
    try {
      await api.post('/vehicles', { plate: newPlate.trim().toUpperCase() })
      const plate = newPlate.trim().toUpperCase()
      setSelectedPlate(plate)
      setNewPlate('')
      setShowNewVehicle(false)
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Đã tạo xe mới')
    } catch {
      toast.error('Không thể tạo xe')
    }
  }

  const handleSalarySubmit = async () => {
    await salary.submit()
    setShowSalaryForm(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent hideCloseButton className="p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{driver.fullName ?? driver.username}</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Thông tin tài xế</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--theme-text-muted)' }} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Avatar + Full Name row */}
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--theme-border-light)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            className="shrink-0"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--theme-brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text-on-brand)' }}>{initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, color: 'var(--theme-text-muted)', margin: '0 0 2px', letterSpacing: '0.04em' }}>HỌ VÀ TÊN</p>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Họ và tên"
              style={inputStyle}
            />
          </div>
        </div>

        {/* 2-col grid: Username | Vehicle */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div className="cell" style={cellStyle}>
            {labelRow(<Phone size={13} style={{ color: 'var(--theme-text-muted)' }} />, 'TÊN ĐĂNG NHẬP')}
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="@username"
              style={inputStyle}
            />
          </div>
          <div className="cell" style={cellStyleLast}>
            <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
              {labelRow(<Car size={13} style={{ color: 'var(--theme-text-muted)' }} />, 'XE ĐANG LÁI')}
              {!showNewVehicle && (
                <button
                  onClick={() => setShowNewVehicle(true)}
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--theme-brand-primary)', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                >
                  +
                </button>
              )}
            </div>
            {showNewVehicle ? (
              <div className="flex items-center gap-1">
                <input
                  value={newPlate}
                  onChange={e => setNewPlate(e.target.value)}
                  placeholder="15C-12345"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateVehicle(); if (e.key === 'Escape') { setShowNewVehicle(false); setNewPlate('') } }}
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                />
                <button onClick={handleCreateVehicle} disabled={!newPlate.trim()}
                  className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', border: 'none', cursor: 'pointer' }}>
                  Tạo
                </button>
              </div>
            ) : (
              <select
                value={selectedPlate}
                onChange={e => setSelectedPlate(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', letterSpacing: '0.04em' }}
              >
                <option value="">{driver.vehiclePlate || 'Chưa gán xe'}</option>
                {vehicles
                  .filter(v => v.plate !== driver.vehiclePlate)
                  .map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* 2-col grid: Phone | Base Salary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div className="cell" style={cellStyle}>
            {labelRow(<Phone size={13} style={{ color: 'var(--theme-text-muted)' }} />, 'SỐ ĐIỆN THOẠI')}
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0912345678"
              style={inputStyle}
            />
          </div>
          <div className="cell" style={cellStyleLast}>
            {labelRow(<Wallet size={13} style={{ color: 'var(--theme-text-muted)' }} />, 'LƯƠNG CƠ BẢN')}
            <div className="flex items-baseline gap-[3px]">
              <span style={{ ...inputStyle, width: '100%', minWidth: 0 }}>
                {salary.currentRate ? formatCurrency(salary.currentRate.baseSalary) : 'Chưa thiết lập'}
              </span>
              {salary.currentRate && <span style={{ fontSize: 12, color: 'var(--theme-text-muted)', flexShrink: 0 }}></span>}
            </div>
          </div>
        </div>

        {/* Salary history */}
        <div style={{ padding: '10px 16px 12px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--theme-text-muted)', letterSpacing: '0.04em' }}>LỊCH SỬ LƯƠNG</span>
            {!showSalaryForm && (
              <button
                onClick={() => setShowSalaryForm(true)}
                className="text-xs font-medium"
                style={{ color: 'var(--theme-brand-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                + Điều chỉnh
              </button>
            )}
          </div>

          {salary.history.length > 0 && !showSalaryForm && (
            <div className="rounded-lg" style={{ background: 'var(--theme-bg-tertiary)', padding: '8px 12px' }}>
              {salary.history.slice(0, 4).map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between" style={{ paddingTop: idx > 0 ? 6 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text-primary)' }}>{formatCurrency(s.baseSalary)}</span>
                  <div className="flex items-center gap-[5px]">
                    <span style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>từ {s.effectiveFrom}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showSalaryForm && (
            <div className="space-y-2 mt-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Số tiền (VNĐ)</label>
                  <Input
                    inputMode="numeric"
                    value={salary.fields.baseSalary}
                    onChange={e => {
                      const prev = salary.fields.baseSalary
                      salary.setBaseSalary(e.target.value)
                      if (salary.currentRate) {
                        const prevClean = prev.replace(/[^0-9]/g, '')
                        const nextClean = e.target.value.replace(/[^0-9]/g, '')
                        const orig = String(salary.currentRate.baseSalary)
                        setSalaryDirty(nextClean !== orig && nextClean !== '')
                      }
                    }}
                    placeholder="8.000.000"
                    className="h-9 text-sm font-mono"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Hiệu lực từ</label>
                  <Input
                    type="date"
                    value={salary.fields.effectiveFrom}
                    onChange={e => { salary.setEffectiveFrom(e.target.value); setSalaryDirty(false) }}
                    className="h-9 text-sm font-mono"
                    style={salaryDirty ? { borderColor: '#f97316', borderWidth: 2 } : undefined}
                  />
                  {salaryDirty && (
                    <p className="text-[11px] font-medium" style={{ color: '#f97316' }}>Chọn ngày hiệu lực mới</p>
                  )}
                </div>
              </div>
              {salary.error && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }} role="alert">{salary.error}</p>}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowSalaryForm(false); salary.reset(); setSalaryDirty(false) }}>Huỷ</Button>
                <Button size="sm" onClick={handleSalarySubmit} disabled={!salary.fields.baseSalary || salary.submitting} style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                  {salary.submitting ? 'Đang lưu…' : 'Lưu'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px 14px', borderTop: '0.5px solid var(--theme-border-light)', display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            className="text-sm font-medium"
            style={{ flex: 1, padding: 9, borderRadius: 'var(--border-radius-md, 8px)', border: '0.5px solid var(--theme-border-light)', background: 'transparent', color: 'var(--theme-text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            disabled={updateDriver.isPending || !hasChanges}
            className="text-sm font-medium"
            style={{ flex: 2, padding: 9, borderRadius: 'var(--border-radius-md, 8px)', border: 'none', background: hasChanges ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: hasChanges ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)', cursor: hasChanges ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            {updateDriver.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CreateDriverDialog({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (data: { username: string; fullName: string; phone: string; plate: string }) => void
}) {
  const [form, setForm] = useState({ username: '', fullName: '', phone: '', plate: '' })
  const update = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(p => ({ ...p, [k]: v }))

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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 gap-0" style={{ width: '100%', maxWidth: 440, border: 'none' }}>
        <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Thêm lái xe</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--theme-text-muted)' }} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* 2-col grid: Username | Full Name */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={cellStyle}>
            <p style={{ fontSize: 10, color: 'var(--theme-text-muted)', margin: '0 0 3px', letterSpacing: '0.04em' }}>TÊN ĐĂNG NHẬP</p>
            <input
              value={form.username}
              onChange={e => update('username', e.target.value)}
              placeholder="taixe1"
              style={inputStyle}
              autoFocus
            />
          </div>
          <div style={cellStyleLast}>
            <p style={{ fontSize: 10, color: 'var(--theme-text-muted)', margin: '0 0 3px', letterSpacing: '0.04em' }}>HỌ VÀ TÊN</p>
            <input
              value={form.fullName}
              onChange={e => update('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
              style={inputStyle}
            />
          </div>
        </div>

        {/* 2-col grid: Phone | Plate */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={cellStyle}>
            <p style={{ fontSize: 10, color: 'var(--theme-text-muted)', margin: '0 0 3px', letterSpacing: '0.04em' }}>SĐT</p>
            <input
              type="tel"
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              placeholder="0912345678"
              style={inputStyle}
            />
          </div>
          <div style={cellStyleLast}>
            <p style={{ fontSize: 10, color: 'var(--theme-text-muted)', margin: '0 0 3px', letterSpacing: '0.04em' }}>BIỂN SỐ XE</p>
            <InlineSelect
              placeholder="Chọn hoặc nhập"
              value={form.plate}
              options={vehicles.map(v => ({ value: v.plate, label: v.plate }))}
              onChange={v => update('plate', v)}
              onInputChange={v => setPlateInput(v)}
              onCreateNew={showCreatePlate ? () => update('plate', plateInput.trim()) : undefined}
              createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined}
            />
          </div>
        </div>

        <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={onClose} className="flex-1 text-sm h-9">Huỷ</Button>
          <Button onClick={handleSave} disabled={!form.username.trim()} className="flex-1 text-sm h-9"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            Xác nhận
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
