import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Truck, Plus, Search, Check, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { Panel } from '@/components/shared/Panel'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Vendor } from '@/data/domain'

// ─── Constants ────────────────────────────────────────────────────────────────

const VN_TAX_RE = /^\d{10}(\d{3})?$/
const BATCH = 15

type FormData = {
  name: string
  type: 'company' | 'individual'
  phone: string
  taxCode: string
  address: string
  contactPerson: string
}

const EMPTY_FORM: FormData = {
  name: '', type: 'company', phone: '', taxCode: '', address: '', contactPerson: '',
}

type FocusableField = 'name' | 'phone' | 'taxCode' | 'address' | 'contactPerson' | null

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
    <div className="relative" style={{ width: 220, flexShrink: 0 }}>
      <Search className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ left: 10, color: 'var(--ink-3)' }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="nepo-input text-[13px]" style={{ paddingLeft: 32 }} />
    </div>
  )
}

function LoadMoreSentinel({ sentinelRef, hasMore }: {
  sentinelRef: React.RefObject<HTMLDivElement>; hasMore: boolean
}) {
  if (!hasMore) return null
  return (
    <div ref={sentinelRef} className="flex justify-center py-3">
      <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Đang tải…</span>
    </div>
  )
}

// ─── Inline save/cancel icons ─────────────────────────────────────────────────

function FieldActions({ onSave, onCancel, saving }: {
  onSave: () => void; onCancel: () => void; saving?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 ml-1 shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSave() }}
        disabled={saving}
        className="flex items-center justify-center rounded"
        style={{ width: 20, height: 20, background: 'var(--accent)', color: '#fff', opacity: saving ? 0.5 : 1 }}
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

function VendorEditRow({ initial, onSave, onCancel, saving, initialFocus = 'name', globalKeyboard = true }: {
  initial: FormData
  onSave: (data: FormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: FocusableField
  globalKeyboard?: boolean
}) {
  const [form, setForm] = useState<FormData>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const refs: Record<Exclude<FocusableField, null>, React.RefObject<HTMLInputElement | null>> = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    taxCode: useRef<HTMLInputElement>(null),
    address: useRef<HTMLInputElement>(null),
    contactPerson: useRef<HTMLInputElement>(null),
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

  // Global keyboard handler (standalone pages)
  useEffect(() => {
    if (!globalKeyboard) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel, handleSave, globalKeyboard])

  // Input-level keyboard handler (for use inside drawers, prevents drawer from closing)
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleSave() }
  }, [onCancel, handleSave])

  const inputProps = globalKeyboard ? {} : { onKeyDown: handleInputKeyDown }

  const actions = anyDirty ? <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} /> : null

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
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
              placeholder="Tên nhà thầu *"
              {...inputProps}
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
                style={{ padding: '3px 0', background: form.type === t ? 'var(--accent)' : 'var(--surface-3)', color: form.type === t ? '#fff' : 'var(--ink-2)' }}
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
            {...inputProps}
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
            {...inputProps}
          />
          {isDirty('address') && actions}
        </div>
      </td>
      {/* Liên hệ */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input
            ref={refs.contactPerson}
            className="nepo-input text-[12px]"
            style={{ minWidth: 80, flex: 1 }}
            value={form.contactPerson}
            onChange={e => set('contactPerson', e.target.value)}
            placeholder="Người liên hệ"
            {...inputProps}
          />
          {isDirty('contactPerson') && actions}
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
              {...inputProps}
            />
            {errors.taxCode && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.taxCode}</p>}
          </div>
          {isDirty('taxCode') && actions}
        </div>
      </td>
      {/* Trash placeholder */}
      <td style={{ width: 32 }} />
    </tr>
  )
}

// ─── Vendor row (read mode) ───────────────────────────────────────────────────

