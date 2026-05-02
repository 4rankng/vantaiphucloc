import { useCallback, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Building2, UserCircle } from 'lucide-react'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  useClients, useCreateClient, useUpdateClient, useDeleteClient,
} from '@/hooks/use-queries'
import type { Client, ClientType } from '@/data/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const EMPTY_FORM = {
  name: '',
  type: 'company' as ClientType,
  taxCode: '',
  address: '',
  phone: '',
  contactPerson: '',
  code: '',
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

interface ClientFormDialogProps {
  open: boolean
  onClose: () => void
  editing: Client | null
}

function ClientFormDialog({ open, onClose, editing }: ClientFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()

  // Sync form when dialog opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setForm(
        editing
          ? {
              name: editing.name,
              type: editing.type,
              taxCode: editing.taxCode ?? '',
              address: editing.address ?? '',
              phone: editing.phone,
              contactPerson: editing.contactPerson ?? '',
              code: editing.code ?? '',
            }
          : EMPTY_FORM,
      )
    } else {
      onClose()
    }
  }, [editing, onClose])

  const updateField = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(() => {
    if (editing) {
      updateClient.mutate({ id: editing.id, data: form }, { onSuccess: onClose })
    } else {
      createClient.mutate(form, { onSuccess: onClose })
    }
  }, [editing, form, createClient, updateClient, onClose])

  const isPending = createClient.isPending || updateClient.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Sửa khách hàng' : 'Thêm khách hàng'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loại */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại</Label>
            <div className="flex gap-2">
              {(['company', 'individual'] as ClientType[]).map(t => (
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

          {/* Tên */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Tên khách hàng <span style={{ color: 'var(--theme-status-error)' }}>*</span>
            </Label>
            <Input
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Tên khách hàng"
              className="text-sm"
              autoFocus
            />
          </div>

          {/* Mã KH + Điện thoại */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mã KH</Label>
              <Input
                value={form.code}
                onChange={e => updateField('code', e.target.value)}
                placeholder="KH-001"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Điện thoại <span style={{ color: 'var(--theme-status-error)' }}>*</span>
              </Label>
              <Input
                value={form.phone}
                onChange={e => updateField('phone', e.target.value)}
                placeholder="0901234567"
                className="text-sm"
              />
            </div>
          </div>

          {/* MST */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mã số thuế</Label>
            <Input
              value={form.taxCode}
              onChange={e => updateField('taxCode', e.target.value)}
              placeholder="0123456789"
              className="text-sm"
            />
          </div>

          {/* Địa chỉ */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Địa chỉ</Label>
            <Input
              value={form.address}
              onChange={e => updateField('address', e.target.value)}
              placeholder="Địa chỉ"
              className="text-sm"
            />
          </div>

          {/* Người liên hệ */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Người liên hệ</Label>
            <Input
              value={form.contactPerson}
              onChange={e => updateField('contactPerson', e.target.value)}
              placeholder="Họ tên"
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isPending}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.name.trim() || !form.phone.trim() || isPending}
            className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {editing ? 'Cập nhật' : 'Thêm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

interface DeleteDialogProps {
  client: Client | null
  onClose: () => void
}

function DeleteDialog({ client, onClose }: DeleteDialogProps) {
  const deleteClient = useDeleteClient()

  const handleDelete = useCallback(() => {
    if (!client) return
    deleteClient.mutate(client.id, { onSuccess: onClose })
  }, [client, deleteClient, onClose])

  return (
    <Dialog open={!!client} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xoá khách hàng?</DialogTitle>
        </DialogHeader>
        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Bạn có chắc muốn xoá <strong style={{ color: 'var(--theme-text-primary)' }}>{client?.name}</strong>?
          Hành động này không thể hoàn tác.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleDelete}
            disabled={deleteClient.isPending}
          >
            Xoá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Mobile card list ─────────────────────────────────────────────────────────

interface MobileListProps {
  clients: Client[]
  onEdit: (c: Client) => void
  onDelete: (c: Client) => void
}

function MobileList({ clients, onEdit, onDelete }: MobileListProps) {
  if (clients.length === 0) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
      >
        <Building2 className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Chưa có khách hàng</p>
        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn + để thêm khách hàng mới</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {clients.map(client => (
        <div
          key={client.id}
          className="rounded-2xl p-3"
          style={{
            background: 'var(--theme-bg-secondary)',
            boxShadow: 'var(--theme-shadow-card)',
            border: '1px solid var(--theme-border-default)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'var(--theme-bg-tertiary)' }}
            >
              {client.type === 'company'
                ? <Building2 className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
                : <UserCircle className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {client.code && (
                  <span className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>
                    {client.code}
                  </span>
                )}
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
                  {client.name}
                </p>
                <Badge variant={client.isActive !== false ? 'success' : 'danger'} className="text-[10px] px-1.5 py-0">
                  {client.isActive !== false ? 'Hoạt động' : 'Ngừng'}
                </Badge>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                {client.phone}
                {client.taxCode ? ` · MST: ${client.taxCode}` : ''}
              </p>
              {client.contactPerson && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                  Liên hệ: {client.contactPerson}
                </p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onEdit(client)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--theme-bg-tertiary)]"
                style={{ color: 'var(--theme-text-muted)' }}
                aria-label="Sửa"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(client)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                style={{ color: 'var(--theme-status-error)' }}
                aria-label="Xoá"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Desktop table ────────────────────────────────────────────────────────────

interface DesktopTableProps {
  clients: Client[]
  onEdit: (c: Client) => void
  onDelete: (c: Client) => void
}

function DesktopTable({ clients, onEdit, onDelete }: DesktopTableProps) {
  if (clients.length === 0) {
    return (
      <div
        className="rounded-xl p-16 text-center"
        style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
      >
        <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Chưa có khách hàng</p>
        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn "+ Thêm khách hàng" để bắt đầu</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--theme-border-default)' }}
    >
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: 'var(--theme-bg-secondary)', borderBottom: '1px solid var(--theme-border-default)' }}>
            {['MÃ KH', 'TÊN KHÁCH HÀNG', 'SỐ ĐIỆN THOẠI', 'NGƯỜI LIÊN HỆ', 'TRẠNG THÁI', 'NGÀY TẠO', ''].map(h => (
              <th
                key={h}
                className="text-left px-4 py-3 text-[11px] font-semibold tracking-wide"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((client, idx) => (
            <tr
              key={client.id}
              className="transition-colors hover:bg-[var(--theme-bg-tertiary)]"
              style={{
                background: idx % 2 === 0 ? 'var(--theme-bg-primary)' : 'var(--theme-bg-secondary)',
                borderBottom: '1px solid var(--theme-border-light)',
              }}
            >
              {/* Mã KH */}
              <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {client.code ?? '—'}
              </td>

              {/* Tên */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--theme-bg-tertiary)' }}
                  >
                    {client.type === 'company'
                      ? <Building2 className="h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                      : <UserCircle className="h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />}
                  </div>
                  <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {client.name}
                  </span>
                </div>
              </td>

              {/* Điện thoại */}
              <td className="px-4 py-3" style={{ color: 'var(--theme-text-secondary)' }}>
                {client.phone}
              </td>

              {/* Người liên hệ */}
              <td className="px-4 py-3" style={{ color: 'var(--theme-text-secondary)' }}>
                {client.contactPerson ?? '—'}
              </td>

              {/* Trạng thái */}
              <td className="px-4 py-3">
                <Badge
                  variant={client.isActive !== false ? 'success' : 'danger'}
                  className="text-xs"
                >
                  {client.isActive !== false ? 'Hoạt động' : 'Ngừng'}
                </Badge>
              </td>

              {/* Ngày tạo */}
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {formatDate(client.createdAt)}
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => onEdit(client)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--theme-bg-tertiary)]"
                    style={{ color: 'var(--theme-text-muted)' }}
                    aria-label="Sửa"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(client)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                    style={{ color: 'var(--theme-status-error)' }}
                    aria-label="Xoá"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CustomerManagement() {
  const { data: clients = [], isLoading } = useClients()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.code ?? '').toLowerCase().includes(q) ||
      c.phone.includes(q),
    )
  }, [clients, search])

  const handleOpenCreate = useCallback(() => {
    setEditing(null)
    setFormOpen(true)
  }, [])

  const handleOpenEdit = useCallback((client: Client) => {
    setEditing(client)
    setFormOpen(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setFormOpen(false)
    setEditing(null)
  }, [])

  const handleCloseDelete = useCallback(() => {
    setDeleting(null)
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
          Khách hàng
        </h1>
        {/* Desktop add button */}
        <button
          onClick={handleOpenCreate}
          className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: 'var(--theme-text-primary)', color: 'var(--theme-bg-primary)' }}
        >
          <Plus className="w-4 h-4" />
          Thêm khách hàng
        </button>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 mb-4"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
        }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc mã KH..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--theme-text-primary)' }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-14 rounded-xl animate-pulse"
              style={{ background: 'var(--theme-bg-tertiary)' }}
            />
          ))}
        </div>
      )}

      {/* Mobile list */}
      {!isLoading && (
        <div className="lg:hidden">
          <MobileList clients={filtered} onEdit={handleOpenEdit} onDelete={setDeleting} />
        </div>
      )}

      {/* Desktop table */}
      {!isLoading && (
        <div className="hidden lg:block">
          <DesktopTable clients={filtered} onEdit={handleOpenEdit} onDelete={setDeleting} />
        </div>
      )}

      {/* Result count */}
      {!isLoading && search && (
        <p className="text-xs mt-3" style={{ color: 'var(--theme-text-muted)' }}>
          {filtered.length} kết quả cho "{search}"
        </p>
      )}

      {/* Mobile FAB */}
      <div className="lg:hidden">
        <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={handleOpenCreate} />
      </div>

      {/* Dialogs */}
      <ClientFormDialog open={formOpen} onClose={handleCloseForm} editing={editing} />
      <DeleteDialog client={deleting} onClose={handleCloseDelete} />
    </div>
  )
}
