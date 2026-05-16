import { useState, useMemo, useCallback } from 'react'
import { Building2, Plus, AlertTriangle, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label } from '@/components/ui'
import { AccountantPageShell } from '@/components/shared/AccountantPageShell'
import { PulseHint } from '@/components/shared/PulseHint'
import { InfoTip } from '@/components/shared/InfoTip'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useQueryClient } from '@tanstack/react-query'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Client } from '@/data/domain'

const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/
const EMPTY_FORM = { name: '', type: 'company' as const, phone: '', taxCode: '', address: '', contactPerson: '' }

function ClientFormDialog({ open, onClose, onSave, title, initial, saving }: {
  open: boolean; onClose: () => void; onSave: (data: typeof EMPTY_FORM) => void; title: string; initial?: Partial<typeof EMPTY_FORM>; saving?: boolean
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

function ClientDetailDialog({ client, onClose, onEdit, onDelete }: { client: Client; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent hideCloseButton className="p-0 gap-0">
        <DialogHeader className="sr-only"><DialogTitle>{client.name}</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{client.name}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--theme-text-muted)' }} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
          {([
            ['Loại', client.type === 'company' ? 'Công ty' : 'Cá nhân'],
            ['SĐT', client.phone],
            ['MST', client.taxCode],
            ['Địa chỉ', client.address],
            ['Liên hệ', client.contactPerson],
          ] as [string, string | null | undefined][]).map(([label, val]) => (
            <div key={label} className="flex items-start gap-3" style={{ padding: '10px 16px' }}>
              <span className="text-[10px] font-bold uppercase tracking-wider w-14 shrink-0 pt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
              <span className="text-sm" style={{ color: val ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}>{val || '—'}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 16px 14px', borderTop: '0.5px solid var(--theme-border-light)', display: 'flex', gap: 8 }}>
          <button onClick={onDelete} className="text-sm font-medium" style={{ flex: 1, padding: 9, borderRadius: 8, border: '0.5px solid var(--theme-border-light)', background: 'transparent', color: 'var(--theme-status-error)', cursor: 'pointer' }}>Xoá</button>
          <button onClick={onEdit} className="text-sm font-medium" style={{ flex: 1, padding: 9, borderRadius: 8, border: '0.5px solid var(--theme-border-light)', background: 'transparent', color: 'var(--theme-text-secondary)', cursor: 'pointer' }}>Sửa</button>
          <button onClick={onClose} className="text-sm font-medium" style={{ flex: 1, padding: 9, borderRadius: 8, border: '0.5px solid var(--theme-border-light)', background: 'transparent', color: 'var(--theme-text-secondary)', cursor: 'pointer' }}>Đóng</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ClientRow({ client, onOpenDetail }: { client: Client; onOpenDetail: () => void }) {
  const initials = client.name.slice(0, 2).toUpperCase()

  return (
    <tr
      onClick={onOpenDetail}
      style={{ borderBottom: '1px solid var(--theme-border-light)', cursor: 'pointer' }}
      className="transition-colors"
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      <td className="px-4 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold select-none shrink-0"
          style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)', color: 'var(--theme-brand-primary)' }}>
          {initials}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{client.name}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm" style={{ color: client.phone ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>{client.phone || '—'}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm" style={{ color: client.address ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>{client.address || '—'}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-sm" style={{ color: client.contactPerson ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>{client.contactPerson || '—'}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-xs font-mono-num" style={{ color: client.taxCode ? 'var(--theme-text-secondary)' : 'var(--theme-text-muted)' }}>
          {client.taxCode || '—'}
        </span>
      </td>
    </tr>
  )
}

export function ClientsPage() {
  const toast = useToast()
  const { data: clients = [], isLoading } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Client | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [detailTarget, setDetailTarget] = useState<Client | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search
    return clients.filter(p =>
      fuzzyMatch(p.name, q) || fuzzyMatch(p.phone ?? '', q) || fuzzyMatch(p.taxCode ?? '', q) || fuzzyMatch(p.address ?? '', q)
    )
  }, [clients, search])

  const handleCreate = useCallback((data: typeof EMPTY_FORM) => {
    createClient.mutate(data, {
      onSuccess: () => { toast.success('Đã thêm chủ hàng'); setShowCreate(false) },
      onError: () => toast.error('Không thể thêm chủ hàng'),
    })
  }, [createClient, toast])

  const handleUpdate = useCallback((data: typeof EMPTY_FORM) => {
    if (!editTarget) return
    updateClient.mutate({ id: editTarget.id, data }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setEditTarget(null) },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [editTarget, updateClient, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteClient.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setDetailTarget(null) },
      onError: (err: unknown) => {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error('Không thể xoá', detail ?? `${deleteTarget.name} có dữ liệu liên quan.`)
      },
    })
  }, [deleteTarget, deleteClient, toast])

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
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06)' }}>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}>
                <Building2 className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có chủ hàng nào.</p>
              <PulseHint hintKey="clients-add-empty">
                <button onClick={() => setShowCreate(true)} className="btn-primary text-xs mt-1">
                  <Plus size={14} strokeWidth={2.25} />
                  <span>Thêm chủ hàng</span>
                </button>
              </PulseHint>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider w-10" style={{ color: 'var(--theme-text-muted)' }}></th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tên chủ hàng</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>SĐT</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Địa chỉ</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Liên hệ</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>MST</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <ClientRow key={c.id} client={c} onOpenDetail={() => setDetailTarget(c)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AccountantPageShell>

      {detailTarget && (
        <ClientDetailDialog
          client={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => { setEditTarget(detailTarget); setDetailTarget(null) }}
          onDelete={() => { setDeleteTarget(detailTarget); setDetailTarget(null) }}
        />
      )}

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

      <ClientFormDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} title="Thêm chủ hàng" saving={createClient.isPending} />
      <ClientFormDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        title="Cập nhật chủ hàng"
        saving={updateClient.isPending}
        initial={editTarget ? { name: editTarget.name, type: editTarget.type ?? 'company', phone: editTarget.phone ?? '', taxCode: editTarget.taxCode ?? '', address: editTarget.address ?? '', contactPerson: editTarget.contactPerson ?? '' } : undefined}
      />
    </>
  )
}
