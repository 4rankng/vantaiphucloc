import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Building2, UserCircle, Truck, Phone, MapPin, User } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InfoRow } from '@/components/shared/InfoRow'
import { FilterToolbar, type FilterOption } from '@/components/shared/FilterToolbar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { fuzzyMatch } from '@/lib/search-utils'
import { useToast } from '@/components/atoms/Toast'
import {
  usePartners, useCreatePartner, useUpdatePartner, useDeletePartner,
} from '@/hooks/use-queries'
import type { Partner } from '@/data/domain'
import { useIsMobile } from '@/hooks/use-mobile'

// ─── Types ──────────────────────────────────────────────────────────────────────

type PartnerKind = 'client' | 'vendor'

interface UnifiedPartner {
  id: number
  kind: PartnerKind
  name: string
  type: 'company' | 'individual'
  phone: string
  taxCode: string
  code: string
  address: string
  contactPerson: string
  raw: Partner
}

// ─── Form state ─────────────────────────────────────────────────────────────────

type PartnerForm = {
  name: string
  type: 'company' | 'individual'
  taxCode: string
  address: string
  phone: string
  contactPerson: string
}

const EMPTY_FORM: PartnerForm = {
  name: '', type: 'company', taxCode: '', address: '', phone: '', contactPerson: '',
}

// ─── Filter config ──────────────────────────────────────────────────────────────

