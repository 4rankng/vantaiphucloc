import { useState, useMemo, useCallback } from 'react'
import { Building2, Plus, AlertTriangle, X, Search, User } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@/components/ui'
import { Sheet, SheetContent } from '@/components/ui/Sheet'
import { EntityDetailSheet } from '@/components/shared/EntityDetailSheet/EntityDetailSheet'
import { DashboardCard } from '@/components/shared/DashboardCard/DashboardCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { PulseHint } from '@/components/shared/PulseHint'
import { InfoTip } from '@/components/shared/InfoTip'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Client } from '@/data/domain'

const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/
const EMPTY_FORM = { name: '', type: 'company' as const, phone: '', taxCode: '', address: '', contactPerson: '' }

const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500,
  color: 'var(--theme-text-primary)', padding: 0, outline: 'none', fontFamily: 'inherit',
}
const cellStyle: React.CSSProperties = { padding: '10px 16px', borderRight: '0.5px solid var(--theme-border-light)' }
const cellStyleLast: React.CSSProperties = { padding: '10px 16px' }

// ─── Subcomponents ────────────────────────────────────────────────────────────

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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 gap-0" style={{ width: '100%', maxWidth: 480, border: 'none' }}>
        <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{title}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--theme-text-muted)' }} aria-label="Đóng"><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={cellStyle}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Tên chủ hàng <span style={{ color: 'var(--theme-status-error)' }}>*</span></p>
            <input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Tên chủ hàng" style={inputStyle} autoFocus />
          </div>
          <div style={cellStyleLast}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Loại</p>
            <div className="flex gap-1">
              {(['company', 'individual'] as const).map(t => (
                <button key={t} type="button" onClick={() => updateField('type', t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: form.type === t ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}
                >{t === 'company' ? 'Công ty' : 'Cá nhân'}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={cellStyle}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Điện thoại</p>
            <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="0912345678" style={inputStyle} />
            {errors.phone && <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-status-error)' }}>{errors.phone}</p>}
          </div>
          <div style={cellStyleLast}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Mã số thuế <InfoTip text="10 hoặc 13 chữ số" /></p>
            <input value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)} placeholder="0123456789" style={inputStyle} />
            {errors.taxCode && <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-status-error)' }}>{errors.taxCode}</p>}
          </div>
        </div>
        <div style={{ borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={{ padding: '10px 16px' }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Địa chỉ</p>
            <input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="Địa chỉ" style={inputStyle} />
          </div>
        </div>
        <div style={{ borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div style={{ padding: '10px 16px' }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>Người liên hệ</p>
            <input value={form.contactPerson} onChange={e => updateField('contactPerson', e.target.value)} placeholder="Họ tên người liên hệ" style={inputStyle} />
          </div>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1">{saving ? 'Đang lưu...' : 'Xác nhận'}</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ClientDetailDialog({ client, onClose, onEdit, onDelete }: { client: Client; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const fields = [
    { label: 'Loại', value: client.type === 'company' ? 'Công ty' : 'Cá nhân' },
    { label: 'SĐT', value: client.phone },
    { label: 'MST', value: client.taxCode },
    { label: 'Địa chỉ', value: client.address },
    { label: 'Liên hệ', value: client.contactPerson },
  ]

  const actions = (
    <>
      <Button variant="danger" onClick={onDelete} className="text-[12px] h-7 px-2 border-0 bg-transparent shadow-none">Xoá</Button>
      <div className="flex-1" />
      <Button variant="outline" onClick={onClose} className="text-[12px] h-7">Đóng</Button>
      <Button onClick={onEdit} className="text-[12px] h-7">Sửa</Button>
    </>
  )

  return (
    <EntityDetailSheet
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={client.name}
      fields={fields}
      actions={actions}
      maxWidth={440}
    />
  )
}

function ClientRow({ client, onOpenDetail, isLast }: { client: Client; onOpenDetail: () => void; isLast: boolean }) {
  const initials = client.name.slice(0, 2).toUpperCase()

  return (
    <tr
      onClick={onOpenDetail}
      className="transition-colors cursor-pointer"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      <td className="px-3 py-2.5 w-12">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}
        >
          {initials}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{client.name}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{client.phone || '—'}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-sm line-clamp-1" style={{ color: 'var(--theme-text-secondary)' }}>{client.address || '—'}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{client.contactPerson || '—'}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{client.taxCode || '—'}</span>
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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

  const companyCount = clients.filter(c => c.type === 'company').length
  const individualCount = clients.filter(c => c.type !== 'company').length

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
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-display" style={{ color: 'var(--theme-text-primary)' }}>Chủ hàng</h1>
          <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>Quản lý thông tin chủ hàng vận chuyển</p>
        </div>
        <PulseHint hintKey="clients-add">
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} strokeWidth={2.25} /><span>Thêm</span>
          </button>
        </PulseHint>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-3 gap-3">
        <KpiHeroCard
          label="Tổng chủ hàng"
          value={clients.length}
          formattedValue={String(clients.length)}
          icon={Building2}
          color="blue"
        />
        <KpiHeroCard
          label="Công ty"
          value={companyCount}
          formattedValue={String(companyCount)}
          icon={Building2}
          color="emerald"
          sublabel={clients.length > 0 ? `${Math.round((companyCount / clients.length) * 100)}% tổng chủ hàng` : undefined}
        />
        <KpiHeroCard
          label="Cá nhân"
          value={individualCount}
          formattedValue={String(individualCount)}
          icon={User}
          color="amber"
        />
      </div>

      {/* ── Table card ── */}
      <DashboardCard>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader
            title="Danh sách chủ hàng"
            icon={Building2}
            right={
              <div className="flex items-center gap-3">
                {filtered.length !== clients.length && (
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{filtered.length}/{clients.length}</span>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--theme-text-muted)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, MST, SĐT..." className="search-pill h-8 w-56" />
                </div>
              </div>
            }
          />
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title={search.trim() ? 'Không tìm thấy chủ hàng' : 'Chưa có chủ hàng nào'}
            compact
            action={!search.trim() ? (
              <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
                <Plus size={14} strokeWidth={2.25} /><span>Thêm chủ hàng</span>
              </button>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full [&_td]:align-middle" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                  <th className="px-3 py-2.5 w-12"></th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tên chủ hàng</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>SĐT</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Địa chỉ</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Liên hệ</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>MST</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => <ClientRow key={c.id} client={c} onOpenDetail={() => setDetailTarget(c)} isLast={i === filtered.length - 1} />)}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      {/* ── Detail & Edit ── */}
      {detailTarget && !editTarget && (
        <ClientDetailDialog
          client={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => { setEditTarget(detailTarget); setDetailTarget(null) }}
          onDelete={() => { setDeleteTarget(detailTarget); setDetailTarget(null) }}
        />
      )}

      {/* ── Delete dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá chủ hàng?</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ background: 'color-mix(in srgb, var(--theme-status-error) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-status-error) 15%, transparent)' }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-error)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              <strong style={{ color: 'var(--theme-text-primary)' }}>{deleteTarget?.name}</strong> sẽ bị xoá vĩnh viễn và không thể khôi phục.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} variant="destructive" className="flex-1">Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Form sheets ── */}
      <ClientFormDialog open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} title="Thêm chủ hàng" saving={createClient.isPending} />
      <ClientFormDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        title="Cập nhật chủ hàng"
        saving={updateClient.isPending}
        initial={editTarget ? { name: editTarget.name, type: editTarget.type ?? 'company', phone: editTarget.phone ?? '', taxCode: editTarget.taxCode ?? '', address: editTarget.address ?? '', contactPerson: editTarget.contactPerson ?? '' } : undefined}
      />
    </div>
  )
}
