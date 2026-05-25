import { useState, useCallback, useMemo } from 'react'
import { Building2, Plus, Trash2, Pencil, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui'
import { DangerConfirmDialog } from '@/components/shared/DangerConfirmDialog/DangerConfirmDialog'
import { CreateClientDialog, type ClientFormData } from '@/components/shared/CreateClientDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Panel } from '@/components/shared/Panel'
import { LoadMoreSentinel, SearchInput } from '@/components/shared/ListUtils'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'
import { StatPill } from '@/components/shared/StatPill'
import { PageHeader } from '@/components/shared/PageHeader'
import { useClientsInfinite, useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useDebounce } from '@/hooks/use-debounce'
import { useInfiniteScroll } from '@/components/shared/ListUtils'
import type { Client } from '@/data/domain'
import type { ClientSortBy } from '@/services/api/clients.api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ClientSortIndicator({ col, sortBy, sortOrder }: { col: ClientSortBy; sortBy: ClientSortBy; sortOrder: 'asc' | 'desc' }) {
  if (sortBy !== col) return <ChevronsUpDown className="inline-block ml-1 opacity-30" style={{ width: 12, height: 12, verticalAlign: 'middle' }} />
  return sortOrder === 'asc'
    ? <ChevronUp className="inline-block ml-1" style={{ width: 12, height: 12, verticalAlign: 'middle', color: 'var(--accent)' }} />
    : <ChevronDown className="inline-block ml-1" style={{ width: 12, height: 12, verticalAlign: 'middle', color: 'var(--accent)' }} />
}

function toFormData(c: Client): ClientFormData {
  return {
    code: c.code ?? '',
    name: c.name,
    type: c.type ?? 'company',
    phone: c.phone ?? '',
    taxCode: c.taxCode ?? '',
    address: c.address ?? '',
    contactPerson: c.contactPerson ?? '',
  }
}

// ─── Client row (read-only) ───────────────────────────────────────────────────

function ClientRow({ client, onEdit, onDelete }: {
  client: Client
  onEdit: () => void
  onDelete: () => void
}) {
  const isCompany = client.type === 'company'

  return (
    <tr className="group cursor-pointer" onClick={onEdit}>
      {/* Code */}
      <td style={{ width: 100 }}>
        {client.code
          ? <span className="inline-block font-mono text-[11px] font-semibold tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>{client.code}</span>
          : <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </td>
      {/* Name */}
      <td>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{client.name}</span>
      </td>
      {/* Type badge */}
      <td style={{ width: 90 }}>
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
      <td style={{ width: 130 }}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{client.phone || '—'}</span>
      </td>
      {/* Address */}
      <td>
        <span
          className="text-[13px] block"
          style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}
          title={client.address || undefined}
        >
          {client.address || <span style={{ color: 'var(--ink-4)' }}>—</span>}
        </span>
      </td>
      {/* Tax code */}
      <td style={{ width: 120 }}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{client.taxCode || '—'}</span>
      </td>
      {/* Row actions — visible on hover */}
      <td style={{ width: 72 }}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="flex items-center justify-center rounded"
            style={{ width: 28, height: 28, color: 'var(--ink-3)' }}
            title="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="flex items-center justify-center rounded"
            style={{ width: 28, height: 28, color: 'var(--ink-3)' }}
            title="Xoá"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ClientsPage() {
  const toast = useToast()
  const { data: allClients = [] } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [sortBy, setSortBy] = useState<ClientSortBy>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)

  // Dialog state — drives both Create and Edit
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useClientsInfinite({
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
  })

  const clients = useMemo(() =>
    data?.pages.flatMap(p => p.items) ?? [], [data])

  const total = data?.pages[0]?.total ?? 0
  const hasMore = hasNextPage ?? false

  const loadMore = useCallback(() => {
    if (hasMore && !isFetchingNextPage) fetchNextPage()
  }, [hasMore, isFetchingNextPage, fetchNextPage])
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

  const openCreateDialog = () => {
    setEditingClient(null)
    setDialogOpen(true)
  }
  const openEditDialog = (client: Client) => {
    setEditingClient(client)
    setDialogOpen(true)
  }
  const closeDialog = () => {
    setDialogOpen(false)
    setEditingClient(null)
  }

  const handleDialogConfirm = useCallback((formData: ClientFormData) => {
    return new Promise<void>((resolve) => {
      if (editingClient) {
        updateClient.mutate(
          { id: editingClient.id, data: formData },
          {
            onSuccess: () => { toast.success('Đã cập nhật'); closeDialog(); resolve() },
            onError: () => { toast.error('Không thể cập nhật'); resolve() },
          },
        )
      } else {
        createClient.mutate(formData, {
          onSuccess: () => { toast.success('Đã thêm chủ hàng'); closeDialog(); resolve() },
          onError: () => { toast.error('Không thể thêm chủ hàng'); resolve() },
        })
      }
    })
  }, [editingClient, createClient, updateClient, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteClient.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null) },
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
            <StatPill count={total} label=" chủ hàng" accent />
            {companyCount > 0 && <StatPill count={companyCount} label=" công ty" />}
            {individualCount > 0 && <StatPill count={individualCount} label=" cá nhân" />}
          </div>
        }
      />

      {/* ── Section ── */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, MST, SĐT…" />
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-3.5 w-3.5" /> Thêm
          </Button>
        </div>

        <Panel flush>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : clients.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={<Building2 className="h-5 w-5" />}
                title={search.trim() ? 'Không tìm thấy chủ hàng' : 'Chưa có chủ hàng nào'}
                compact
                action={!search.trim() ? (
                  <button onClick={openCreateDialog} className="btn-primary text-xs">
                    <Plus size={14} strokeWidth={2.25} /><span>Thêm chủ hàng</span>
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <>
              <div className="nepo-table-scroll overflow-x-auto">
                <div className="px-4 py-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
                  <span className="text-[11.5px]" style={{ color: 'var(--ink-4)' }}>
                    Nhấp vào hàng để sửa
                  </span>
                </div>
                <table className="nepo-table w-full" style={{ minWidth: 640, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th
                        className="text-left cursor-pointer select-none"
                        style={{ color: sortBy === 'code' ? 'var(--accent)' : undefined }}
                        onClick={() => handleSort('code')}
                      >
                        Mã khách<ClientSortIndicator col="code" sortBy={sortBy} sortOrder={sortOrder} />
                      </th>
                      <th
                        className="text-left cursor-pointer select-none"
                        style={{ color: sortBy === 'name' ? 'var(--accent)' : undefined }}
                        onClick={() => handleSort('name')}
                      >
                        Tên chủ hàng<ClientSortIndicator col="name" sortBy={sortBy} sortOrder={sortOrder} />
                      </th>
                      <th className="text-left">Loại</th>
                      <th className="text-left">SĐT</th>
                      <th className="text-left">Địa chỉ</th>
                      <th className="text-left">MST</th>
                      <th style={{ width: 72 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <ClientRow
                        key={c.id}
                        client={c}
                        onEdit={() => openEditDialog(c)}
                        onDelete={() => setDeleteTarget(c)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <LoadMoreSentinel sentinelRef={sentinel} hasMore={hasMore} />
            </>
          )}
        </Panel>
      </section>

      {/* ── Create / Edit dialog ── */}
      <CreateClientDialog
        open={dialogOpen}
        onClose={closeDialog}
        onConfirm={handleDialogConfirm}
        initial={editingClient ? toFormData(editingClient) : null}
        saving={editingClient ? updateClient.isPending : createClient.isPending}
      />

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
