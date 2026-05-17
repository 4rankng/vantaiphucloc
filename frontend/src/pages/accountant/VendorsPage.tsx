import { useState, useMemo, useCallback } from 'react'
import { Truck, Plus, AlertTriangle, Calendar, FileDown, X } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Sheet, SheetContent } from '@/components/ui/Sheet'
import { AccountantPageShell } from '@/components/shared/AccountantPageShell'
import { PulseHint } from '@/components/shared/PulseHint'
import { InfoTip } from '@/components/shared/InfoTip'
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor, useVendorSummary, useExportVendorTrips } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fuzzyMatch } from '@/lib/search-utils'
import { formatCurrency } from '@/data/domain'
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
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--theme-text-muted)' }} aria-label="Đóng">
            <X size={18} />
          </button>
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
          <Button variant="outline" onClick={onClose} className="flex-1 text-sm h-9">Huỷ</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1 text-sm h-9"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function statusBadge(status: string) {
  const colors: Record<string, { bg: string; color: string }> = {
    APPLIED: { bg: 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)', color: 'var(--theme-status-success)' },
    PENDING_REVIEW: { bg: 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)', color: 'var(--theme-status-warning)' },
    DISCARDED: { bg: 'color-mix(in srgb, var(--theme-text-muted) 12%, transparent)', color: 'var(--theme-text-muted)' },
  }
  const c = colors[status] ?? colors.PENDING_REVIEW
  const labels: Record<string, string> = { APPLIED: 'Đã áp dụng', PENDING_REVIEW: 'Chờ duyệt', DISCARDED: 'Đã huỷ' }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: c.bg, color: c.color }}>
      {labels[status] ?? status}
    </span>
  )
}

