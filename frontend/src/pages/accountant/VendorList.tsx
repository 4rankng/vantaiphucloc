import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, Truck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { InfoRow } from '@/components/shared/InfoRow'
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/use-queries'
import type { VendorFormData } from '@/services/api/vendors.api'
import type { Vendor } from '@/services/api/vendors.api'

const EMPTY_FORM: VendorFormData = {
  name: '', type: 'company', taxCode: '', address: '', phone: '', contactPerson: '',
}

export function VendorList() {
  const { data: vendors = [], isLoading: loading } = useVendors()

  const [selected, setSelected] = useState<Vendor | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState<VendorFormData>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const handleOpenCreate = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }, [])

  const handleOpenEdit = useCallback((v: Vendor) => {
    setEditing(v)
    setForm({
      name: v.name, type: v.type ?? 'company', taxCode: v.taxCode ?? '',
      address: v.address ?? '', phone: v.phone ?? '',
      contactPerson: v.contactPerson ?? '',
    })
    setSelected(null)
    setDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    if (editing) {
      updateVendor.mutate({ id: editing.id, data: form }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createVendor.mutate(form, { onSuccess: () => setDialogOpen(false) })
    }
  }, [editing, form, createVendor, updateVendor])

  const handleDelete = useCallback((id: number) => {
    deleteVendor.mutate(id, {
      onSuccess: () => { setDeleteConfirm(null); setSelected(null) },
    })
  }, [deleteVendor])

  const updateField = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-lg skeleton-shimmer" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Nhà thầu" lucideIcon={Truck} onAdd={handleOpenCreate} addLabel="Thêm" />

      {vendors.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Truck className="w-16 h-16" style={{ color: 'var(--theme-text-muted)' }} />}
            title="Chưa có nhà thầu"
            description="Nhấn + để thêm nhà thầu mới"
            compact
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
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
                </div>
              </div>
            </button>
          ))}
        </div>
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
                <Input value={form.phone ?? ''} onChange={e => updateField('phone', e.target.value)} placeholder="0123456789" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="typo-form-label">Mã số thuế</Label>
                <Input value={form.taxCode ?? ''} onChange={e => updateField('taxCode', e.target.value)} placeholder="MST" className="text-sm" />
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
    </div>
  )
}
