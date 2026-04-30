import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, Building2, UserCircle, Truck } from 'lucide-react'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InfoRow } from '@/components/shared/InfoRow'
import {
  useClients, useCreateClient, useUpdateClient, useDeleteClient,
  useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor,
} from '@/hooks/use-queries'
import type { Client, ClientType } from '@/data/domain'
import type { Vendor } from '@/services/api/vendors.api'

// ─── Khách hàng tab ───────────────────────────────────────────────────────────

const EMPTY_CLIENT = {
  name: '', type: 'company' as ClientType, taxCode: '', address: '', phone: '', contactPerson: '',
}

function ClientsTab() {
  const { data: clients = [], isLoading: loading } = useClients()

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY_CLIENT)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()

  const handleOpenCreate = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_CLIENT)
    setDialogOpen(true)
  }, [])

  const handleOpenEdit = useCallback((client: Client) => {
    setEditing(client)
    setForm({
      name: client.name, type: client.type, taxCode: client.taxCode ?? '',
      address: client.address ?? '', phone: client.phone,
      contactPerson: client.contactPerson ?? '',
    })
    setSelectedClient(null)
    setDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    if (editing) {
      updateClient.mutate({ id: editing.id, data: form }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createClient.mutate(form, { onSuccess: () => setDialogOpen(false) })
    }
  }, [editing, form, createClient, updateClient])

  const handleDelete = useCallback((id: number) => {
    deleteClient.mutate(id, {
      onSuccess: () => { setDeleteConfirm(null); setSelectedClient(null) },
    })
  }, [deleteClient])

  const updateField = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-2">
        {clients.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <Building2 className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Chưa có khách hàng</p>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn + để thêm khách hàng mới</p>
          </div>
        ) : clients.map(client => (
          <button
            key={client.id}
            onClick={() => setSelectedClient(client)}
            className="w-full text-left rounded-2xl p-3 transition-all active:scale-[0.98] touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--theme-bg-tertiary)' }}>
                {client.type === 'company'
                  ? <Building2 className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
                  : <UserCircle className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />}
              </div>
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

      {/* Detail dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedClient?.name}</DialogTitle></DialogHeader>
          {selectedClient && (
            <div className="space-y-1">
              <InfoRow icon={selectedClient.type === 'company' ? Building2 : UserCircle} label="Loại" value={selectedClient.type === 'company' ? 'Công ty' : 'Cá nhân'} />
              <InfoRow label="Điện thoại" value={selectedClient.phone} />
              {selectedClient.taxCode && <InfoRow label="Mã số thuế" value={selectedClient.taxCode} />}
              {selectedClient.address && <InfoRow label="Địa chỉ" value={selectedClient.address} />}
              {selectedClient.contactPerson && <InfoRow label="Người liên hệ" value={selectedClient.contactPerson} />}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(selectedClient!.id)} className="flex-1" style={{ color: 'var(--theme-status-error)' }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Xoá
            </Button>
            <Button onClick={() => handleOpenEdit(selectedClient!)} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Sửa khách hàng' : 'Thêm khách hàng'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên</Label>
              <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Tên khách hàng" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại</Label>
              <div className="flex gap-2">
                {(['company', 'individual'] as ClientType[]).map(t => (
                  <button key={t} onClick={() => updateField('type', t)}
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: form.type === t ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                      color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                    }}>
                    {t === 'company' ? 'Công ty' : 'Cá nhân'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mã số thuế</Label>
                <Input value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)} placeholder="0123456789" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điện thoại</Label>
                <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0225-123-456" className="text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Địa chỉ</Label>
              <Input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Địa chỉ" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Người liên hệ</Label>
              <Input value={form.contactPerson} onChange={e => updateField('contactPerson', e.target.value)} placeholder="Họ tên" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim()} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              {editing ? 'Cập nhật' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá khách hàng?</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Huỷ</Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={handleOpenCreate} label="Thêm khách hàng" />
    </div>
  )
}

// ─── Nhà thầu tab ─────────────────────────────────────────────────────────────

function VendorsTab() {
  const { data: vendors = [], isLoading: loading } = useVendors()

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [name, setName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const handleOpenCreate = useCallback(() => {
    setEditing(null)
    setName('')
    setDialogOpen(true)
  }, [])

  const handleOpenEdit = useCallback((vendor: Vendor) => {
    setEditing(vendor)
    setName(vendor.name)
    setSelectedVendor(null)
    setDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    if (editing) {
      updateVendor.mutate({ id: editing.id, data: { name } }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createVendor.mutate({ name }, { onSuccess: () => setDialogOpen(false) })
    }
  }, [editing, name, createVendor, updateVendor])

  const handleDelete = useCallback((id: number) => {
    deleteVendor.mutate(id, {
      onSuccess: () => { setDeleteConfirm(null); setSelectedVendor(null) },
    })
  }, [deleteVendor])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-2">
        {vendors.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <Truck className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Chưa có nhà thầu</p>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn + để thêm nhà thầu mới</p>
          </div>
        ) : vendors.map(vendor => (
          <button
            key={vendor.id}
            onClick={() => setSelectedVendor(vendor)}
            className="w-full text-left rounded-2xl p-3 transition-all active:scale-[0.98] touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <Truck className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
              </div>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{vendor.name}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedVendor?.name}</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(selectedVendor!.id)} className="flex-1" style={{ color: 'var(--theme-status-error)' }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Xoá
            </Button>
            <Button onClick={() => handleOpenEdit(selectedVendor!)} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Sửa nhà thầu' : 'Thêm nhà thầu'}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên nhà thầu</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tên nhà thầu" className="text-sm" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleSubmit} disabled={!name.trim()} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              {editing ? 'Cập nhật' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá nhà thầu?</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Huỷ</Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={handleOpenCreate} label="Thêm nhà thầu" />
    </div>
  )
}

// ─── Đối tác page ─────────────────────────────────────────────────────────────

type Tab = 'clients' | 'vendors'

export function ClientsAndVendors() {
  const [tab, setTab] = useState<Tab>('clients')

  return (
    <div>
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }}>
        {([
          { key: 'clients', label: 'Khách hàng' },
          { key: 'vendors', label: 'Nhà thầu' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation"
            style={{
              background: tab === key ? 'var(--theme-bg-primary)' : 'transparent',
              color: tab === key ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
              boxShadow: tab === key ? 'var(--theme-shadow-card)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'clients' ? <ClientsTab /> : <VendorsTab />}
    </div>
  )
}
