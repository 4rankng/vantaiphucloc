import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Building2, UserCircle, MoreVertical, Search, Users } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { EmptyState } from '@/components/shared/EmptyState'
import { InfoRow } from '@/components/shared/InfoRow'
import { BrandIcon } from '@/components/atoms/BrandIcon'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro/DataTablePro'
import { SettingsPageLayout } from '@/components/shared/SettingsPageLayout'
import { usePartners, useCreatePartner, useUpdatePartner, useDeletePartner } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Partner } from '@/data/domain'

const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/

/** Derive company vs individual from name keywords or the stored type field. */
function isCompany(client: Partner): boolean {
  const n = client.name?.toLowerCase() ?? ''
  return n.includes('công ty') || n.includes('tnhh') || n.includes('co.') || n.includes('corp') || client.type === 'company'
}

const EMPTY_CLIENT = {
  name: '', type: 'company' as const, taxCode: '', address: '', phone: '', contactPerson: '',
}

export function ClientList() {
  const { data: clients = [], isLoading: loading } = usePartners()
  const isMobile = useIsMobile(768)
  const toast = useToast()

  const [search, setSearch] = useState('')

  // Detail dialog
  const [selectedClient, setSelectedClient] = useState<Partner | null>(null)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)
  const [form, setForm] = useState(EMPTY_CLIENT)
  const [formErrors, setFormErrors] = useState<{ phone?: string; taxCode?: string }>({})

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<Partner | null>(null)
  const [showOverflow, setShowOverflow] = useState(false)

  const createClient = useCreatePartner()
  const updateClient = useUpdatePartner()
  const deleteClient = useDeletePartner()

  const filtered = useMemo(
    () => clients.filter(c => !search || fuzzyMatch(search, `${c.name} ${c.phone} ${c.taxCode ?? ''} ${c.address ?? ''}`)),
    [clients, search],
  )

  const handleOpenCreate = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_CLIENT)
    setFormErrors({})
    setDialogOpen(true)
  }, [])

  const handleOpenEdit = useCallback((client: Partner) => {
    setEditing(client)
    setForm({
      name: client.name, type: client.type, taxCode: client.taxCode ?? '',
      address: client.address ?? '', phone: client.phone,
      contactPerson: client.contactPerson ?? '',
    })
    setFormErrors({})
    setSelectedClient(null)
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
      updateClient.mutate({ id: editing.id, data: form }, {
        onSuccess: () => { toast.success('Đã cập nhật', editing.name); setDialogOpen(false) },
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message ?? 'Không thể cập nhật'
          toast.error('Lỗi', msg)
        },
      })
    } else {
      createClient.mutate(form, {
        onSuccess: () => { toast.success('Đã tạo', form.name); setDialogOpen(false) },
        onError: (err: unknown) => {
          const msg = (err as { message?: string })?.message ?? 'Không thể tạo'
          toast.error('Lỗi', msg)
        },
      })
    }
  }, [editing, form, createClient, updateClient, validateForm, toast])

  const handleDelete = useCallback((client: Partner) => {
    deleteClient.mutate(String(client.id), {
      onSuccess: () => {
        toast.success('Đã xoá', client.name)
        setDeleteConfirm(null)
        setSelectedClient(null)
        setShowOverflow(false)
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message
        toast.error('Không thể xoá', msg ?? `Không thể xoá ${client.name}`)
        setDeleteConfirm(null)
      },
    })
  }, [deleteClient, toast])

  const updateField = useCallback((field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const columns: Column<Partner>[] = useMemo(() => [
    { key: 'name', header: 'Tên', accessor: c => <span className="font-medium">{c.name}</span>, sortable: true, sortKey: c => c.name },
    { key: 'phone', header: 'SĐT', accessor: c => c.phone || <span style={{ color: 'var(--theme-text-muted)' }}>—</span>, sortable: true },
    { key: 'taxCode', header: 'MST', accessor: c => c.taxCode || <span style={{ color: 'var(--theme-text-muted)' }}>—</span>, sortable: true },
    { key: 'type', header: 'Loại', accessor: c => isCompany(c) ? 'Công ty' : 'Cá nhân' },
    { key: 'address', header: 'Địa chỉ', accessor: c => c.address ? <span className="truncate block max-w-[200px]">{c.address}</span> : <span style={{ color: 'var(--theme-text-muted)' }}>—</span> },
  ], [])

  if (loading) {
    return (
      <SettingsPageLayout title="Khách hàng" subtitle="Quản lý thông tin khách hàng" icon={Users} iconColor="var(--theme-status-info)">
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
      title="Khách hàng"
      subtitle="Quản lý thông tin khách hàng"
      icon={Users}
      iconColor="var(--theme-status-info)"
      actions={
        <button onClick={handleOpenCreate} className="btn-primary">
          <Plus size={16} strokeWidth={2.25} />
          {!isMobile && <span>Thêm khách hàng</span>}
        </button>
      }
    >
      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm tên, SĐT, MST..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg text-sm border"
            style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
          />
          <span className="text-xs shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
            {search ? `${filtered.length}/${clients.length}` : `${clients.length}`} khách hàng
          </span>
        </div>
      </div>

      {/* Desktop: Table / Mobile: Cards */}
      {clients.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BrandIcon name="calkey" className="w-24 h-24" />}
            title="Chưa có khách hàng"
            description="Nhấn + để thêm khách hàng mới"
            compact
            illustration
          />
        </div>
      ) : isMobile ? (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(client => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className="card-interactive p-3"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{client.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                    {client.phone}{client.taxCode ? ` · MST: ${client.taxCode}` : ''}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <DataTablePro
          data={filtered}
          columns={columns}
          rowKey={c => c.id}
          loading={loading}
          defaultSortKey="name"
          onRowClick={c => setSelectedClient(c)}
          emptyState={<p className="text-sm py-6 text-center" style={{ color: 'var(--theme-text-muted)' }}>{search ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng'}</p>}
        />
      )}

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => { setSelectedClient(null); setShowOverflow(false) }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selectedClient?.name}</DialogTitle>
              <div className="relative">
                <button
                  onClick={() => setShowOverflow(v => !v)}
                  className="p-1.5 rounded-md hover:bg-[var(--theme-bg-tertiary)]"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  <MoreVertical size={16} />
                </button>
                {showOverflow && selectedClient && (
                  <div className="absolute right-0 top-full mt-1 rounded-lg shadow-lg z-10 py-1 min-w-[140px]" style={{ background: 'var(--theme-bg-primary)', border: '1px solid var(--theme-border-default)' }}>
                    <button
                      onClick={() => { setShowOverflow(false); setDeleteConfirm(selectedClient) }}
                      className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[var(--theme-bg-tertiary)]"
                      style={{ color: 'var(--theme-status-error)' }}
                    >
                      <Trash2 size={14} /> Xoá
                    </button>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-1">
              <InfoRow icon={isCompany(selectedClient) ? Building2 : UserCircle} label="Loại" value={isCompany(selectedClient) ? 'Công ty' : 'Cá nhân'} />
              <InfoRow label="Điện thoại" value={selectedClient.phone} />
              {selectedClient.taxCode && <InfoRow label="Mã số thuế" value={selectedClient.taxCode} />}
              {selectedClient.address && <InfoRow label="Địa chỉ" value={selectedClient.address} />}
              {selectedClient.contactPerson && <InfoRow label="Người liên hệ" value={selectedClient.contactPerson} />}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedClient(null); setShowOverflow(false) }} className="flex-1">Đóng</Button>
            <Button onClick={() => selectedClient && handleOpenEdit(selectedClient)} className="flex-1 btn-primary">
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Sửa khách hàng' : 'Thêm khách hàng'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="typo-form-label">Tên <span style={{ color: 'var(--theme-error, #ef4444)' }}>*</span></Label>
              <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Tên khách hàng" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Loại</Label>
              <select
                value={form.type}
                onChange={e => updateField('type', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-secondary)' }}
              >
                <option value="company">Công ty</option>
                <option value="individual">Cá nhân</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Số điện thoại</Label>
              <Input value={form.phone} onChange={e => { updateField('phone', e.target.value); setFormErrors(p => ({ ...p, phone: undefined })) }} placeholder="0912345678" className="text-sm" />
              {!formErrors.phone && <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>10 chữ số, bắt đầu bằng 0</p>}
              {formErrors.phone && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{formErrors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Mã số thuế (MST)</Label>
              <Input value={form.taxCode} onChange={e => { updateField('taxCode', e.target.value); setFormErrors(p => ({ ...p, taxCode: undefined })) }} placeholder="0123456789" className="text-sm" />
              {!formErrors.taxCode && <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>10 hoặc 13 chữ số (không dấu cách)</p>}
              {formErrors.taxCode && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{formErrors.taxCode}</p>}
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Địa chỉ</Label>
              <Input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Địa chỉ" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Người liên hệ</Label>
              <Input value={form.contactPerson} onChange={e => updateField('contactPerson', e.target.value)} placeholder="Người liên hệ" className="text-sm" />
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
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Xoá khách hàng?"
        description={deleteConfirm ? `Bạn có chắc muốn xoá "${deleteConfirm.name}"? Hành động này không thể hoàn tác.` : ''}
        confirmLabel="Xoá"
      />
    </SettingsPageLayout>
  )
}
