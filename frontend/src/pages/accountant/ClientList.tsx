import { useCallback, useState } from 'react'
import { Plus, Pencil, Trash2, Building2, UserCircle } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { EmptyState } from '@/components/shared/EmptyState'
import { InfoRow } from '@/components/shared/InfoRow'
import { BrandIcon } from '@/components/atoms/BrandIcon'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/use-queries'
import type { Client, ClientType } from '@/data/domain'

const EMPTY_CLIENT = {
  name: '', type: 'company' as ClientType, taxCode: '', address: '', phone: '', contactPerson: '',
}

export function ClientList() {
  const { data: clients = [], isLoading: loading } = useClients()
  const isMobile = useIsMobile(768)

  // Detail dialog
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY_CLIENT)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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

  const handleDelete = useCallback((id: string) => {
    deleteClient.mutate(id, {
      onSuccess: () => {
        setDeleteConfirm(null)
        setSelectedClient(null)
      },
    })
  }, [deleteClient])

  const updateField = useCallback((field: string, value: string | number) => {
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
      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button onClick={handleOpenCreate} className="btn-primary">
          <Plus size={16} strokeWidth={2.25} />
          {!isMobile && <span>Thêm</span>}
        </button>
      </div>

      {/* Client list — clean cards, tap to see detail */}
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {clients.map(client => (
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
      )}

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedClient?.name}</DialogTitle>
          </DialogHeader>
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
            <Button onClick={() => handleOpenEdit(selectedClient!)} className="flex-1 btn-primary">
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
              <Label className="typo-form-label">Tên</Label>
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
              <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0123456789" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Mã số thuế (MST)</Label>
              <Input value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)} placeholder="MST" className="text-sm" />
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
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá khách hàng?</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Huỷ</Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
