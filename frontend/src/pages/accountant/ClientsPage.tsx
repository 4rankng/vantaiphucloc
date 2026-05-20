import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Building2, Plus, AlertTriangle, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@/components/ui'
import { EntityDetailSheet } from '@/components/shared/EntityDetailSheet/EntityDetailSheet'
import { EmptyState } from '@/components/shared/EmptyState'
import { Panel } from '@/components/shared/Panel'
import { Drawer } from '@/components/shared/Drawer'
import { InfoTip } from '@/components/shared/InfoTip'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Client } from '@/data/domain'

const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/
const EMPTY_FORM = { name: '', type: 'company' as const, phone: '', taxCode: '', address: '', contactPerson: '' }

const BATCH = 15

// ─── Infinite scroll hook ─────────────────────────────────────────────────────

function useInfiniteScroll(onLoadMore: () => void) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore() },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onLoadMore])

  return sentinelRef
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatPill({ count, label, accent }: { count: number; label: string; accent?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
      style={{
        background: accent ? 'var(--accent-soft)' : 'var(--surface-3)',
        color: accent ? 'var(--accent)' : 'var(--ink-2)',
      }}
    >
      <span className="tabular-nums font-bold" style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}>{count}</span>
      {label}
    </span>
  )
}

function SectionHeader({ icon, title, count, action }: {
  icon: React.ReactNode
  title: string
  count: number
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: 'var(--ink-2)' }}>{icon}</span>
      <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <span
        className="tabular-nums text-[11.5px] font-semibold rounded-full px-2 py-0.5"
        style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
      >
        {count}
      </span>
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="relative" style={{ width: 220, flexShrink: 0 }}>
      <Search
        className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
        style={{ left: 10, color: 'var(--ink-3)' }}
      />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="nepo-input text-[13px]"
        style={{ paddingLeft: 32 }}
      />
    </div>
  )
}

function LoadMoreSentinel({ sentinelRef, hasMore }: {
  sentinelRef: React.RefObject<HTMLDivElement>
  hasMore: boolean
}) {
  if (!hasMore) return null
  return (
    <div ref={sentinelRef} className="flex justify-center py-3">
      <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Đang tải…</span>
    </div>
  )
}

// ─── Client row ───────────────────────────────────────────────────────────────

function ClientRow({ client, onOpenDetail }: { client: Client; onOpenDetail: () => void }) {
  const initials = client.name.slice(0, 2).toUpperCase()
  const isCompany = client.type === 'company'

  return (
    <tr onClick={onOpenDetail} className="cursor-pointer">
      <td style={{ width: 40 }}>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {initials}
        </div>
      </td>
      <td>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{client.name}</span>
      </td>
      <td>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
        >
          {isCompany ? 'Công ty' : 'Cá nhân'}
        </span>
      </td>
      <td>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{client.phone || '—'}</span>
      </td>
      <td>
        <span className="text-[13px] line-clamp-1" style={{ color: 'var(--ink-2)' }}>{client.address || '—'}</span>
      </td>
      <td>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{client.taxCode || '—'}</span>
      </td>
    </tr>
  )
}

// ─── Client detail ────────────────────────────────────────────────────────────

