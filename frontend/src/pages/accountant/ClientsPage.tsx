import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Building2, Plus, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui'
import { DangerConfirmDialog } from '@/components/shared/DangerConfirmDialog/DangerConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Panel } from '@/components/shared/Panel'
import { useInfiniteScroll, LoadMoreSentinel, SearchInput, FieldActions } from '@/components/shared/ListUtils'
import { useInlineEditForm } from '@/components/shared/useInlineEditForm'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'
import { StatPill } from '@/components/shared/StatPill'
import { PageHeader } from '@/components/shared/PageHeader'
import { useClientsPaged, useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useDebounce } from '@/hooks/use-debounce'
import type { Client } from '@/data/domain'
import type { ClientSortBy } from '@/services/api/clients.api'

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

// ─── Inline edit row ──────────────────────────────────────────────────────────

type FocusableField = 'code' | 'name' | 'phone' | 'address' | 'taxCode' | null

function ClientEditRow({ initial, onSave, onCancel, saving, initialFocus = 'name' }: {
  initial: FormData
  onSave: (data: FormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: FocusableField
}) {
  const refs: Record<Exclude<FocusableField, null>, React.RefObject<HTMLInputElement | null>> = {
    code: useRef<HTMLInputElement>(null),
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    address: useRef<HTMLInputElement>(null),
    taxCode: useRef<HTMLInputElement>(null),
  }

  const { form, errors, set, isDirty, anyDirty, handleSave } = useInlineEditForm<FormData>({
    initial,
    validate: (f) => {
      const errs: Record<string, string> = {}
      if (!f.name.trim()) errs.name = 'Bắt buộc'
      if (f.taxCode && !VN_TAX_RE.test(f.taxCode)) errs.taxCode = 'MST không hợp lệ'
      return errs
    },
    onSave: (f) => onSave({ ...f, name: f.name.trim() }),
    onCancel,
    focusRef: initialFocus ? refs[initialFocus] : undefined,
  })

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
      {/* Code */}
      <td style={{ width: 100 }} onClick={cell('code')}>
        {client.code
          ? <span className="inline-block font-mono text-[11px] font-semibold tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>{client.code}</span>
          : <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </td>
      {/* Name */}
      <td onClick={cell('name')}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{client.name}</span>
      </td>
      {/* Type badge */}
      <td style={{ width: 90 }} onClick={() => onEdit(null)}>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{
            background: isCompany ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface-3)',
            color: isCompany ? 'var(--accent)' : 'var(--ink-3)',
          }}
        >
          {isCompany ? 'Công ty' : 'Cá nhân'}
        </span>
      </td>
      {/* Phone */}
      <td style={{ width: 130 }} onClick={cell('phone')}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{client.phone || '—'}</span>
      </td>
      {/* Address — single line, full text in tooltip */}
      <td onClick={cell('address')}>
        <span
          className="text-[13px] block"
          style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}
          title={client.address || undefined}
        >
          {client.address || <span style={{ color: 'var(--ink-4)' }}>—</span>}
        </span>
      </td>
      {/* Tax code */}
      <td style={{ width: 120 }} onClick={cell('taxCode')}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{client.taxCode || '—'}</span>
      </td>
      {/* Trash — visible on row hover */}
      <td style={{ width: 40 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
          style={{ width: 28, height: 28, color: 'var(--ink-3)' }}
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
  // Keep useClients for counts (loads all without search)
  const { data: allClients = [] } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [sortBy, setSortBy] = useState<ClientSortBy>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [limit, setLimit] = useState(BATCH)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [editingField, setEditingField] = useState<FocusableField>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)

  useEffect(() => { setLimit(BATCH) }, [debouncedSearch, sortBy, sortOrder])

  const { data: pagedData, isLoading } = useClientsPaged({
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
    pageSize: 200,
  })
  const clients = pagedData?.items ?? []
  const filtered = clients

  const visible = filtered.slice(0, limit)
  const hasMore = limit < filtered.length
  const loadMore = useCallback(() => setLimit(n => n + BATCH), [])
  const sentinel = useInfiniteScroll(loadMore)

  const companyCount = allClients.filter(c => c.type === 'company').length
  const individualCount = allClients.filter(c => c.type !== 'company').length

  const handleSort = (col: ClientSortBy) => {
    if (sortBy === col) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortOrder('asc')
    }
  }

  const SortIndicator = ({ col }: { col: ClientSortBy }) => {
    if (sortBy !== col) return <ChevronsUpDown className="inline-block ml-1 opacity-30" style={{ width: 12, height: 12, verticalAlign: 'middle' }} />
    return sortOrder === 'asc'
      ? <ChevronUp className="inline-block ml-1" style={{ width: 12, height: 12, verticalAlign: 'middle', color: 'var(--accent)' }} />
      : <ChevronDown className="inline-block ml-1" style={{ width: 12, height: 12, verticalAlign: 'middle', color: 'var(--accent)' }} />
  }

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
      <PageHeader
        title="Chủ hàng"
        subtitle="Danh sách chủ hàng và thông tin liên hệ"
        lucideIcon={Building2}
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatPill count={clients.length} label=" chủ hàng" accent />
            {companyCount > 0 && <StatPill count={companyCount} label=" công ty" />}
            {individualCount > 0 && <StatPill count={individualCount} label=" cá nhân" />}
          </div>
        }
      />

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
            <TableSkeleton rows={5} />
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
                      <th
                        className="text-left cursor-pointer select-none"
                        style={{ color: sortBy === 'code' ? 'var(--accent)' : undefined }}
                        onClick={() => handleSort('code')}
                      >
                        Mã khách<SortIndicator col="code" />
                      </th>
                      <th
                        className="text-left cursor-pointer select-none"
                        style={{ color: sortBy === 'name' ? 'var(--accent)' : undefined }}
                        onClick={() => handleSort('name')}
                      >
                        Tên chủ hàng<SortIndicator col="name" />
                      </th>
                      <th className="text-left">Loại</th>
                      <th className="text-left">SĐT</th>
                      <th className="text-left">Địa chỉ</th>
                      <th className="text-left">MST</th>
                      <th style={{ width: 40 }} />
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
      <DangerConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá chủ hàng?"
        entityName={deleteTarget?.name ?? ''}
        loading={deleteClient.isPending}
      />
    </div>
  )
}