function VendorRow({ vendor, onEdit, onDelete }: {
  vendor: Vendor
  onEdit: (field: FocusableField) => void
  onDelete: () => void
}) {
  const cell = (field: FocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }
  return (
    <tr className="cursor-pointer group">
      <td onClick={cell('name')}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{vendor.name}</span>
      </td>
      <td onClick={() => onEdit(null)}>
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
          {vendor.type === 'company' ? 'Công ty' : 'Cá nhân'}
        </span>
      </td>
      <td onClick={cell('phone')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.phone || '—'}</span>
      </td>
      <td onClick={cell('address')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 220 }}>{vendor.address || '—'}</span>
      </td>
      <td onClick={cell('contactPerson')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.contactPerson || '—'}</span>
      </td>
      <td onClick={cell('taxCode')}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{vendor.taxCode || '—'}</span>
      </td>
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

export function VendorsPage() {
  const toast = useToast()
  const { data: vendors = [], isLoading } = useVendors()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(BATCH)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [editingField, setEditingField] = useState<FocusableField>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

  useEffect(() => { setLimit(BATCH) }, [search])

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return vendors
    return vendors.filter(p => fuzzyMatch(p.name, q) || fuzzyMatch(p.phone ?? '', q) || fuzzyMatch(p.taxCode ?? '', q))
  }, [vendors, search])

  const visible = filtered.slice(0, limit)
  const hasMore = limit < filtered.length
  const loadMore = useCallback(() => setLimit(n => n + BATCH), [])
  const sentinel = useInfiniteScroll(loadMore)

  const companyCount = vendors.filter(v => v.type === 'company').length
  const individualCount = vendors.filter(v => v.type !== 'company').length

  const handleCreate = useCallback((data: FormData) => {
    createVendor.mutate(data, {
      onSuccess: () => { toast.success('Đã thêm nhà thầu'); setEditingId(null) },
      onError: () => toast.error('Không thể thêm nhà thầu'),
    })
  }, [createVendor, toast])

  const handleUpdate = useCallback((id: number, data: FormData) => {
    updateVendor.mutate({ id, data }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setEditingId(null) },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [updateVendor, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteVendor.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setEditingId(null) },
      onError: () => toast.error('Không thể xoá'),
    })
  }, [deleteTarget, deleteVendor, toast])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <header>
        <h1 className="typo-display">Nhà thầu</h1>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <StatPill count={vendors.length} label=" nhà thầu" accent />
          <StatPill count={companyCount} label=" công ty" />
          <StatPill count={individualCount} label=" cá nhân" />
        </div>
      </header>

      {/* ── Table section ── */}
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
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
              ))}
            </div>
          ) : filtered.length === 0 && editingId !== 'new' ? (
            <div className="py-10">
              <EmptyState
                icon={<Truck className="h-5 w-5" />}
                title={search.trim() ? 'Không tìm thấy nhà thầu' : 'Chưa có nhà thầu nào'}
                compact
                action={!search.trim() ? (
                  <button onClick={() => setEditingId('new')} className="btn-primary text-xs">
                    <Plus size={14} strokeWidth={2.25} /><span>Thêm nhà thầu</span>
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <>
              <div className="nepo-table-scroll overflow-x-auto">
                <table className="nepo-table w-full" style={{ minWidth: 680, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th className="text-left">Tên nhà thầu</th>
                      <th className="text-left">Loại</th>
                      <th className="text-left">SĐT</th>
                      <th className="text-left">Địa chỉ</th>
                      <th className="text-left">Liên hệ</th>
                      <th className="text-left">MST</th>
                      <th style={{ width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {editingId === 'new' && (
                      <VendorEditRow
                        initial={EMPTY_FORM}
                        onSave={handleCreate}
                        onCancel={() => setEditingId(null)}
                        saving={createVendor.isPending}
                      />
                    )}
                    {visible.map((v) =>
                      editingId === v.id ? (
                        <VendorEditRow
                          key={v.id}
                          initial={{
                            name: v.name,
                            type: v.type ?? 'company',
                            phone: v.phone ?? '',
                            taxCode: v.taxCode ?? '',
                            address: v.address ?? '',
                            contactPerson: v.contactPerson ?? '',
                          }}
                          onSave={(data) => handleUpdate(v.id, data)}
                          onCancel={() => setEditingId(null)}
                          saving={updateVendor.isPending}
                          initialFocus={editingField}
                        />
                      ) : (
                        <VendorRow
                          key={v.id}
                          vendor={v}
                          onEdit={(field) => { setEditingId(v.id); setEditingField(field) }}
                          onDelete={() => setDeleteTarget(v)}
                        />
                      )
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
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá nhà thầu"
        description={`"${deleteTarget?.name}" sẽ bị xoá vĩnh viễn và không thể khôi phục.`}
        confirmLabel="Xoá"
        variant="warning"
      />
    </div>
  )
}
