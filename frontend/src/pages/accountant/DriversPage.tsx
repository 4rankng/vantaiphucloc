import { useState, useMemo } from 'react'
import { Car, Plus, Phone, ChevronRight, Wallet } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label } from '@/components/ui'
import { AccountantPageShell } from '@/components/shared/AccountantPageShell'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { PulseHint } from '@/components/shared/PulseHint'
import { InfoTip } from '@/components/shared/InfoTip'
import { InlineEditable } from '@/components/shared/InlineEditable'
import { useDrivers, useCreateDriver } from '@/hooks/use-queries'
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
        <div className="space-y-2">
          {isLoading ? (
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06)' }}>
              <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
                <DashboardSectionHeader title="Danh sách lái xe" icon={Car} />
              </div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse" style={{ borderBottom: i < 3 ? '1px solid var(--theme-border-light)' : 'none' }}>
                  <div className="h-4 w-32 rounded" style={{ background: 'var(--theme-bg-tertiary)' }} />
                  <div className="h-4 w-20 rounded" style={{ background: 'var(--theme-bg-tertiary)' }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06)' }}>
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
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06), 0 4px 16px -4px rgba(9,9,11,0.05)' }}>
              <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
                <DashboardSectionHeader title="Danh sách lái xe" icon={Car}
                  right={<span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{filtered.length} lái xe</span>} />
              </div>
              {filtered.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => setDetailTarget(d)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--theme-border-light)' : 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)' }}>
                    <Car className="h-3.5 w-3.5" style={{ color: 'var(--theme-brand-primary)', opacity: 0.7 }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{d.fullName ?? d.username}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>
                      {d.vehiclePlate && <span className="mr-2">{d.vehiclePlate}</span>}
                      {d.phone && <span>{d.phone}</span>}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </AccountantPageShell>

      {detailTarget && <DriverDetailDialog driver={detailTarget} onClose={() => setDetailTarget(null)} />}
      <CreateDriverDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} />
    </>
  )
}

function DriverDetailDialog({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const salary = useDriverBaseSalaryForm({ driverId: driver.id })
  const [showSalaryForm, setShowSalaryForm] = useState(false)

  const handleVehicleChange = async (newPlate: string) => {
    try {
      await assignVehicle(driver.id, newPlate.trim())
      toast.success('Đã đổi xe')
      qc.invalidateQueries({ queryKey: ['drivers'] })
    } catch {
      toast.error('Không thể đổi xe')
    }
  }

  const handleSalarySubmit = async () => {
    await salary.submit()
    setShowSalaryForm(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{driver.fullName ?? driver.username}</DialogTitle></DialogHeader>
        <div className="divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>

          {/* Vehicle */}
          <div className="py-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Xe đang lái</p>
            <InlineEditable
              display={
                <span className="text-sm font-semibold" style={{ color: driver.vehiclePlate ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>
                  {driver.vehiclePlate ?? 'Chưa gán xe'}
                </span>
              }
              value={driver.vehiclePlate ?? ''}
              onSave={handleVehicleChange}
              placeholder="Biển số xe"
              editLabel="Nhấn để đổi xe"
            />
          </div>

          {/* Phone */}
          <div className="py-3 flex items-center gap-2">
            <Phone size={14} style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-sm" style={{ color: driver.phone ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>
              {driver.phone || '—'}
            </span>
          </div>

          {/* Base salary */}
          <div className="py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                <Wallet size={11} style={{ opacity: 0.6 }} />
                Lương cơ bản
                <InfoTip text="Mức lương cố định hàng tháng, không bao gồm doanh thu chuyến" />
              </p>
              {!showSalaryForm && (
                <button
                  onClick={() => setShowSalaryForm(true)}
                  className="text-xs font-medium transition-opacity"
                  style={{ color: 'var(--theme-brand-primary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                >
                  + Điều chỉnh
                </button>
              )}
            </div>

            <p className="text-base font-bold tabular-nums" style={{ color: salary.currentRate ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>
              {salary.currentRate ? formatCurrency(salary.currentRate.baseSalary) : 'Chưa thiết lập'}
            </p>

            {salary.history.length > 0 && (
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--theme-border-light)' }}>
                {salary.history.slice(0, 4).map((s, idx) => (
                  <div key={s.id}
                    className="flex items-center justify-between px-3 py-2 text-xs tabular-nums"
                    style={{
                      borderBottom: idx < Math.min(salary.history.length, 4) - 1 ? '1px solid var(--theme-border-light)' : 'none',
                      background: idx === 0 ? 'color-mix(in srgb, var(--theme-brand-primary) 4%, transparent)' : 'transparent',
                    }}>
                    <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(s.baseSalary)}</span>
                    <span style={{ color: 'var(--theme-text-muted)' }}>từ {s.effectiveFrom}</span>
                  </div>
                ))}
              </div>
            )}

            {showSalaryForm && (
              <div className="space-y-2 mt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                      Số tiền (VNĐ)
                    </label>
                    <Input
                      inputMode="numeric"
                      value={salary.fields.baseSalary}
                      onChange={e => salary.setBaseSalary(e.target.value)}
                      placeholder="8.000.000"
                      className="h-9 text-sm font-mono"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                      Hiệu lực từ
                    </label>
                    <Input
                      type="date"
                      value={salary.fields.effectiveFrom}
                      onChange={e => salary.setEffectiveFrom(e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>
                {salary.error && (
                  <p className="text-xs" style={{ color: 'var(--theme-status-error)' }} role="alert">{salary.error}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setShowSalaryForm(false); salary.reset() }}>Huỷ</Button>
                  <Button size="sm" onClick={handleSalarySubmit} disabled={!salary.fields.baseSalary || salary.submitting}
                    style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                    {salary.submitting ? 'Đang lưu…' : 'Lưu'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Đóng</Button>
        </DialogFooter>
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

  const handleSave = () => {
    if (!form.username.trim()) return
    onSave({ ...form, username: form.username.trim(), fullName: form.fullName.trim() })
    setForm({ username: '', fullName: '', phone: '', plate: '' })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Thêm lái xe</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Tên đăng nhập <span style={{ color: 'var(--theme-status-error)' }}>*</span>
              <InfoTip text="Dùng để đăng nhập app lái xe. Không thể thay đổi sau khi tạo." />
            </Label>
            <Input value={form.username} onChange={e => update('username', e.target.value)} placeholder="taixe1" className="text-sm" autoFocus />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ tên</Label>
            <Input value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Nguyễn Văn A" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>SĐT</Label>
            <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="0912345678" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Biển số xe
              <InfoTip text="Có thể gán thêm xe sau trong phần Vận tải" />
            </Label>
            <Input value={form.plate} onChange={e => update('plate', e.target.value)} placeholder="15C-12345" className="text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSave} disabled={!form.username.trim()} className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
