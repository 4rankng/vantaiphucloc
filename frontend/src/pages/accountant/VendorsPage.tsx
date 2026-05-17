import { useState, useMemo, useCallback } from 'react'
import { Truck, Plus, AlertTriangle, X, Search, Building2, User } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Sheet, SheetContent } from '@/components/ui/Sheet'
import { EntityDetailSheet } from '@/components/shared/EntityDetailSheet/EntityDetailSheet'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { PulseHint } from '@/components/shared/PulseHint'
import { InfoTip } from '@/components/shared/InfoTip'
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Vendor } from '@/data/domain'

const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/
const EMPTY_FORM = { name: '', type: 'company' as const, phone: '', taxCode: '', address: '', contactPerson: '' }

const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500,
  color: 'var(--theme-text-primary)', padding: 0, outline: 'none', fontFamily: 'inherit',
}
const cellStyle: React.CSSProperties = { padding: '10px 16px', borderRight: '0.5px solid var(--theme-border-light)' }
const cellStyleLast: React.CSSProperties = { padding: '10px 16px' }

import { DashboardCard } from '@/components/shared/DashboardCard/DashboardCard'
import { EmptyState } from '@/components/shared/EmptyState'

// ─── Subcomponents ────────────────────────────────────────────────────────────

function VendorFormDialog({ open, onClose, onSave, title, initial, saving }: {
  open: boolean; onClose: () => void; onSave: (data: typeof EMPTY_FORM) => void; title: string; initial?: Partial<typeof EMPTY_FORM>; saving?: boolean
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 gap-0" style={{ width: '100%', maxWidth: 480, border: 'none' }}>
        <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{title}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--theme-text-muted)' }} aria-label="Đóng"><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={cellStyle}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Tên nhà thầu <span style={{ color: 'var(--theme-status-error)' }}>*</span></p>
            <input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Tên nhà thầu" style={inputStyle} autoFocus />
          </div>
          <div style={cellStyleLast}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Loại</p>
            <div className="flex gap-1">
              {(['company', 'individual'] as const).map(t => (
                <button key={t} type="button" onClick={() => updateField('type', t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: form.type === t ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}
                >{t === 'company' ? 'Công ty' : 'Cá nhân'}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={cellStyle}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Điện thoại</p>
            <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0901234567" style={inputStyle} />
            {errors.phone && <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-status-error)' }}>{errors.phone}</p>}
          </div>
          <div style={cellStyleLast}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Mã số thuế <InfoTip text="10 hoặc 13 chữ số" /></p>
            <input value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)} placeholder="0123456789" style={inputStyle} />
            {errors.taxCode && <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-status-error)' }}>{errors.taxCode}</p>}
          </div>
        </div>
        <div style={{ borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={{ padding: '10px 16px' }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Địa chỉ</p>
            <input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Địa chỉ" style={inputStyle} />
          </div>
        </div>
        <div style={{ borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={{ padding: '10px 16px' }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Người liên hệ</p>
            <input value={form.contactPerson} onChange={e => updateField('contactPerson', e.target.value)} placeholder="Họ tên người liên hệ" style={inputStyle} />
          </div>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1">{saving ? 'Đang lưu...' : 'Xác nhận'}</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function VendorDetailDialog({ vendor, onClose, onEdit, onDelete }: { vendor: Vendor; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const fields = [
    { label: 'Loại', value: vendor.type === 'company' ? 'Công ty' : 'Cá nhân' },
    { label: 'SĐT', value: vendor.phone },
    { label: 'MST', value: vendor.taxCode },
    { label: 'Địa chỉ', value: vendor.address },
    { label: 'Liên hệ', value: vendor.contactPerson },
  ]

  const actions = (
    <>
      <Button variant="danger" onClick={onDelete} className="text-[12px] h-7 px-2 border-0 bg-transparent shadow-none">Xoá</Button>
      <div className="flex-1" />
      <Button variant="outline" onClick={onClose} className="text-[12px] h-7">Đóng</Button>
      <Button onClick={onEdit} className="text-[12px] h-7">Sửa</Button>
    </>
  )

  return (
    <EntityDetailSheet
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={vendor.name}
      subtitle={vendor.taxCode || undefined}
      fields={fields}
      actions={actions}
      maxWidth={440}
    />
  )
}

function VendorRow({ vendor, onOpenDetail, isLast }: { vendor: Vendor; onOpenDetail: () => void; isLast: boolean }) {
  const initials = vendor.name.slice(0, 2).toUpperCase()

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
        <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{vendor.name}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{vendor.phone || '—'}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-sm line-clamp-1" style={{ color: 'var(--theme-text-secondary)' }}>{vendor.address || '—'}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{vendor.contactPerson || '—'}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{vendor.taxCode || '—'}</span>
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function VendorsPage() {
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

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors
    const q = search
    return vendors.filter(p => fuzzyMatch(p.name, q) || fuzzyMatch(p.phone ?? '', q) || fuzzyMatch(p.taxCode ?? '', q))
  }, [vendors, search])

  const companyCount = vendors.filter(v => v.type === 'company').length
  const individualCount = vendors.filter(v => v.type !== 'company').length

  const handleCreate = useCallback((data: typeof EMPTY_FORM) => {
    createVendor.mutate(data, {
      onSuccess: () => { toast.success('Đã thêm nhà thầu'); setShowCreate(false) },
      onError: () => toast.error('Không thể thêm nhà thầu'),
    })
  }, [createVendor, toast])

  const handleUpdate = useCallback((data: typeof EMPTY_FORM) => {
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
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-display" style={{ color: 'var(--theme-text-primary)' }}>Nhà thầu</h1>
          <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>Quản lý nhà thầu vận tải ngoài</p>
        </div>
        <PulseHint hintKey="vendors-add">
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} strokeWidth={2.25} /><span>Thêm</span>
          </button>
        </PulseHint>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-3 gap-3">
        <KpiHeroCard
          label="Tổng nhà thầu"
          value={vendors.length}
          formattedValue={String(vendors.length)}
          icon={Truck}
          color="blue"
        />
        <KpiHeroCard
          label="Công ty"
          value={companyCount}
          formattedValue={String(companyCount)}
          icon={Building2}
          color="emerald"
          sublabel={vendors.length > 0 ? `${Math.round((companyCount / vendors.length) * 100)}% tổng nhà thầu` : undefined}
        />
        <KpiHeroCard
          label="Cá nhân"
          value={individualCount}
          formattedValue={String(individualCount)}
          icon={User}
          color="amber"
        />
      </div>

      {/* ── Table card ── */}
      <DashboardCard>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader
            title="Danh sách nhà thầu"
            icon={Truck}
            right={
              <div className="flex items-center gap-3">
                {filtered.length !== vendors.length && (
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{filtered.length}/{vendors.length}</span>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--theme-text-muted)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, MST, SĐT..." className="search-pill h-8 w-56" />
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
            icon={<Truck className="h-5 w-5" />}
            title={search.trim() ? 'Không tìm thấy nhà thầu' : 'Chưa có nhà thầu nào'}
            compact
            action={!search.trim() ? (
              <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
                <Plus size={14} strokeWidth={2.25} /><span>Thêm nhà thầu</span>
              </button>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full [&_td]:align-middle" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                  <th className="px-3 py-2.5 w-12"></th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tên nhà thầu</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>SĐT</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Địa chỉ</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Liên hệ</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>MST</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => <VendorRow key={v.id} vendor={v} onOpenDetail={() => setDetailTarget(v)} isLast={i === filtered.length - 1} />)}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      {/* ── Detail & Edit ── */}
      {detailTarget && !editTarget && (
        <VendorDetailDialog
          vendor={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => setEditTarget(detailTarget)}
          onDelete={() => { setDeleteTarget(detailTarget); setDetailTarget(null) }}
        />
      )}

      {/* ── Delete dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá nhà thầu?</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ background: 'color-mix(in srgb, var(--theme-status-error) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-status-error) 15%, transparent)' }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-error)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              <strong style={{ color: 'var(--theme-text-primary)' }}>{deleteTarget?.name}</strong> sẽ bị xoá vĩnh viễn và không thể khôi phục.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} variant="destructive" className="flex-1">Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Form sheets ── */}
      <VendorFormDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} title="Thêm nhà thầu" saving={createVendor.isPending} />
      <VendorFormDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        title="Cập nhật nhà thầu"
        saving={updateVendor.isPending}
        initial={editTarget ? { name: editTarget.name, type: editTarget.type ?? 'company', phone: editTarget.phone ?? '', taxCode: editTarget.taxCode ?? '', address: editTarget.address ?? '', contactPerson: editTarget.contactPerson ?? '' } : undefined}
      />
    </div>
  )
}
