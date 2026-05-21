import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Building2, Plus, AlertTriangle, Search, Check, X, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@/components/ui'
import { EmptyState } from '@/components/shared/EmptyState'
import { Panel } from '@/components/shared/Panel'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Client } from '@/data/domain'

const VN_TAX_RE = /^\d{10}(\d{3})?$/

type FormData = {
  code: string
  name: string
  type: 'company' | 'individual'
  phone: string
  taxCode: string
  address: string
  contactPerson: string
}

const EMPTY_FORM: FormData = {
  code: '', name: '', type: 'company', phone: '', taxCode: '', address: '', contactPerson: '',
}

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

function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="relative" style={{ flex: 1, maxWidth: 360 }}>
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

// ─── Inline save/cancel icons (shown beside a changed field) ──────────────────

function FieldActions({ onSave, onCancel, saving }: {
  onSave: () => void
  onCancel: () => void
  saving?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 ml-1 shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSave() }}
        disabled={saving}
        className="flex items-center justify-center rounded"
        style={{
          width: 20, height: 20,
          background: 'var(--accent)',
          color: '#fff',
          opacity: saving ? 0.5 : 1,
        }}
        title="Lưu"
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCancel() }}
        className="flex items-center justify-center rounded"
        style={{ width: 20, height: 20, background: 'var(--surface-3)', color: 'var(--ink-2)' }}
        title="Huỷ"
      >
        <X className="h-2.5 w-2.5" strokeWidth={3} />
      </button>
    </div>
  )
}

// ─── Inline edit row ──────────────────────────────────────────────────────────

type FocusableField = 'code' | 'name' | 'phone' | 'address' | 'taxCode' | null

