import { useState, useMemo, useCallback } from 'react'
import { Building2, Plus, Phone, MapPin, User, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label } from '@/components/ui'
import { AccountantPageShell } from '@/components/shared/AccountantPageShell'
import { EntityTable, type EntityColumn } from '@/components/shared/EntityTable'
import { InfoTip } from '@/components/shared/InfoTip'
import { usePartners, useCreatePartner, useUpdatePartner, useDeletePartner } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Partner } from '@/data/domain'

const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/

const EMPTY_FORM = { name: '', type: 'company' as const, phone: '', taxCode: '', address: '', contactPerson: '' }

function ClientFormDialog({
  open, onClose, onSave, title, initial, saving,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: typeof EMPTY_FORM) => void
  title: string
  initial?: Partial<typeof EMPTY_FORM>
  saving?: boolean
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const errs: Record<string, string> = {}
    if (form.phone && !VN_PHONE_RE.test(form.phone.replace(/[\s-]/g, ''))) errs.phone = 'SĐT không hợp lệ'
    if (form.taxCode && !VN_TAX_RE.test(form.taxCode)) errs.taxCode = 'MST phải 10 hoặc 13 chữ số'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave({ ...form, name: form.name.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Tên chủ hàng <span style={{ color: 'var(--theme-status-error)' }}>*</span>
            </Label>
            <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Tên chủ hàng" className="text-sm" autoFocus />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại</Label>
            <div className="flex gap-2">
              {(['company', 'individual'] as const).map(t => (
                <button key={t} type="button" onClick={() => updateField('type', t)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: form.type === t ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}
                >{t === 'company' ? 'Công ty' : 'Cá nhân'}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điện thoại</Label>
              <Input value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0912345678" className="text-sm" />
              {errors.phone && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Mã số thuế <InfoTip text="10 hoặc 13 chữ số, in trên hoá đơn VAT" />
              </Label>
              <Input value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)} placeholder="0123456789" className="text-sm" />
              {errors.taxCode && <p className="text-xs" style={{ color: 'var(--theme-status-error)' }}>{errors.taxCode}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Địa chỉ</Label>
            <Input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Địa chỉ" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Người liên hệ</Label>
            <Input value={form.contactPerson} onChange={e => updateField('contactPerson', e.target.value)} placeholder="Họ tên người liên hệ" className="text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ClientsPage() {
  const toast = useToast()
  const { data: partners = [], isLoading } = usePartners({ partnerType: 'client' })
  const createPartner = useCreatePartner()
  const updatePartner = useUpdatePartner()
  const deletePartner = useDeletePartner()

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Partner | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null)
  const [detailTarget, setDetailTarget] = useState<Partner | null>(null)

  const clients = useMemo(() => partners.filter(p => p.partnerType === 'client'), [partners])

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search
    return clients.filter(p =>
      fuzzyMatch(p.name, q) || fuzzyMatch(p.phone ?? '', q) || fuzzyMatch(p.taxCode ?? '', q) || fuzzyMatch(p.address ?? '', q)
    )
  }, [clients, search])

  const handleCreate = useCallback((data: typeof EMPTY_FORM) => {
    createPartner.mutate({ ...data, partnerType: 'client' }, {
      onSuccess: () => { toast.success('Đã thêm chủ hàng'); setShowCreate(false) },
      onError: () => toast.error('Không thể thêm chủ hàng'),
    })
  }, [createPartner, toast])

  const handleUpdate = useCallback((data: typeof EMPTY_FORM) => {
    if (!editTarget) return
    updatePartner.mutate({ id: editTarget.id, ...data }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setEditTarget(null) },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [editTarget, updatePartner, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deletePartner.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setDetailTarget(null) },
      onError: (err: unknown) => {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error('Không thể xoá', detail ?? `${deleteTarget.name} có dữ liệu liên quan.`)
      },
    })
  }, [deleteTarget, deletePartner, toast])

  const columns: EntityColumn<Partner>[] = useMemo(() => [
    {
      key: 'name', header: 'Tên chủ hàng', className: '2fr',
      render: (p) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{p.name}</p>
          {p.taxCode && <p className="text-xs mt-0.5 font-mono-num" style={{ color: 'var(--theme-text-muted)' }}>MST: {p.taxCode}</p>}
        </div>
      ),
    },
    {
      key: 'phone', header: 'Điện thoại', className: '1fr',
      render: (p) => (
        <span className="flex items-center gap-1.5 text-sm" style={{ color: p.phone ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>
          {p.phone ? <><Phone size={13} className="shrink-0" style={{ opacity: 0.5 }} />{p.phone}</> : '—'}
        </span>
      ),
    },
    {
      key: 'address', header: 'Địa chỉ', className: '1.5fr',
      render: (p) => (
        <span className="flex items-start gap-1.5 text-sm truncate" style={{ color: p.address ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>
          {p.address ? <><MapPin size={13} className="shrink-0 mt-0.5" style={{ opacity: 0.5 }} /><span className="line-clamp-1">{p.address}</span></> : '—'}
        </span>
      ),
    },
    {
      key: 'contact', header: 'Liên hệ', className: '1fr',
      render: (p) => (
        <span className="flex items-center gap-1.5 text-sm" style={{ color: p.contactPerson ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>
          {p.contactPerson ? <><User size={13} className="shrink-0" style={{ opacity: 0.5 }} />{p.contactPerson}</> : '—'}
        </span>
      ),
    },
  ], [])

  return (
    <>
      <AccountantPageShell
        title="Chủ hàng"
        subtitle="Quản lý thông tin chủ hàng vận chuyển"
        icon={Building2}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên, MST, SĐT..."
        count={filtered.length}
        countLabel={`${filtered.length} chủ hàng`}
        onAdd={() => setShowCreate(true)}
        addLabel="Thêm"
        addIcon={Plus}
        addHintKey="clients-add"
      >
        <EntityTable<Partner>
          columns={columns}
          data={filtered}
          onRowClick={setDetailTarget}
          rowKey={p => p.id}
          sectionTitle="Danh sách chủ hàng"
          sectionIcon={Building2}
          sectionRight={<span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{filtered.length} chủ hàng</span>}
          emptyIcon={Building2}
          emptyText="Chưa có chủ hàng nào."
          emptyAddLabel="Thêm chủ hàng"
          onEmptyAdd={() => setShowCreate(true)}
          emptyHintKey="clients-add-empty"
          loading={isLoading}
        />
      </AccountantPageShell>

      {/* Detail dialog */}
      <Dialog open={!!detailTarget} onOpenChange={() => setDetailTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detailTarget?.name}</DialogTitle></DialogHeader>
          {detailTarget && (
            <div className="divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
              <div className="py-2.5 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider w-20 shrink-0" style={{ color: 'var(--theme-text-muted)' }}>Loại</span>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}>
                  {detailTarget.type === 'company' ? 'Công ty' : 'Cá nhân'}
                </span>
              </div>
              <div className="py-2.5 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider w-20 shrink-0" style={{ color: 'var(--theme-text-muted)' }}>SĐT</span>
                <span className="text-sm" style={{ color: detailTarget.phone ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>{detailTarget.phone || '—'}</span>
              </div>
              <div className="py-2.5 flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider w-20 shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
                  MST <InfoTip text="Mã số thuế — in trên hoá đơn VAT" />
                </span>
                <span className="text-sm font-mono-num" style={{ color: detailTarget.taxCode ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>{detailTarget.taxCode || '—'}</span>
              </div>
              <div className="py-2.5 flex items-start gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider w-20 shrink-0 mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Địa chỉ</span>
                <span className="text-sm" style={{ color: detailTarget.address ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>{detailTarget.address || '—'}</span>
              </div>
              <div className="py-2.5 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider w-20 shrink-0" style={{ color: 'var(--theme-text-muted)' }}>Liên hệ</span>
                <span className="text-sm" style={{ color: detailTarget.contactPerson ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>{detailTarget.contactPerson || '—'}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(detailTarget); setDetailTarget(null) }} className="flex-1" style={{ color: 'var(--theme-status-error)' }}>Xoá</Button>
            <Button variant="outline" onClick={() => { setEditTarget(detailTarget); setDetailTarget(null) }} className="flex-1">Sửa</Button>
            <Button variant="outline" onClick={() => setDetailTarget(null)} className="flex-1">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá chủ hàng?</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 rounded-lg px-3 py-2.5"
            style={{ background: 'color-mix(in srgb, var(--theme-status-error) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-status-error) 15%, transparent)' }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-error)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              <strong style={{ color: 'var(--theme-text-primary)' }}>{deleteTarget?.name}</strong> sẽ bị xoá vĩnh viễn và không thể khôi phục.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} className="flex-1" style={{ background: 'var(--theme-status-error)', color: '#fff' }}>Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create */}
      <ClientFormDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} title="Thêm chủ hàng" saving={createPartner.isPending} />

      {/* Edit */}
      <ClientFormDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        title="Cập nhật chủ hàng"
        saving={updatePartner.isPending}
        initial={editTarget ? { name: editTarget.name, type: editTarget.type ?? 'company', phone: editTarget.phone ?? '', taxCode: editTarget.taxCode ?? '', address: editTarget.address ?? '', contactPerson: editTarget.contactPerson ?? '' } : undefined}
      />
    </>
  )
}
