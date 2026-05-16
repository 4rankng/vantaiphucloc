import { useState, useMemo, useCallback } from 'react'
import { Truck, Plus, AlertTriangle, Calendar, FileDown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label } from '@/components/ui'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet'
import { AccountantPageShell } from '@/components/shared/AccountantPageShell'
import { PulseHint } from '@/components/shared/PulseHint'
import { InfoTip } from '@/components/shared/InfoTip'
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor, useVendorSummary, useExportVendorTrips } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useQueryClient } from '@tanstack/react-query'
import { fuzzyMatch } from '@/lib/search-utils'
import { formatCurrency } from '@/data/domain'
import type { Vendor } from '@/data/domain'

const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/
const EMPTY_FORM = { name: '', type: 'company' as const, phone: '', taxCode: '', address: '', contactPerson: '' }

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Tên nhà thầu <span style={{ color: 'var(--theme-status-error)' }}>*</span>
            </Label>
            <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Tên nhà thầu" className="text-sm" autoFocus />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại</Label>
            <div className="flex gap-2">
              {(['company', 'individual'] as const).map(t => (
                <button key={t} type="button" onClick={() => updateField('type', t)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: form.type === t ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                  {t === 'company' ? 'Công ty' : 'Cá nhân'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điện thoại</Label>
              <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0901234567" className="text-sm" />
              {errors.phone && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Mã số thuế <InfoTip text="10 hoặc 13 chữ số, in trên hoá đơn VAT" />
              </Label>
              <Input value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)} placeholder="0123456789" className="text-sm" />
              {errors.taxCode && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{errors.taxCode}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Địa chỉ</Label>
            <Input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Địa chỉ" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Người liên hệ</Label>
            <Input value={form.contactPerson} onChange={e => updateField('contactPerson', e.target.value)} placeholder="Họ tên người liên hệ" className="text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function VendorDetailSheet({ vendor, onClose, onEdit, onDelete }: { vendor: Vendor; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const { data: summary, isLoading } = useVendorSummary(vendor.id)
  const exportTrips = useExportVendorTrips()
  const toast = useToast()

  const handleExport = () => {
    const now = new Date()
    const dateFrom = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-26`
    const dateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-25`
    exportTrips.mutate({ vendorId: vendor.id, dateFrom, dateTo }, {
      onSuccess: () => toast.success('Đã tải file đối soát'),
      onError: () => toast.error('Không thể xuất file'),
    })
  }

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

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Thông tin</p>
              <div className="space-y-1.5">
                {[
                  ['Loại', vendor.type === 'company' ? 'Công ty' : 'Cá nhân'],
                  ['SĐT', vendor.phone],
                  ['MST', vendor.taxCode],
                  ['Địa chỉ', vendor.address],
                  ['Liên hệ', vendor.contactPerson],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-start gap-3">
                    <span className="text-[10px] uppercase tracking-wider w-14 shrink-0 pt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
                    <span className="text-sm" style={{ color: val ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>{val || '—'}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={onEdit} className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}>Sửa</button>
                <button onClick={onDelete} className="text-xs font-medium px-2 py-1 rounded-md" style={{ color: 'var(--theme-status-error)' }}>Xoá</button>
              </div>
            </div>

            {summary?.stats && (
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

            {summary?.drivers && summary.drivers.length > 0 && (
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

            {summary?.reconciliations && summary.reconciliations.length > 0 && (
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
          <Button variant="outline" onClick={handleExport} disabled={exportTrips.isPending} className="flex-1 gap-1.5 text-xs">
            <FileDown size={14} />Xuất đối soát
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 text-xs">Đóng</Button>
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
          onEdit={() => { setEditTarget(detailTarget); setDetailTarget(null) }}
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
      <VendorFormDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        title="Cập nhật nhà thầu"
        saving={updateVendor.isPending}
        initial={editTarget ? { name: editTarget.name, type: editTarget.type ?? 'company', phone: editTarget.phone ?? '', taxCode: editTarget.taxCode ?? '', address: editTarget.address ?? '', contactPerson: editTarget.contactPerson ?? '' } : undefined}
      />
    </>
  )
}