function buildPartnerFilters(counts: { all: number; client: number; vendor: number }): FilterOption[] {
  return [
    { key: 'ALL', label: `Tất cả (${counts.all})` },
    { key: 'client', label: `Khách hàng (${counts.client})`, color: 'var(--theme-brand-primary)' },
    { key: 'vendor', label: `Nhà thầu (${counts.vendor})`, color: 'var(--theme-status-warning)' },
  ]
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'var(--theme-brand-primary)',
  'var(--theme-status-success)',
  'var(--theme-status-warning)',
  'var(--theme-status-info)',
  'var(--theme-status-error)',
]

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function pickAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function toUnified(partners: Partner[]): UnifiedPartner[] {
  return partners.map(p => ({
    id: p.id,
    kind: (p.partnerType === 'vendor' ? 'vendor' : 'client') as PartnerKind,
    name: p.name,
    type: 'company' as const,
    phone: p.phone ?? '',
    taxCode: p.taxCode ?? '',
    code: p.code ?? '',
    address: p.address ?? '',
    contactPerson: p.contactPerson ?? '',
    raw: p,
  }))
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
          <div className="flex items-center justify-between">
            <DialogTitle>{partner?.name}</DialogTitle>
            {partner && (
              <button
                onClick={() => { onDelete(partner) }}
                className="p-1.5 rounded-md hover:bg-[var(--theme-bg-tertiary)]"
                style={{ color: 'var(--theme-status-error)' }}
                title="Xoá"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
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
            <InfoRow label="Mã số thuế" value={partner.taxCode || '—'} />
            <InfoRow label="Địa chỉ" value={partner.address || '—'} />
            <InfoRow label="Người liên hệ" value={partner.contactPerson || '—'} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()} className="flex-1">Đóng</Button>
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

const MST_RE = /^\d{10}(\d{3})?$/
const PHONE_RE = /^(0|\+?84)[35789]\d{8}$/

function FormDialog({ open, onClose, kind, editing }: FormDialogProps) {
  const toast = useToast()
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const createPartner = useCreatePartner()
  const updatePartner = useUpdatePartner()

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(editing ? {
        name: editing.name,
        type: editing.type,
        taxCode: editing.taxCode,
        address: editing.address,
        phone: editing.phone,
        contactPerson: editing.contactPerson,
      } : EMPTY_FORM)
      setErrors({})
    }
  }, [open, editing])

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) onClose()
  }, [onClose])

  const updateField = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
  }, [])

  const handleSubmit = useCallback(() => {
    const validate = (): boolean => {
      const e: Record<string, string> = {}
      if (!form.name.trim()) e.name = 'Vui lòng nhập tên'
      if (form.taxCode && !MST_RE.test(form.taxCode)) e.taxCode = 'MST phải 10 hoặc 13 chữ số'
      if (form.phone && !PHONE_RE.test(form.phone)) e.phone = 'SĐT không hợp lệ (VD: 0901234567)'
      setErrors(e)
      return Object.keys(e).length === 0
    }
    if (!validate()) return
    const onSuccess = () => {
      toast.success(editing ? `Đã cập nhật ${form.name}` : `Đã thêm ${form.name}`)
      onClose()
    }
    if (editing) {
      updatePartner.mutate({ id: editing.id, data: form as Partial<Partner> }, { onSuccess })
    } else {
      createPartner.mutate(form as Omit<Partner, 'id'>, { onSuccess })
    }
  }, [editing, form, createPartner, updatePartner, onClose, toast])

  const isPending = createPartner.isPending || updatePartner.isPending
  const label = kind === 'client' ? 'khách hàng' : 'nhà thầu'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Sửa ${label}` : `Thêm ${label}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên *</Label>
            <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder={`Tên ${label}`} className="text-sm" autoFocus />
            {errors.name && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{errors.name}</p>}
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
              {errors.taxCode && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{errors.taxCode}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điện thoại</Label>
              <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0901234567" className="text-sm" />
              {errors.phone && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{errors.phone}</p>}
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
  const toast = useToast()
  const deletePartner = useDeletePartner()

  const handleDelete = useCallback(() => {
    if (!partner) return
    const onDone = () => {
      toast.success(`Đã xoá ${partner.name}`)
      onClose()
    }
    const onError = (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error('Không thể xoá', detail ?? `${partner.name} có dữ liệu liên quan, không thể xoá.`)
      onClose()
    }
    deletePartner.mutate(partner.id, { onSuccess: onDone, onError })
  }, [partner, deletePartner, onClose, toast])

  const isPending = deletePartner.isPending
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
  const { data: partnersRaw = [], isLoading: loadingPartners } = usePartners()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState<UnifiedPartner | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formKind, setFormKind] = useState<PartnerKind>('client')
  const [editing, setEditing] = useState<UnifiedPartner | null>(null)
  const [deleting, setDeleting] = useState<UnifiedPartner | null>(null)

  const loading = loadingPartners
  const isMobile = useIsMobile(1024)

  const partners = useMemo(() => toUnified(partnersRaw), [partnersRaw])

  const partnerCounts = useMemo(() => ({
    all: partners.length,
    client: partners.filter(p => p.kind === 'client').length,
    vendor: partners.filter(p => p.kind === 'vendor').length,
  }), [partners])

  const partnerFilters = useMemo(() => buildPartnerFilters(partnerCounts), [partnerCounts])

  const filtered = useMemo(() => {
    let result = partners
    if (filter !== 'ALL') {
      result = result.filter(p => p.kind === filter)
    }
    const q = search.trim()
    if (q) {
      result = result.filter(p =>
        fuzzyMatch(p.name, q) ||
        fuzzyMatch(p.phone, q) ||
        fuzzyMatch(p.taxCode, q) ||
        fuzzyMatch(p.contactPerson, q)
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

  // ─── Mobile cards ────────────────────────────────────────────────────────────

  const renderEmpty = () => {
    const hasSearch = search.trim().length > 0
    if (hasSearch) {
      return (
        <div className="card py-16 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
            Không tìm thấy đối tác cho &ldquo;{search}&rdquo;
          </p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-xs font-semibold"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            Xoá tìm kiếm
          </button>
        </div>
      )
    }
    return (
      <div className="card py-16 text-center">
        <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Không có đối tác</p>
        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn "+ Thêm" để bắt đầu</p>
      </div>
    )
  }

  const renderMobile = () => {
    if (filtered.length === 0) {
      return renderEmpty()
    }

    return (
      <div className="space-y-2">
        {filtered.map(row => (
          <button
            key={`${row.kind}-${row.id}`}
            onClick={() => setSelected(row)}
            className="card-interactive p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: row.kind === 'client' ? 'var(--theme-brand-primary-light)' : 'var(--theme-status-warning-light)' }}
                >
                  {row.kind === 'client'
                    ? <Building2 className="h-4 w-4" style={{ color: 'var(--theme-brand-primary)' }} />
                    : <Truck className="h-4 w-4" style={{ color: 'var(--theme-status-warning)' }} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{row.name}</p>
                  {row.taxCode && (
                    <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>MST: {row.taxCode}</p>
                  )}
                </div>
              </div>
              <StatusBadge
                variant={row.kind === 'client' ? 'info' : 'warning'}
                label={row.kind === 'client' ? 'Khách hàng' : 'Nhà thầu'}
                size="sm"
              />
            </div>
            <div className="mt-2 space-y-1">
              {row.phone && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                  <Phone size={12} className="shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                  {row.phone}
                </div>
              )}
              {row.address && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                  <MapPin size={12} className="shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                  <span className="truncate">{row.address}</span>
                </div>
              )}
              {row.contactPerson && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                  <User size={12} className="shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                  {row.contactPerson}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    )
  }

  // ─── Desktop table ──────────────────────────────────────────────────────────

  const renderDesktop = () => {
    if (!loading && filtered.length === 0) {
      return renderEmpty()
    }

    return (
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="overflow-x-auto">
        <div className="grid grid-cols-[200px_100px_100px_120px_180px_150px] gap-4 px-5 py-3 border-b border-[var(--theme-border-default)] min-w-[850px]">
          {['Tên', 'Mã đối tác', 'Nhóm', 'Điện thoại', 'Địa chỉ', 'Người liên hệ'].map(h => (
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
              grid grid-cols-[200px_100px_100px_120px_180px_150px] items-center gap-4 px-5 py-3.5 min-w-[850px]
              cursor-pointer transition-colors hover:bg-[var(--theme-bg-tertiary)]
              ${i < filtered.length - 1 ? 'border-b border-[var(--theme-border-default)]' : ''}
            `}
          >
            {/* Name */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
                style={{ background: pickAvatarColor(row.name) }}
              >
                {getInitials(row.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--theme-text-primary)] truncate">{row.name}</p>
                {row.taxCode && (
                  <p className="text-[11px] text-[var(--theme-text-muted)] mt-0.5">MST: {row.taxCode}</p>
                )}
              </div>
            </div>

            {/* Partner code */}
            <div className="text-xs text-[var(--theme-text-secondary)] truncate">
              {row.code || <span className="text-[var(--theme-text-muted)]">—</span>}
            </div>

            {/* Partner type badge */}
            <StatusBadge
              variant={row.kind === 'client' ? 'info' : 'warning'}
              label={row.kind === 'client' ? 'Khách hàng' : 'Nhà thầu'}
              size="sm"
            />

            {/* Phone */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text-secondary)]">
              {row.phone ? (
                <>
                  <Phone size={12} className="shrink-0 text-[var(--theme-text-muted)]" />
                  {row.phone}
                </>
              ) : (
                <span className="text-[var(--theme-text-muted)]">—</span>
              )}
            </div>

            {/* Address */}
            <div className="flex items-start gap-1.5 text-xs text-[var(--theme-text-secondary)]">
              {row.address ? (
                <>
                  <MapPin size={12} className="shrink-0 mt-0.5 text-[var(--theme-text-muted)]" />
                  <span className="line-clamp-2 leading-snug">{row.address}</span>
                </>
              ) : (
                <span className="text-[var(--theme-text-muted)]">—</span>
              )}
            </div>

            {/* Contact person */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text-secondary)]">
              {row.contactPerson ? (
                <>
                  <User size={12} className="shrink-0 text-[var(--theme-text-muted)]" />
                  {row.contactPerson}
                </>
              ) : (
                <span className="text-[var(--theme-text-muted)]">—</span>
              )}
            </div>
          </div>
        ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button onClick={handleOpenCreate} className="btn-primary">
          <Plus size={16} strokeWidth={2.25} />
          <span>Thêm</span>
        </button>
      </div>

      {/* Filters */}
      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm tên, điện thoại, MST..."
        statusOptions={partnerFilters}
        selectedStatus={filter}
        onStatusChange={setFilter}
      />

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && (isMobile ? renderMobile() : renderDesktop())}

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