function ClientEditRow({ initial, onSave, onCancel, saving, initialFocus = 'name' }: {
  initial: FormData
  onSave: (data: FormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: FocusableField
}) {
  const [form, setForm] = useState<FormData>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const refs: Record<Exclude<FocusableField, null>, React.RefObject<HTMLInputElement | null>> = {
    code: useRef<HTMLInputElement>(null),
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    address: useRef<HTMLInputElement>(null),
    taxCode: useRef<HTMLInputElement>(null),
  }

  const isDirty = (key: keyof FormData) => form[key] !== initial[key]
  const anyDirty = (Object.keys(form) as (keyof FormData)[]).some(k => isDirty(k))

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Bắt buộc'
    if (form.taxCode && !VN_TAX_RE.test(form.taxCode)) errs.taxCode = 'MST không hợp lệ'
    return errs
  }

  const handleSave = useCallback(() => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave({ ...form, name: form.name.trim() })
  }, [form, onSave]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialFocus) refs[initialFocus]?.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel, handleSave])

  const actions = anyDirty
    ? <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} />
    : null

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      {/* Mã khách */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input
            ref={refs.code}
            className="nepo-input text-[12px]"
            style={{ minWidth: 60, flex: 1 }}
            value={form.code}
            onChange={e => set('code', e.target.value)}

            placeholder="Mã KH"
          />
          {isDirty('code') && actions}
        </div>
      </td>
      {/* Tên */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <div style={{ flex: 1 }}>
            <input
              ref={refs.name}
              className="nepo-input text-[12px]"
              style={{ width: '100%', borderColor: errors.name ? 'var(--status-error, #e53)' : undefined }}
              value={form.name}
              onChange={e => set('name', e.target.value)}
  
              placeholder="Tên chủ hàng *"
            />
            {errors.name && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.name}</p>}
          </div>
          {isDirty('name') && actions}
        </div>
      </td>
      {/* Loại */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center gap-1">
          <div className="flex gap-1" style={{ minWidth: 90 }}>
            {(['company', 'individual'] as const).map(t => (
              <button
                key={t} type="button"
                onClick={() => set('type', t)}
                className="flex-1 rounded text-[11px] font-medium transition-colors"
                style={{
                  padding: '3px 0',
                  background: form.type === t ? 'var(--accent)' : 'var(--surface-3)',
                  color: form.type === t ? '#fff' : 'var(--ink-2)',
                }}
              >
                {t === 'company' ? 'Cty' : 'CN'}
              </button>
            ))}
          </div>
          {isDirty('type') && actions}
        </div>
      </td>
      {/* SĐT */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input
            ref={refs.phone}
            className="nepo-input text-[12px]"
            style={{ minWidth: 90, flex: 1 }}
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}

            placeholder="SĐT"
          />
          {isDirty('phone') && actions}
        </div>
      </td>
      {/* Địa chỉ */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input
            ref={refs.address}
            className="nepo-input text-[12px]"
            style={{ minWidth: 100, flex: 1 }}
            value={form.address}
            onChange={e => set('address', e.target.value)}

            placeholder="Địa chỉ"
          />
          {isDirty('address') && actions}
        </div>
      </td>
      {/* MST */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <div style={{ flex: 1 }}>
            <input
              ref={refs.taxCode}
              className="nepo-input text-[12px]"
              style={{ width: '100%', borderColor: errors.taxCode ? 'var(--status-error, #e53)' : undefined }}
              value={form.taxCode}
              onChange={e => set('taxCode', e.target.value)}
  
              placeholder="MST"
            />
            {errors.taxCode && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.taxCode}</p>}
          </div>
          {isDirty('taxCode') && actions}
        </div>
      </td>
      {/* Trash placeholder — keeps column width stable */}
      <td style={{ width: 32 }} />
    </tr>
  )
}

// ─── Client row (read mode) ───────────────────────────────────────────────────

function ClientRow({ client, onEdit, onDelete }: {
  client: Client
  onEdit: (field: FocusableField) => void
  onDelete: () => void
}) {
  const isCompany = client.type === 'company'
  const cell = (field: FocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }

  return (
    <tr className="cursor-pointer group">
      <td onClick={cell('code')}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{client.code || '—'}</span>
      </td>
      <td onClick={cell('name')}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{client.name}</span>
      </td>
      <td onClick={() => onEdit(null)}>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
        >
          {isCompany ? 'Công ty' : 'Cá nhân'}
        </span>
      </td>
      <td onClick={cell('phone')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{client.phone || '—'}</span>
      </td>
      <td onClick={cell('address')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 260 }}>{client.address || '—'}</span>
      </td>
      <td onClick={cell('taxCode')}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{client.taxCode || '—'}</span>
      </td>
      {/* Trash — visible on row hover */}
      <td style={{ width: 32 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
          style={{ width: 24, height: 24, color: 'var(--ink-3)' }}
          title="Xoá"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
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
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [editingField, setEditingField] = useState<FocusableField>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)

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

  const handleCreate = useCallback((data: FormData) => {
    createClient.mutate(data, {
      onSuccess: () => { toast.success('Đã thêm chủ hàng'); setEditingId(null) },
      onError: () => toast.error('Không thể thêm chủ hàng'),
    })
  }, [createClient, toast])

  const handleUpdate = useCallback((id: string, data: FormData) => {
    updateClient.mutate({ id, data }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setEditingId(null) },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [updateClient, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteClient.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setEditingId(null) },
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
        <div className="flex items-center gap-2 mb-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, MST, SĐT…" />
          <Button variant="default" onClick={() => { setEditingId('new'); setSearch('') }}>
            <Plus className="h-4 w-4" /> Thêm
          </Button>
        </div>

        <Panel flush>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
              ))}
            </div>
          ) : filtered.length === 0 && editingId !== 'new' ? (
            <div className="py-10">
              <EmptyState
                icon={<Building2 className="h-5 w-5" />}
                title={search.trim() ? 'Không tìm thấy chủ hàng' : 'Chưa có chủ hàng nào'}
                compact
                action={!search.trim() ? (
                  <button onClick={() => setEditingId('new')} className="btn-primary text-xs">
                    <Plus size={14} strokeWidth={2.25} /><span>Thêm chủ hàng</span>
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <>
              <div className="nepo-table-scroll overflow-x-auto">
                <table className="nepo-table w-full" style={{ minWidth: 640, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th className="text-left">Mã khách</th>
                      <th className="text-left">Tên chủ hàng</th>
                      <th className="text-left">Loại</th>
                      <th className="text-left">SĐT</th>
                      <th className="text-left">Địa chỉ</th>
                      <th className="text-left">MST</th>
                      <th style={{ width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {editingId === 'new' && (
                      <ClientEditRow
                        initial={EMPTY_FORM}
                        onSave={handleCreate}
                        onCancel={() => setEditingId(null)}
                        saving={createClient.isPending}
                      />
                    )}
                    {visible.map((c) =>
                      editingId === c.id ? (
                        <ClientEditRow
                          key={c.id}
                          initial={{
                            code: c.code ?? '',
                            name: c.name,
                            type: c.type ?? 'company',
                            phone: c.phone ?? '',
                            taxCode: c.taxCode ?? '',
                            address: c.address ?? '',
                            contactPerson: c.contactPerson ?? '',
                          }}
                          onSave={(data) => handleUpdate(c.id, data)}
                          onCancel={() => setEditingId(null)}
                          saving={updateClient.isPending}
                          initialFocus={editingField}
                        />
                      ) : (
                        <ClientRow
                          key={c.id}
                          client={c}
                          onEdit={(field) => { setEditingId(c.id); setEditingField(field) }}
                          onDelete={() => setDeleteTarget(c)}
                        />
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              <LoadMoreSentinel sentinelRef={sentinel} hasMore={hasMore} />
            </>
          )}
        </Panel>
      </section>

      {/* ── Delete confirmation ── */}
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
    </div>
  )
}