function ClientDetailDialog({ client, onClose, onEdit, onDelete }: {
  client: Client; onClose: () => void; onEdit: () => void; onDelete: () => void
}) {
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

// ─── Client form drawer ───────────────────────────────────────────────────────

function ClientFormDrawer({ open, onClose, onSave, title, initial, saving }: {
  open: boolean
  onClose: () => void
  onSave: (data: typeof EMPTY_FORM) => void
  title: string
  initial?: Partial<typeof EMPTY_FORM>
  saving?: boolean
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sync initial when it changes (edit re-open)
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, ...initial })
      setErrors({})
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <Drawer
      open={open}
      onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Chủ hàng"
      title={title}
      width="480px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="default" onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Name + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="client-name">
              Tên chủ hàng <span style={{ color: 'var(--status-error, #e53)' }}>*</span>
            </label>
            <input
              id="client-name"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Tên chủ hàng"
              className="nepo-input"
              autoFocus
            />
          </div>
          <div>
            <label className="nepo-field-label">Loại</label>
            <div className="flex gap-1.5 mt-1">
              {(['company', 'individual'] as const).map(t => (
                <button
                  key={t} type="button" onClick={() => updateField('type', t)}
                  className="flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                  style={{
                    background: form.type === t ? 'var(--accent)' : 'var(--surface-3)',
                    color: form.type === t ? '#fff' : 'var(--ink-2)',
                  }}
                >
                  {t === 'company' ? 'Công ty' : 'Cá nhân'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Phone + Tax code */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="client-phone">Điện thoại</label>
            <input
              id="client-phone"
              type="tel"
              value={form.phone}
              onChange={e => updateField('phone', e.target.value)}
              placeholder="0912345678"
              className="nepo-input"
            />
            {errors.phone && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.phone}</p>}
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="client-tax">
              Mã số thuế <InfoTip text="10 hoặc 13 chữ số" />
            </label>
            <input
              id="client-tax"
              value={form.taxCode}
              onChange={e => updateField('taxCode', e.target.value)}
              placeholder="0123456789"
              className="nepo-input"
            />
            {errors.taxCode && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.taxCode}</p>}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="nepo-field-label" htmlFor="client-address">Địa chỉ</label>
          <input
            id="client-address"
            value={form.address}
            onChange={e => updateField('address', e.target.value)}
            placeholder="Địa chỉ"
            className="nepo-input"
          />
        </div>

        {/* Contact person */}
        <div>
          <label className="nepo-field-label" htmlFor="client-contact">Người liên hệ</label>
          <input
            id="client-contact"
            value={form.contactPerson}
            onChange={e => updateField('contactPerson', e.target.value)}
            placeholder="Họ tên người liên hệ"
            className="nepo-input"
          />
        </div>
      </div>
    </Drawer>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ClientsPage() {
  const toast = useToast()
  const { data: clients = [], isLoading } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()

  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(BATCH)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Client | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [detailTarget, setDetailTarget] = useState<Client | null>(null)

  // Reset limit when search changes
  useEffect(() => { setLimit(BATCH) }, [search])

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return clients
    return clients.filter(c =>
      fuzzyMatch(c.name, q) || fuzzyMatch(c.phone ?? '', q) || fuzzyMatch(c.taxCode ?? '', q) || fuzzyMatch(c.address ?? '', q),
    )
  }, [clients, search])

  const visible = filtered.slice(0, limit)
  const hasMore = limit < filtered.length
  const loadMore = useCallback(() => setLimit(n => n + BATCH), [])
  const sentinel = useInfiniteScroll(loadMore)

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
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <header>
        <h1 className="typo-display">Chủ hàng</h1>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <StatPill count={clients.length} label=" chủ hàng" accent />
          {companyCount > 0 && <StatPill count={companyCount} label=" công ty" />}
          {individualCount > 0 && <StatPill count={individualCount} label=" cá nhân" />}
        </div>
      </header>

      {/* ── Section ── */}
      <section>
        <SectionHeader
          icon={<Building2 className="h-4 w-4" />}
          title="Danh sách chủ hàng"
          count={filtered.length}
          action={
            <Button variant="default" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Thêm
            </Button>
          }
        />

        <div className="mb-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, MST, SĐT…" />
        </div>

        <Panel flush>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10">
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
            </div>
          ) : (
            <>
              <div className="nepo-table-scroll overflow-x-auto">
                <table className="nepo-table w-full" style={{ minWidth: 560, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }} />
                      <th className="text-left">Tên chủ hàng</th>
                      <th className="text-left">Loại</th>
                      <th className="text-left">SĐT</th>
                      <th className="text-left">Địa chỉ</th>
                      <th className="text-left">MST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((c) => (
                      <ClientRow key={c.id} client={c} onOpenDetail={() => setDetailTarget(c)} />
                    ))}
                  </tbody>
                </table>
              </div>
              <LoadMoreSentinel sentinelRef={sentinel} hasMore={hasMore} />
            </>
          )}
        </Panel>
      </section>

      {/* ── Detail ── */}
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
          <div
            className="flex items-start gap-3 rounded-lg px-3 py-2.5"
            style={{
              background: 'color-mix(in srgb, var(--status-error, #e53) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--status-error, #e53) 15%, transparent)',
            }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--status-error, #e53)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
              <strong style={{ color: 'var(--ink)' }}>{deleteTarget?.name}</strong> sẽ bị xoá vĩnh viễn và không thể khôi phục.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} variant="destructive" className="flex-1">Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit drawers ── */}
      <ClientFormDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleCreate}
        title="Thêm chủ hàng"
        saving={createClient.isPending}
      />
      <ClientFormDrawer
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        title="Cập nhật chủ hàng"
        saving={updateClient.isPending}
        initial={editTarget
          ? {
              name: editTarget.name,
              type: editTarget.type ?? 'company',
              phone: editTarget.phone ?? '',
              taxCode: editTarget.taxCode ?? '',
              address: editTarget.address ?? '',
              contactPerson: editTarget.contactPerson ?? '',
            }
          : undefined}
      />
    </div>
  )
}
