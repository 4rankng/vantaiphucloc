import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Building2, UserCircle } from 'lucide-react'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { InfoRow } from '@/components/shared/InfoRow'
import { apiClient } from '@/services/api'
import type { Client, ClientType } from '@/data/mockData'

const EMPTY_CLIENT = {
  name: '', type: 'company' as ClientType, taxCode: '', address: '', phone: '', contactPerson: '',
}

export function ClientList() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  // Detail dialog
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY_CLIENT)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const loadClients = useCallback(async () => {
    const res = await apiClient.getClients()
    if (res.success) setClients(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

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

  const handleSubmit = useCallback(async () => {
    if (editing) {
      await apiClient.updateClient(editing.id, form)
    } else {
      await apiClient.createClient(form)
    }
    setDialogOpen(false)
    loadClients()
  }, [editing, form, loadClients])

  const handleDelete = useCallback(async (id: string) => {
    await apiClient.deleteClient(id)
    setDeleteConfirm(null)
    setSelectedClient(null)
    loadClients()
  }, [loadClients])

  const updateField = useCallback((field: string, value: string | number) => {
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
      {/* Client list — clean cards, tap to see detail */}
      <div className="space-y-2">
        {clients.map(client => (
          <button
            key={client.id}
            onClick={() => setSelectedClient(client)}
            className="w-full text-left rounded-2xl p-3 transition-all active:scale-[0.98] touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--theme-bg-tertiary)' }}>
                {client.type === 'company'
                  ? <Building2 className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
                  : <UserCircle className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{client.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                  {client.phone}{client.taxCode ? ` · MST: ${client.taxCode}` : ''}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

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
            <Button onClick={() => handleOpenEdit(selectedClient!)} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
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
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mã số thuế</Label>
              <Input value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)} placeholder="0123456789" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Địa chỉ</Label>
              <Input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Địa chỉ" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điện thoại</Label>
              <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0225-123-456" className="text-sm" />
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

      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={handleOpenCreate} label="Thêm khách hàng" />
    </div>
  )
}
