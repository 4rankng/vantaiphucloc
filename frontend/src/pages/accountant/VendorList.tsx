import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Truck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { useIsMobile } from '@/hooks/use-mobile'
import { EmptyState } from '@/components/shared/EmptyState'
import { InfoRow } from '@/components/shared/InfoRow'
import { SettingsPageLayout } from '@/components/shared/SettingsPageLayout'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro/DataTablePro'
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import type { VendorFormData } from '@/services/api/vendors.api'
import type { Vendor } from '@/services/api/vendors.api'

const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/

const EMPTY_FORM: VendorFormData = {
  name: '', type: 'company', taxCode: '', address: '', phone: '', contactPerson: '',
}

export function VendorList() {
  const isMobile = useIsMobile(768)
  const { data: vendors = [], isLoading: loading } = useVendors()
  const toast = useToast()

  const [selected, setSelected] = useState<Vendor | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState<VendorFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<{ phone?: string; taxCode?: string }>({})
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const handleOpenCreate = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setDialogOpen(true)
  }, [])

  const handleOpenEdit = useCallback((v: Vendor) => {
    setEditing(v)
    setForm({
      name: v.name, type: v.type ?? 'company', taxCode: v.taxCode ?? '',
      address: v.address ?? '', phone: v.phone ?? '',
      contactPerson: v.contactPerson ?? '',
    })
    setFormErrors({})
    setSelected(null)
    setDialogOpen(true)
  }, [])

  const validateForm = useCallback((): boolean => {
    const errors: { phone?: string; taxCode?: string } = {}
    if (form.phone && !VN_PHONE_RE.test(form.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'SĐT không hợp lệ (VD: 0912345678)'
    }
    if (form.taxCode && !VN_TAX_RE.test(form.taxCode)) {
      errors.taxCode = 'MST phải 10 hoặc 13 chữ số'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [form.phone, form.taxCode])

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return
    if (editing) {
      updateVendor.mutate({ id: editing.id, data: form }, {
        onSuccess: () => { toast.success('Đã cập nhật', editing.name); setDialogOpen(false) },
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message ?? 'Không thể cập nhật'
          toast.error('Lỗi', msg)
        },
      })
    } else {
      createVendor.mutate(form, {
        onSuccess: () => { toast.success('Đã tạo', form.name); setDialogOpen(false) },
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message ?? 'Không thể tạo'
          toast.error('Lỗi', msg)
        },
      })
    }
  }, [editing, form, createVendor, updateVendor, validateForm, toast])

  const handleDelete = useCallback((id: number) => {
    deleteVendor.mutate(id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteConfirm(null); setSelected(null) },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? 'Không thể xoá'
        toast.error('Không thể xoá', msg)
        setDeleteConfirm(null)
      },
    })
  }, [deleteVendor, toast])

  const updateField = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'phone' || field === 'taxCode') {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }, [])

  const columns: Column<Vendor>[] = useMemo(() => [
    { key: 'name', header: 'Tên', accessor: v => <span className="font-medium">{v.name}</span>, sortable: true },
    { key: 'phone', header: 'SĐT', accessor: v => v.phone ?? '—' },
    { key: 'taxCode', header: 'MST', accessor: v => v.taxCode ?? '—' },
    { key: 'type', header: 'Loại', accessor: v => v.type === 'company' ? 'Công ty' : 'Cá nhân' },
    { key: 'address', header: 'Địa chỉ', accessor: v => v.address ?? '—', hideOnMobile: true },
  ], [])

  if (loading) {
    return (
      <SettingsPageLayout
        title="Nhà thầu"
        subtitle="Quản lý đơn vị vận chuyển"
        icon={Truck}
        iconColor="var(--theme-status-warning)"
      >
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </SettingsPageLayout>
    )
  }

  return (
    <SettingsPageLayout
      title="Nhà thầu"
      subtitle="Quản lý đơn vị vận chuyển"
      icon={Truck}
      iconColor="var(--theme-status-warning)"
      actions={
        <button onClick={handleOpenCreate} className="btn-primary">
          <Plus size={16} strokeWidth={2.25} />
          {!isMobile && <span>Thêm nhà thầu</span>}
        </button>
      }
    >
      {vendors.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Truck className="w-16 h-16" style={{ color: 'var(--theme-text-muted)' }} />}
            title="Chưa có nhà thầu"
            description="Nhấn + để thêm nhà thầu mới"
            compact
          />
        </div>
      ) : isMobile ? (
        <div className="grid grid-cols-1 gap-3">
          {vendors.map(v => (
            <button
              key={v.id}
              onClick={() => setSelected(v)}
              className="card-interactive p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--theme-status-warning-light, color-mix(in srgb, var(--theme-status-warning) 12%, transparent))' }}>
                  <Truck className="h-4 w-4" style={{ color: 'var(--theme-status-warning)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{v.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                    {v.phone ?? '—'}{v.taxCode ? ` · MST: ${v.taxCode}` : ''}
                  </p>
                  {v.address && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>{v.address}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <DataTablePro
          data={vendors}
          columns={columns}
          rowKey={v => v.id}
          onRowClick={v => setSelected(v)}
          defaultSortKey="name"
          emptyState={<p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có nhà thầu</p>}
        />
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-1">
              <InfoRow label="Loại" value={selected.type === 'company' ? 'Công ty' : 'Cá nhân'} />
              <InfoRow label="Điện thoại" value={selected.phone ?? '—'} />
              {selected.taxCode && <InfoRow label="Mã số thuế" value={selected.taxCode} />}
              {selected.address && <InfoRow label="Địa chỉ" value={selected.address} />}
              {selected.contactPerson && <InfoRow label="Người liên hệ" value={selected.contactPerson} />}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(selected!.id)} className="flex-1" style={{ color: 'var(--theme-status-error)' }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Xoá
            </Button>
            <Button onClick={() => handleOpenEdit(selected!)} className="flex-1 btn-primary">
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Sửa nhà thầu' : 'Thêm nhà thầu'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="typo-form-label">Tên</Label>
              <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Tên nhà thầu" className="text-sm" autoFocus />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Loại</Label>
              <div className="flex gap-2">
                {(['company', 'individual'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => updateField('type', t)}
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: form.type === t ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                      color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                    }}
                  >
                    {t === 'company' ? 'Công ty' : 'Cá nhân'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="typo-form-label">Số điện thoại</Label>
                <Input value={form.phone ?? ''} onChange={e => updateField('phone', e.target.value)} placeholder="0912345678" className="text-sm" />
                {formErrors.phone && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{formErrors.phone}</p>}
                {!formErrors.phone && <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>10 chữ số bắt đầu bằng 0</p>}
              </div>
              <div className="space-y-2">
                <Label className="typo-form-label">Mã số thuế</Label>
                <Input value={form.taxCode ?? ''} onChange={e => updateField('taxCode', e.target.value)} placeholder="0123456789" className="text-sm" />
                {formErrors.taxCode && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{formErrors.taxCode}</p>}
                {!formErrors.taxCode && <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>10 hoặc 13 chữ số (không dấu cách)</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Địa chỉ</Label>
              <Input value={form.address ?? ''} onChange={e => updateField('address', e.target.value)} placeholder="Địa chỉ" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Người liên hệ</Label>
              <Input value={form.contactPerson ?? ''} onChange={e => updateField('contactPerson', e.target.value)} placeholder="Người liên hệ" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim()} className="flex-1 btn-primary">
              {editing ? 'Cập nhật' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá nhà thầu?</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Huỷ</Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageLayout>
  )
}
