import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Building2, UserCircle, Truck, Phone, MapPin, User } from 'lucide-react'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InfoRow } from '@/components/shared/InfoRow'
import { FilterToolbar, type FilterOption } from '@/components/shared/FilterToolbar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  useClients, useCreateClient, useUpdateClient, useDeleteClient,
  useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor,
} from '@/hooks/use-queries'
import type { Client, ClientType } from '@/data/domain'
import type { Vendor, VendorType } from '@/services/api/vendors.api'

// ─── Types ──────────────────────────────────────────────────────────────────────

type PartnerKind = 'client' | 'vendor'

interface UnifiedPartner {
  id: number
  kind: PartnerKind
  name: string
  type: ClientType | VendorType
  phone: string
  taxCode: string
  address: string
  contactPerson: string
  raw: Client | Vendor
}

// ─── Form state ─────────────────────────────────────────────────────────────────

type PartnerForm = {
  name: string
  type: ClientType | VendorType
  taxCode: string
  address: string
  phone: string
  contactPerson: string
}

const EMPTY_FORM: PartnerForm = {
  name: '', type: 'company', taxCode: '', address: '', phone: '', contactPerson: '',
}

// ─── Filter config ──────────────────────────────────────────────────────────────

const PARTNER_FILTERS: FilterOption[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'client', label: 'Khách hàng', color: 'var(--theme-brand-primary)' },
  { key: 'vendor', label: 'Nhà thầu', color: 'var(--theme-status-warning)' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────────

function toUnified(clients: Client[], vendors: Vendor[]): UnifiedPartner[] {
  const clientRows: UnifiedPartner[] = clients.map(c => ({
    id: c.id,
    kind: 'client' as const,
    name: c.name,
    type: c.type,
    phone: c.phone,
    taxCode: c.taxCode ?? '',
    address: c.address ?? '',
    contactPerson: c.contactPerson ?? '',
    raw: c,
  }))
  const vendorRows: UnifiedPartner[] = vendors.map(v => ({
    id: v.id,
    kind: 'vendor' as const,
    name: v.name,
    type: v.type ?? 'company',
    phone: v.phone ?? '',
    taxCode: v.taxCode ?? '',
    address: v.address ?? '',
    contactPerson: v.contactPerson ?? '',
    raw: v,
  }))
  return [...clientRows, ...vendorRows]
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const letters = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : name.slice(0, 2)
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 select-none"
      style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', opacity: 0.85 }}
    >
      {letters.toUpperCase()}
    </div>
  )
}

// ─── Detail dialog ──────────────────────────────────────────────────────────────

interface DetailDialogProps {
  partner: UnifiedPartner | null
  onClose: () => void
  onEdit: (partner: UnifiedPartner) => void
  onDelete: (partner: UnifiedPartner) => void
}

function DetailDialog({ partner, onClose, onEdit, onDelete }: DetailDialogProps) {
  return (
    <Dialog open={!!partner} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{partner?.name}</DialogTitle>
        </DialogHeader>
        {partner && (
          <div className="space-y-1">
            <InfoRow
              icon={partner.kind === 'client'
                ? (partner.type === 'company' ? Building2 : UserCircle)
                : Truck}
              label="Loại"
              value={partner.kind === 'client' ? 'Khách hàng' : 'Nhà thầu'}
            />
            <InfoRow label="Điện thoại" value={partner.phone || '—'} />
            {partner.taxCode && <InfoRow label="Mã số thuế" value={partner.taxCode} />}
            {partner.address && <InfoRow label="Địa chỉ" value={partner.address} />}
            {partner.contactPerson && <InfoRow label="Người liên hệ" value={partner.contactPerson} />}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => partner && onDelete(partner)} className="flex-1" style={{ color: 'var(--theme-status-error)' }}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Xoá
          </Button>
          <Button onClick={() => partner && onEdit(partner)} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Sửa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Form dialog ────────────────────────────────────────────────────────────────

interface FormDialogProps {
  open: boolean
  onClose: () => void
  kind: PartnerKind
  editing: UnifiedPartner | null
}

function FormDialog({ open, onClose, kind, editing }: FormDialogProps) {
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM)
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen && editing) {
      setForm({
        name: editing.name,
        type: editing.type,
        taxCode: editing.taxCode,
        address: editing.address,
        phone: editing.phone,
        contactPerson: editing.contactPerson,
      })
    } else if (isOpen) {
      setForm(EMPTY_FORM)
    } else {
      onClose()
    }
  }, [editing, onClose])

  const updateField = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(() => {
    if (editing) {
      if (editing.kind === 'client') {
        updateClient.mutate(
          { id: editing.id, data: form as Partial<Client> },
          { onSuccess: onClose },
        )
      } else {
        updateVendor.mutate(
          { id: editing.id, data: form },
          { onSuccess: onClose },
        )
      }
    } else {
      if (kind === 'client') {
        createClient.mutate(form as Omit<Client, 'id'>, { onSuccess: onClose })
      } else {
        createVendor.mutate(form, { onSuccess: onClose })
      }
    }
  }, [editing, kind, form, createClient, createVendor, updateClient, updateVendor, onClose])

  const isPending = createClient.isPending || updateClient.isPending || createVendor.isPending || updateVendor.isPending
  const label = kind === 'client' ? 'khách hàng' : 'nhà thầu'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Sửa ${label}` : `Thêm ${label}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên</Label>
            <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder={`Tên ${label}`} className="text-sm" autoFocus />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại</Label>
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
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mã số thuế</Label>
              <Input value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)} placeholder="0123456789" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điện thoại</Label>
              <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0901234567" className="text-sm" />
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
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isPending}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim() || isPending} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            {editing ? 'Cập nhật' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete dialog ──────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  partner: UnifiedPartner | null
  onClose: () => void
}

