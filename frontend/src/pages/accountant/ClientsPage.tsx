import { useState, useCallback, useMemo } from 'react'
import {
  Building2,
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Phone,
  MapPin,
  Hash,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { DangerConfirmDialog } from '@/components/shared/overlays/DangerConfirmDialog/DangerConfirmDialog'
import { CreateClientDialog, type ClientFormData } from '@/components/shared/overlays/CreateClientDialog'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { Panel } from '@/components/shared/overlays/Panel'
import { LoadMoreSentinel, SearchInput } from '@/components/shared/data-display/ListUtils'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { StatPill } from '@/components/shared/data-display/StatPill'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { useClientsInfinite, useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useDebounce } from '@/hooks/use-debounce'
import { useInfiniteScroll } from '@/components/shared/data-display/ListUtils'
import type { Client } from '@/data/domain'
import type { ClientSortBy } from '@/services/api/clients.api'
import { useIsMobile } from '@/hooks/use-mobile'

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

// Deterministic monogram + accent color from a name (company = emerald, individual = slate).
// Keeps a consistent identity for each client without random color flicker between renders.
function clientAvatar(client: Client): { monogram: string; gradient: string; ring: string; text: string } {
  const isCompany = client.type === 'company'
  const seed = (client.code || client.name).trim()
  const monogram = (isCompany
    ? (client.code || client.name).slice(0, 2)
    : (client.contactPerson || client.name).split(/\s+/).slice(-2).map(s => s[0] || '').join('').slice(0, 2) || (client.name.slice(0, 2))
  ).toUpperCase() || '·'

  // Hash seed for accent variation (but stable per client)
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360

  return {
    monogram,
    gradient: isCompany
      ? `linear-gradient(135deg, hsl(${hue}, 55%, 92%) 0%, hsl(${(hue + 40) % 360}, 60%, 86%) 100%)`
      : `linear-gradient(135deg, var(--surface-2, #f4f4f5) 0%, var(--surface-3) 100%)`,
    ring: isCompany
      ? `hsl(${hue}, 55%, 70%)`
      : 'var(--line)',
    text: isCompany
      ? `hsl(${hue}, 50%, 32%)`
      : 'var(--ink-2)',
  }
}

// ─── Client row (read-only) ───────────────────────────────────────────────────

function ClientRow({ client, onEdit, onDelete }: {
  client: Client
  onEdit: () => void
  onDelete: () => void
}) {
  const isCompany = client.type === 'company'
  const avatar = clientAvatar(client)

  return (
    <tr className="group cursor-pointer" onClick={onEdit}>
      {/* Code */}
      <td style={{ width: 100 }}>
        {client.code
          ? <span className="inline-block font-mono text-[11px] font-semibold tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>{client.code}</span>
          : <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </td>
      {/* Name with monogram avatar */}
      <td>
        <div className="flex items-center gap-2.5">
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: avatar.gradient,
              boxShadow: `inset 0 0 0 1px ${avatar.ring}`,
            }}
          >
            {isCompany
              ? <Building2 className="h-3.5 w-3.5" style={{ color: avatar.text }} />
              : <span className="text-[10px] font-bold" style={{ color: avatar.text, fontFamily: 'var(--theme-font-mono)' }}>{avatar.monogram}</span>}
          </div>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{client.name}</span>
        </div>
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
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded"
            style={{ width: 28, height: 28, color: 'var(--ink-3)' }}
            title="Sửa"
            aria-label={`Sửa ${client.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded"
            style={{ width: 28, height: 28, color: 'var(--ink-3)' }}
            title="Xoá"
            aria-label={`Xoá ${client.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function ClientMobileCard({ client, onEdit, onDelete }: {
  client: Client
  onEdit: () => void
  onDelete: () => void
}) {
  const isCompany = client.type === 'company'
  const avatar = clientAvatar(client)
  const hasDetails = client.phone || client.address || client.taxCode || client.contactPerson

  return (
    <div
      onClick={onEdit}
      className="group relative active:scale-[0.99] touch-manipulation cursor-pointer"
    >
      <div className="flex flex-col gap-2.5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        {/* ── Header: avatar + name + type pill + actions ── */}
        <div className="flex items-start gap-3">
          {/* Monogram avatar */}
          <div
            className="relative shrink-0 flex items-center justify-center select-none"
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: avatar.gradient,
              boxShadow: `inset 0 0 0 1px ${avatar.ring}`,
            }}
          >
            {isCompany ? (
              <Building2 className="h-4 w-4" style={{ color: avatar.text }} />
            ) : (
              <span
                className="text-[13px] font-bold tracking-wide"
                style={{ color: avatar.text, fontFamily: 'var(--theme-font-mono)' }}
              >
                {avatar.monogram}
              </span>
            )}
          </div>

          {/* Name + code */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3
                className="type-h3 leading-tight truncate"
                style={{ color: 'var(--ink)' }}
              >
                {client.name}
              </h3>
            </div>
            {client.code && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="font-mono text-[10.5px] font-bold tracking-wide px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
                >
                  {client.code}
                </span>
                <span
                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: isCompany
                      ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                      : 'var(--surface-3)',
                    color: isCompany ? 'var(--accent)' : 'var(--ink-3)',
                  }}
                >
                  {isCompany ? 'Công ty' : 'Cá nhân'}
                </span>
              </div>
            )}
          </div>

          {/* Delete only — tapping the card itself triggers edit */}
          <div
            className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onDelete}
              className="w-8 h-8 flex items-center justify-center rounded-lg border touch-target"
              style={{ borderColor: 'var(--theme-border-default)', color: 'var(--theme-status-error, #E32434)' }}
              title="Xoá"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Detail pills — only when there's data ── */}
        {hasDetails && (
          <div className="flex flex-col gap-1 pt-2" style={{ borderTop: '1px dashed var(--line)' }}>
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 text-[12.5px] group/phone"
              >
                <Phone
                  className="h-3 w-3 shrink-0"
                  style={{ color: 'var(--ink-4)' }}
                  strokeWidth={2.25}
                />
                <span
                  className="font-semibold tabular-nums group-hover/phone:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  {client.phone}
                </span>
              </a>
            )}
            {client.address && (
              <div className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--ink-2)' }}>
                <MapPin
                  className="h-3 w-3 mt-0.5 shrink-0"
                  style={{ color: 'var(--ink-4)' }}
                  strokeWidth={2.25}
                />
                <span className="line-clamp-1">{client.address}</span>
              </div>
            )}
            {client.contactPerson && (
              <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--ink-2)' }}>
                <User
                  className="h-3 w-3 shrink-0"
                  style={{ color: 'var(--ink-4)' }}
                  strokeWidth={2.25}
                />
                <span className="truncate">{client.contactPerson}</span>
              </div>
            )}
            {client.taxCode && (
              <div className="flex items-center gap-2 text-[11.5px] tabular-nums" style={{ color: 'var(--ink-3)' }}>
                <Hash
                  className="h-3 w-3 shrink-0"
                  style={{ color: 'var(--ink-4)' }}
                  strokeWidth={2.25}
                />
                <span>MST {client.taxCode}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ClientsPage() {
  const isMobile = useIsMobile(768)
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

  const statPills = (
    <div className="flex items-center gap-1.5 flex-wrap">
      <StatPill count={total} label=" chủ hàng" accent />
      {companyCount > 0 && <StatPill count={companyCount} label=" công ty" />}
      {individualCount > 0 && <StatPill count={individualCount} label=" cá nhân" />}
    </div>
  )

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
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      {isMobile ? (
        <div className="flex items-center justify-end gap-3 -mb-1">
          {statPills}
        </div>
      ) : (
        <PageHeader
          title="Chủ hàng"
          subtitle="Danh sách chủ hàng và thông tin liên hệ"
          lucideIcon={Building2}
          actions={statPills}
        />
      )}

      {/* ── Section ── */}
      <section>
        <div className={`flex items-center gap-2 mb-3${isMobile ? ' sticky top-0 z-10 -mx-4 px-4 py-2.5' : ''}`}
          style={isMobile ? { background: 'var(--theme-bg-primary, #fff)' } : undefined}
        >
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, MST, SĐT…" />
          <Button size="sm" onClick={openCreateDialog} className="shrink-0">
            <Plus className="h-3.5 w-3.5" /> Thêm
          </Button>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : clients.length === 0 ? (
          <Panel flush>
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
          </Panel>
        ) : isMobile ? (
          <>
            <div className="py-2 animate-fade-in">
              <span className="text-[11.5px] flex items-center gap-1.5" style={{ color: 'var(--ink-4)' }}>
                <span className="inline-block w-1 h-1 rounded-full" style={{ background: 'var(--ink-4)' }} />
                Nhấp vào thẻ để sửa
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {clients.map((c) => (
                <ClientMobileCard
                  key={c.id}
                  client={c}
                  onEdit={() => openEditDialog(c)}
                  onDelete={() => setDeleteTarget(c)}
                />
              ))}
            </div>
            <LoadMoreSentinel sentinelRef={sentinel} hasMore={hasMore} />
          </>
        ) : (
          <Panel flush>
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
          </Panel>
        )}
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
