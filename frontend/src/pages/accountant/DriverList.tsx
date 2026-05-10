import { useMemo, useState } from 'react'
import { Plus, Phone, Truck, X } from 'lucide-react'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro/DataTablePro'
import { useDrivers, useCreateDriver } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Driver } from '@/data/domain'

export function DriverList() {
  const toast = useToast()
  const { data: drivers = [], isLoading } = useDrivers()
  const createDriver = useCreateDriver()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ username: '', phone: '', tractorPlate: '', vendor: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const filtered = useMemo(
    () => drivers.filter(d => !search || fuzzyMatch(search, `${d.username} ${d.phone} ${d.tractorPlate ?? ''}`)),
    [drivers, search],
  )

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!form.username.trim()) errors.username = 'Bắt buộc'
    if (!form.phone.trim()) errors.phone = 'Bắt buộc'
    else if (!/^(0|\+?84)[35789]\d{8}$/.test(form.phone)) errors.phone = '10 chữ số bắt đầu bằng 0'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    createDriver.mutate(
      { username: form.username.trim(), phone: form.phone.trim(), tractorPlate: form.tractorPlate.trim() || undefined, vendor: form.vendor.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Đã thêm tài xế', form.username)
          setDialogOpen(false)
          setForm({ username: '', phone: '', tractorPlate: '', vendor: '' })
          setFormErrors({})
        },
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message ?? 'Không thể thêm tài xế'
          toast.error('Lỗi', msg)
        },
      },
    )
  }

  const columns: Column<Driver>[] = [
    { key: 'name', header: 'Tài xế', accessor: d => <span className="font-medium">{d.username}</span>, sortable: true, sortKey: d => d.username },
    { key: 'phone', header: 'SĐT', accessor: d => d.phone, sortable: true },
    { key: 'plate', header: 'Biển số xe', accessor: d => d.tractorPlate ?? <span style={{ color: 'var(--theme-text-muted)' }}>—</span>, sortable: true, sortKey: d => d.tractorPlate ?? '' },
    { key: 'vendor', header: 'Nhà xe', accessor: d => d.vendor ?? <span style={{ color: 'var(--theme-text-muted)' }}>—</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="typo-h1">Tài xế</h1>
          <p className="typo-caption">Danh sách tài xế và thông tin xe</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="h-9 px-4 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 shrink-0"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Plus className="w-4 h-4" /> Thêm tài xế
        </button>
      </div>

      <input
        type="text"
        placeholder="Tìm tài xế, SĐT, biển số..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-md h-9 px-3 rounded-lg text-sm border"
        style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
      />

      <DataTablePro
        data={filtered}
        columns={columns}
        rowKey={d => d.id}
        loading={isLoading}
        defaultSortKey="name"
        emptyState={<p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{search ? 'Không tìm thấy tài xế' : 'Chưa có tài xế'}</p>}
      />

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDialogOpen(false)}>
          <div className="w-full max-w-md rounded-xl p-5 space-y-4 shadow-xl" style={{ background: 'var(--theme-bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="typo-h2">Thêm tài xế</h2>
              <button onClick={() => setDialogOpen(false)} className="p-1 rounded-lg" style={{ color: 'var(--theme-text-muted)' }}><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="typo-form-label">Tên tài xế *</label>
                <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="w-full h-9 px-3 rounded-lg text-sm border" style={{ background: 'var(--theme-bg-secondary)', borderColor: formErrors.username ? 'var(--theme-status-error)' : 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
                {formErrors.username && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{formErrors.username}</p>}
              </div>
              <div className="space-y-1">
                <label className="typo-form-label">SĐT *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full h-9 pl-9 pr-3 rounded-lg text-sm border" style={{ background: 'var(--theme-bg-secondary)', borderColor: formErrors.phone ? 'var(--theme-status-error)' : 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
                </div>
                {formErrors.phone && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{formErrors.phone}</p>}
              </div>
              <div className="space-y-1">
                <label className="typo-form-label">Biển số xe đầu kéo</label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                  <input value={form.tractorPlate} onChange={e => setForm(f => ({ ...f, tractorPlate: e.target.value }))} placeholder="VD: 29C-12345" className="w-full h-9 pl-9 pr-3 rounded-lg text-sm border" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="typo-form-label">Nhà xe</label>
                <input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} className="w-full h-9 px-3 rounded-lg text-sm border" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setDialogOpen(false)} className="h-9 px-4 rounded-lg text-sm" style={{ color: 'var(--theme-text-secondary)' }}>Huỷ</button>
              <button onClick={handleSubmit} disabled={createDriver.isPending} className="h-9 px-4 rounded-lg text-sm font-medium" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', opacity: createDriver.isPending ? 0.6 : 1 }}>
                {createDriver.isPending ? 'Đang thêm...' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