function DeleteDialog({ partner, onClose }: DeleteDialogProps) {
  const deleteClient = useDeleteClient()
  const deleteVendor = useDeleteVendor()

  const handleDelete = useCallback(() => {
    if (!partner) return
    if (partner.kind === 'client') {
      deleteClient.mutate(partner.id, { onSuccess: onClose })
    } else {
      deleteVendor.mutate(partner.id, { onSuccess: onClose })
    }
  }, [partner, deleteClient, deleteVendor, onClose])

  const isPending = deleteClient.isPending || deleteVendor.isPending
  const label = partner?.kind === 'client' ? 'khách hàng' : 'nhà thầu'

  return (
    <Dialog open={!!partner} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xoá {label}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          Bạn có chắc muốn xoá <strong style={{ color: 'var(--theme-text-primary)' }}>{partner?.name}</strong>?
          Hành động này không thể hoàn tác.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isPending}>Xác nhận</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export function ClientsAndVendors() {
  const { data: clients = [], isLoading: loadingClients } = useClients()
  const { data: vendors = [], isLoading: loadingVendors } = useVendors()
  const isMobile = useIsMobile()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState<UnifiedPartner | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formKind, setFormKind] = useState<PartnerKind>('client')
  const [editing, setEditing] = useState<UnifiedPartner | null>(null)
  const [deleting, setDeleting] = useState<UnifiedPartner | null>(null)

  const loading = loadingClients || loadingVendors

  const partners = useMemo(() => toUnified(clients, vendors), [clients, vendors])

  const filtered = useMemo(() => {
    let result = partners
    if (filter !== 'ALL') {
      result = result.filter(p => p.kind === filter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.taxCode.includes(q) ||
        p.contactPerson.toLowerCase().includes(q)
      )
    }
    return result
  }, [partners, filter, search])

  const handleOpenCreate = useCallback(() => {
    setEditing(null)
    setFormKind(filter === 'vendor' ? 'vendor' : 'client')
    setFormOpen(true)
  }, [filter])

  const handleOpenEdit = useCallback((partner: UnifiedPartner) => {
    setEditing(partner)
    setFormKind(partner.kind)
    setSelected(null)
    setFormOpen(true)
  }, [])

  const handleCloseForm = useCallback(() => {
    setFormOpen(false)
    setEditing(null)
  }, [])

  // ─── Desktop table ──────────────────────────────────────────────────────────

  const renderDesktop = () => {
    if (!loading && filtered.length === 0) {
      return (
        <div className="rounded-2xl py-16 text-center" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
          <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Không có đối tác</p>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn "+ Thêm" để bắt đầu</p>
        </div>
      )
    }

    return (
      <div className="rounded-2xl border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] overflow-hidden shadow-sm">
        {/* Header */}
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_60px] gap-4 px-5 py-3 border-b border-[var(--theme-border-default)]">
          {['Tên', 'Loại đối tác', 'Điện thoại', 'Địa chỉ', 'Người liên hệ', ''].map(h => (
            <span key={h} className="text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {filtered.map((row, i) => (
          <div
            key={`${row.kind}-${row.id}`}
            onClick={() => setSelected(row)}
            className={`
              hidden lg:grid lg:grid-cols-[2fr_1fr_1fr_1.5fr_1fr_60px] items-center gap-4 px-5 py-3.5
              cursor-pointer transition-colors hover:bg-[var(--theme-bg-tertiary)]
              ${i < filtered.length - 1 ? 'border-b border-[var(--theme-border-default)]' : ''}
            `}
          >
            {/* Name */}
            <div className="flex items-center gap-3 min-w-0">
              <Initials name={row.name} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--theme-text-primary)] truncate">{row.name}</p>
                {row.taxCode && (
                  <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">MST: {row.taxCode}</p>
                )}
              </div>
            </div>

            {/* Partner type badge */}
            <StatusBadge
              variant={row.kind === 'client' ? 'info' : 'warning'}
              label={row.kind === 'client' ? 'Khách hàng' : 'Nhà thầu'}
              size="sm"
            />

            {/* Phone */}
            <div className="flex items-center gap-1.5 text-sm text-[var(--theme-text-secondary)]">
              {row.phone ? (
                <>
                  <Phone size={13} className="shrink-0 text-[var(--theme-text-muted)]" />
                  {row.phone}
                </>
              ) : (
                <span className="text-[var(--theme-text-muted)]">—</span>
              )}
            </div>

            {/* Address */}
            <div className="flex items-start gap-1.5 text-sm text-[var(--theme-text-secondary)]">
              {row.address ? (
                <>
                  <MapPin size={13} className="shrink-0 mt-0.5 text-[var(--theme-text-muted)]" />
                  <span className="line-clamp-2 leading-snug">{row.address}</span>
                </>
              ) : (
                <span className="text-[var(--theme-text-muted)]">—</span>
              )}
            </div>

            {/* Contact person */}
            <div className="flex items-center gap-1.5 text-sm text-[var(--theme-text-secondary)]">
              {row.contactPerson ? (
                <>
                  <User size={13} className="shrink-0 text-[var(--theme-text-muted)]" />
                  {row.contactPerson}
                </>
              ) : (
                <span className="text-[var(--theme-text-muted)]">—</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 justify-end">
              <button
                onClick={e => { e.stopPropagation(); handleOpenEdit(row) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--theme-bg-tertiary)]"
                style={{ color: 'var(--theme-text-muted)' }}
                aria-label="Sửa"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ─── Mobile cards ───────────────────────────────────────────────────────────

  const renderMobile = () => {
    if (!loading && filtered.length === 0) {
      return (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
          <Building2 className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Không có đối tác</p>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn + để thêm mới</p>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {filtered.map(partner => (
          <button
            key={`${partner.kind}-${partner.id}`}
            onClick={() => setSelected(partner)}
            className="w-full text-left rounded-2xl p-3 transition-all active:scale-[0.98] touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'var(--theme-bg-tertiary)' }}>
                {partner.kind === 'client'
                  ? <Building2 className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
                  : <Truck className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{partner.name}</p>
                  <StatusBadge
                    variant={partner.kind === 'client' ? 'info' : 'warning'}
                    label={partner.kind === 'client' ? 'Khách hàng' : 'Nhà thầu'}
                    size="sm"
                  />
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                  {partner.phone}{partner.taxCode ? ` · MST: ${partner.taxCode}` : ''}
                </p>
                {partner.contactPerson && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                    Liên hệ: {partner.contactPerson}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4">
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm tên, điện thoại, MST..."
          statusOptions={PARTNER_FILTERS}
          selectedStatus={filter}
          onStatusChange={setFilter}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Desktop add button */}
          <div className="hidden lg:flex justify-end mb-4">
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'var(--theme-text-primary)', color: 'var(--theme-bg-primary)' }}
            >
              <Plus className="w-4 h-4" />
              Thêm
            </button>
          </div>

          {isMobile ? renderMobile() : renderDesktop()}
        </>
      )}

      {/* Mobile FAB */}
      <div className="lg:hidden">
        <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={handleOpenCreate} />
      </div>

      {/* Dialogs */}
      <DetailDialog
        partner={selected}
        onClose={() => setSelected(null)}
        onEdit={handleOpenEdit}
        onDelete={p => { setSelected(null); setDeleting(p) }}
      />
      <FormDialog open={formOpen} onClose={handleCloseForm} kind={formKind} editing={editing} />
      <DeleteDialog partner={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}