function VendorDetailSheet({ vendor, onClose, onDelete }: { vendor: Vendor; onClose: () => void; onDelete: () => void }) {
  const { data: summary, isLoading } = useVendorSummary(vendor.id)
  const exportTrips = useExportVendorTrips()
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    name: vendor.name,
    type: vendor.type ?? 'company',
    phone: vendor.phone ?? '',
    taxCode: vendor.taxCode ?? '',
    address: vendor.address ?? '',
    contactPerson: vendor.contactPerson ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const updateVendor = useUpdateVendor()
  const [saving, setSaving] = useState(false)

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
    setSaving(true)
    updateVendor.mutate({ id: vendor.id, data: { ...form, name: form.name.trim() } }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setIsEditing(false); setSaving(false) },
      onError: () => { toast.error('Không thể cập nhật'); setSaving(false) },
    })
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setForm({
      name: vendor.name,
      type: vendor.type ?? 'company',
      phone: vendor.phone ?? '',
      taxCode: vendor.taxCode ?? '',
      address: vendor.address ?? '',
      contactPerson: vendor.contactPerson ?? '',
    })
    setErrors({})
  }

  const handleExport = () => {
    const now = new Date()
    const dateFrom = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-26`
    const dateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-25`
    exportTrips.mutate({ vendorId: vendor.id, dateFrom, dateTo }, {
      onSuccess: () => toast.success('Đã tải file đối soát'),
      onError: () => toast.error('Không thể xuất file'),
    })
  }

  const infoRows: [string, string, string][] = [
    ['Loại', 'type', vendor.type === 'company' ? 'Công ty' : 'Cá nhân'],
    ['SĐT', 'phone', vendor.phone],
    ['MST', 'taxCode', vendor.taxCode],
    ['Địa chỉ', 'address', vendor.address],
    ['Liên hệ', 'contactPerson', vendor.contactPerson],
  ]

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm">{vendor.name}</SheetTitle>
            <button onClick={onClose} className="p-1 rounded-md" style={{ color: 'var(--theme-text-muted)' }}>✕</button>
          </div>
          {vendor.taxCode && <SheetDescription className="text-xs font-mono-num">MST: {vendor.taxCode}</SheetDescription>}
        </SheetHeader>

        {isLoading && !isEditing ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Thông tin</p>

              {isEditing && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] uppercase tracking-wider w-14 shrink-0 pt-2" style={{ color: 'var(--theme-text-muted)' }}>Tên</span>
                    <div className="flex-1">
                      <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Tên nhà thầu" className="text-sm h-7" autoFocus />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] uppercase tracking-wider w-14 shrink-0 pt-2" style={{ color: 'var(--theme-text-muted)' }}>Loại</span>
                    <div className="flex gap-1.5 flex-1">
                      {(['company', 'individual'] as const).map(t => (
                        <button key={t} type="button" onClick={() => updateField('type', t)}
                          className="flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors"
                          style={{ background: form.type === t ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                          {t === 'company' ? 'Công ty' : 'Cá nhân'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] uppercase tracking-wider w-14 shrink-0 pt-2" style={{ color: 'var(--theme-text-muted)' }}>SĐT</span>
                    <div className="flex-1">
                      <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0901234567" className="text-sm h-7" />
                      {errors.phone && <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-status-error)' }}>{errors.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] uppercase tracking-wider w-14 shrink-0 pt-2" style={{ color: 'var(--theme-text-muted)' }}>MST</span>
                    <div className="flex-1">
                      <Input value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)} placeholder="0123456789" className="text-sm h-7" />
                      {errors.taxCode && <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-status-error)' }}>{errors.taxCode}</p>}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] uppercase tracking-wider w-14 shrink-0 pt-2" style={{ color: 'var(--theme-text-muted)' }}>Địa chỉ</span>
                    <div className="flex-1">
                      <Input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Địa chỉ" className="text-sm h-7" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] uppercase tracking-wider w-14 shrink-0 pt-2" style={{ color: 'var(--theme-text-muted)' }}>Liên hệ</span>
                    <div className="flex-1">
                      <Input value={form.contactPerson} onChange={e => updateField('contactPerson', e.target.value)} placeholder="Họ tên người liên hệ" className="text-sm h-7" />
                    </div>
                  </div>
                </div>
              )}

              {!isEditing && (
                <div className="space-y-1.5">
                  {infoRows.map(([label, _key, val]) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="text-[10px] uppercase tracking-wider w-14 shrink-0 pt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
                      <span className="text-sm" style={{ color: val ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>{val || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isEditing && summary?.stats && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-text-muted)' }}>Thống kê</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Chuyến', value: String(summary.stats.tripCount) },
                    { label: 'Cont', value: String(summary.stats.containerCount) },
                    { label: 'Đã TT', value: formatCurrency(summary.stats.totalPaid) },
                  ].map(kpi => (
                    <div key={kpi.label} className="rounded-lg p-2 text-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{kpi.value}</p>
                      <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{kpi.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isEditing && summary?.drivers && summary.drivers.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-text-muted)' }}>Lái xe của nhà thầu</p>
                <div className="space-y-1.5">
                  {summary.drivers.map(d => (
                    <div key={d.plate} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider"
                        style={{ borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}>{d.plate}</span>
                      <div className="flex items-center gap-3 text-xs tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>
                        <span>{d.tripCount} chuyến</span>
                        <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(d.totalPaid)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isEditing && summary?.reconciliations && summary.reconciliations.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-text-muted)' }}>Lịch sử đối soát</p>
                <div className="space-y-1.5">
                  {summary.reconciliations.map(r => (
                    <div key={r.importId} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <div className="flex items-center gap-2">
                        <Calendar size={12} style={{ color: 'var(--theme-text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                          {r.periodFrom} → {r.periodTo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>{r.containerCount} cont</span>
                        {statusBadge(r.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit} className="flex-1 text-xs">Huỷ</Button>
              <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1 text-xs"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleExport} disabled={exportTrips.isPending} className="flex-1 gap-1.5 text-xs">
                <FileDown size={14} />Xuất đối soát
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)} className="flex-1 text-xs">Sửa</Button>
              <Button variant="outline" onClick={onDelete} className="flex-1 text-xs" style={{ color: 'var(--theme-status-error)' }}>Xoá</Button>
              <Button variant="outline" onClick={onClose} className="flex-1 text-xs">Đóng</Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function VendorRow({ vendor, onOpenDetail }: { vendor: Vendor; onOpenDetail: () => void }) {
  const initials = vendor.name.slice(0, 2).toUpperCase()

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
        <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{vendor.name}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm" style={{ color: vendor.phone ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>{vendor.phone || '—'}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm" style={{ color: vendor.address ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>{vendor.address || '—'}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm" style={{ color: vendor.contactPerson ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>{vendor.contactPerson || '—'}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-xs font-mono-num" style={{ color: vendor.taxCode ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>
          {vendor.taxCode || '—'}
        </span>
      </td>
    </tr>
  )
}

export function VendorsPage() {
  const toast = useToast()
  const { data: vendors = [], isLoading } = useVendors()
  const createVendor = useCreateVendor()
  const deleteVendor = useDeleteVendor()

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [detailTarget, setDetailTarget] = useState<Vendor | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors
    const q = search
    return vendors.filter(p => fuzzyMatch(p.name, q) || fuzzyMatch(p.phone ?? '', q) || fuzzyMatch(p.taxCode ?? '', q))
  }, [vendors, search])

  const handleCreate = useCallback((data: typeof EMPTY_FORM) => {
    createVendor.mutate(data, {
      onSuccess: () => { toast.success('Đã thêm nhà thầu'); setShowCreate(false) },
      onError: () => toast.error('Không thể thêm nhà thầu'),
    })
  }, [createVendor, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteVendor.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setDetailTarget(null) },
      onError: () => toast.error('Không thể xoá'),
    })
  }, [deleteTarget, deleteVendor, toast])

  return (
    <>
      <AccountantPageShell
        title="Nhà thầu"
        subtitle="Quản lý nhà thầu vận tải ngoài"
        icon={Truck}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên, MST, SĐT..."
        count={filtered.length}
        countLabel={`${filtered.length} nhà thầu`}
        onAdd={() => setShowCreate(true)}
        addLabel="Thêm"
        addIcon={Plus}
        addHintKey="vendors-add"
      >
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06)' }}>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}>
                <Truck className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có nhà thầu nào.</p>
              <PulseHint hintKey="vendors-add-empty">
                <button onClick={() => setShowCreate(true)} className="btn-primary text-xs mt-1">
                  <Plus size={14} strokeWidth={2.25} />
                  <span>Thêm nhà thầu</span>
                </button>
              </PulseHint>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider w-10" style={{ color: 'var(--theme-text-muted)' }}></th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tên nhà thầu</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>SĐT</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Địa chỉ</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Liên hệ</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>MST</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <VendorRow key={v.id} vendor={v} onOpenDetail={() => setDetailTarget(v)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AccountantPageShell>

      {detailTarget && (
        <VendorDetailSheet
          vendor={detailTarget}
          onClose={() => setDetailTarget(null)}
          onDelete={() => { setDeleteTarget(detailTarget); setDetailTarget(null) }}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá nhà thầu?</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 rounded-lg px-3 py-2.5"
            style={{ background: 'color-mix(in srgb, var(--theme-status-error) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-status-error) 15%, transparent)' }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-error)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              <strong style={{ color: 'var(--theme-text-primary)' }}>{deleteTarget?.name}</strong> sẽ bị xoá vĩnh viễn và không thể khôi phục.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} className="flex-1" style={{ background: 'var(--theme-status-error)', color: '#fff' }}>Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VendorFormDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} title="Thêm nhà thầu" saving={createVendor.isPending} />

    </>
  )
}
