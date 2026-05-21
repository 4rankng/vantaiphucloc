import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { MapPin, Plus, AlertTriangle, Search, Merge, ArrowUp, Trash2, Check, X } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Panel } from '@/components/shared/Panel'
import { Drawer } from '@/components/shared/Drawer'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { useToast } from '@/components/atoms/Toast'
import {
  useLocations,
  useLocationAliases,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useCreateAlias,
  usePromoteAlias,
  useDeleteAlias,
  useMergeLocations,
} from '@/hooks/use-queries'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Location, LocationAlias } from '@/data/domain'

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH = 15

type FocusableField = 'name' | null

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
  icon: React.ReactNode; title: string; count: number; action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: 'var(--ink-2)' }}>{icon}</span>
      <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>{title}</h2>
      <span className="tabular-nums text-[11.5px] font-semibold rounded-full px-2 py-0.5" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
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

function LocationEditRow({ initialName, onSave, onCancel, saving }: {
  initialName: string
  onSave: (name: string) => void
  onCancel: () => void
  saving?: boolean
}) {
  const [name, setName] = useState(initialName)
  const nameRef = useRef<HTMLInputElement>(null)

  const isDirty = name !== initialName

  const handleSave = useCallback(() => {
    if (!name.trim()) return
    onSave(name.trim())
  }, [name, onSave])

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel, handleSave])

  const actions = isDirty ? <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} /> : null

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      {/* Tên địa điểm */}
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input
            ref={nameRef}
            className="nepo-input text-[12px]"
            style={{ flex: 1 }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tên địa điểm *"
          />
          {actions}
        </div>
      </td>
      {/* Tên phụ placeholder */}
      <td style={{ padding: '5px 8px' }} />
      {/* Trash placeholder */}
      <td style={{ width: 32 }} />
    </tr>
  )
}

// ─── Location row (read mode) ─────────────────────────────────────────────────

function LocationRow({ location, aliasCount, onEdit, onOpenAliases, onDelete }: {
  location: Location
  aliasCount: number
  onEdit: () => void
  onOpenAliases: () => void
  onDelete: () => void
}) {
  return (
    <tr className="cursor-pointer group">
      <td onClick={onEdit}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{location.name}</span>
      </td>
      <td>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenAliases() }}
          className="transition-opacity"
          title="Quản lý tên phụ"
        >
          {aliasCount > 0 ? (
            <span className="text-[12px] font-medium px-2 py-0.5 rounded-full hover:opacity-80"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {aliasCount}
            </span>
          ) : (
            <span className="text-[12px] hover:opacity-80" style={{ color: 'var(--ink-3)' }}>—</span>
          )}
        </button>
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

// ─── Alias detail drawer ──────────────────────────────────────────────────────

function LocationDetailDrawer({
  location, aliases, onClose, onPromoteAlias, onDeleteAlias, onAddAlias, promoting, addingAlias,
}: {
  location: Location; aliases: LocationAlias[]; onClose: () => void
  onPromoteAlias: (id: number) => void; onDeleteAlias: (id: number) => void; onAddAlias: (alias: string) => void
  promoting: boolean; addingAlias: boolean
}) {
  const [newAlias, setNewAlias] = useState('')

  const handleAdd = useCallback(() => {
    if (!newAlias.trim()) return
    onAddAlias(newAlias.trim())
    setNewAlias('')
  }, [newAlias, onAddAlias])

  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Địa điểm" title={location.name} meta={aliases.length > 0 ? `${aliases.length} tên phụ` : undefined}
      footer={<Button variant="ghost" onClick={onClose}>Đóng</Button>}
    >
      <div className="space-y-3">
        {aliases.length === 0 && (
          <p className="text-[13px] py-2" style={{ color: 'var(--ink-3)' }}>Chưa có tên phụ nào.</p>
        )}
        {aliases.map(a => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-2 py-2.5"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>{a.alias}</span>
              {a.source && (
                <span className="text-[10px] uppercase font-semibold shrink-0 px-1.5 py-0.5 rounded"
                  style={{ color: 'var(--ink-3)', background: 'var(--surface-3)' }}>
                  {a.source}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => onPromoteAlias(a.id)}
                disabled={promoting}
                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                style={{ color: 'var(--accent)' }}
                title="Đặt làm tên chính"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDeleteAlias(a.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                style={{ color: 'var(--ink-3)' }}
                title="Xoá tên phụ"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Add alias */}
        <div className="flex items-center gap-2 pt-3 mt-2" style={{ borderTop: '1px solid var(--line)' }}>
          <input
            value={newAlias}
            onChange={e => setNewAlias(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setNewAlias('') }}
            placeholder="Thêm tên phụ..."
            className="nepo-input flex-1"
          />
          <Button size="sm" onClick={handleAdd} disabled={!newAlias.trim() || addingAlias}>
            <Plus className="h-3.5 w-3.5" />
            Thêm
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

// ─── Merge Dialog ─────────────────────────────────────────────────────────────

function MergeDialog({ open, onClose, locations, onMerge, merging }: {
  open: boolean; onClose: () => void; locations: Location[]
  onMerge: (s: number, t: number) => void; merging: boolean
}) {
  const [source, setSource] = useState<number | ''>('')
  const [target, setTarget] = useState<number | ''>('')

  const handleClose = useCallback(() => { setSource(''); setTarget(''); onClose() }, [onClose])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Gộp địa điểm trùng</DialogTitle></DialogHeader>

        <div className="flex items-start gap-3 rounded-lg px-3 py-2.5"
          style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Thao tác không thể hoàn tác. Toàn bộ tên phụ và tham chiếu sẽ chuyển sang đích.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <label className="nepo-field-label">
              Địa điểm nguồn <span style={{ color: 'var(--ink-3)' }}>(sẽ bị gộp)</span>
            </label>
            <select value={source} onChange={e => setSource(Number(e.target.value) || '')} className="nepo-select">
              <option value="">— Chọn địa điểm —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="nepo-field-label">
              Địa điểm đích <span style={{ color: 'var(--ink-3)' }}>(giữ lại)</span>
            </label>
            <select value={target} onChange={e => setTarget(Number(e.target.value) || '')} className="nepo-select">
              <option value="">— Chọn địa điểm —</option>
              {locations.filter(l => l.id !== source).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Huỷ</Button>
          <Button variant="default"
            onClick={() => { if (source && target && source !== target) onMerge(source, target) }}
            disabled={merging || !source || !target || source === target}>
            <Merge className="h-4 w-4" />
            {merging ? 'Đang gộp...' : 'Gộp địa điểm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function LocationAliasesPage() {
  const toast = useToast()
  const { data: locations = [], isLoading } = useLocations()
  const { data: aliases = [] } = useLocationAliases()
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()
  const deleteLocation = useDeleteLocation()
  const createAlias = useCreateAlias()
  const promoteAlias = usePromoteAlias()
  const deleteAlias = useDeleteAlias()
  const mergeLocations = useMergeLocations()

  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [aliasTarget, setAliasTarget] = useState<Location | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)

  // Infinite scroll
  const [limit, setLimit] = useState(BATCH)
  useEffect(() => { setLimit(BATCH) }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const aliasesByLoc = useMemo(() => {
    const m = new Map<number, LocationAlias[]>()
    for (const a of aliases) {
      const list = m.get(a.locationId) ?? []
      list.push(a)
      m.set(a.locationId, list)
    }
    return m
  }, [aliases])

  const filtered = useMemo(() => {
    if (!search.trim()) return locations
    const q = search.toLowerCase()
    return locations.filter(l => {
      if (fuzzyMatch(search, l.name)) return true
      return (aliasesByLoc.get(l.id) ?? []).some(a => a.alias.toLowerCase().includes(q))
    })
  }, [locations, search, aliasesByLoc])

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit])
  const hasMore = limit < filtered.length
  const loadMore = useCallback(() => setLimit(n => n + BATCH), [])
  const sentinel = useInfiniteScroll(loadMore)

  const handleCreate = useCallback((name: string) => {
    createLocation.mutate({ name }, {
      onSuccess: () => { toast.success('Đã thêm địa điểm'); setEditingId(null) },
      onError: () => toast.error('Không thể thêm địa điểm'),
    })
  }, [createLocation, toast])

  const handleUpdate = useCallback((id: number, name: string) => {
    updateLocation.mutate({ id, data: { name } }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setEditingId(null) },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [updateLocation, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteLocation.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setEditingId(null) },
      onError: () => toast.error('Không thể xoá địa điểm'),
    })
  }, [deleteTarget, deleteLocation, toast])

  const handleAddAlias = useCallback((locationId: number, alias: string) => {
    createAlias.mutate({ locationId, alias }, {
      onSuccess: () => toast.success('Đã thêm tên phụ'),
      onError: () => toast.error('Không thể thêm tên phụ'),
    })
  }, [createAlias, toast])

  const handlePromoteAlias = useCallback((aliasId: number) => {
    promoteAlias.mutate(aliasId, {
      onSuccess: () => toast.success('Đã đặt làm tên chính'),
      onError: (err: unknown) => {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error('Không thể đổi tên chính', detail)
      },
    })
  }, [promoteAlias, toast])

  const handleDeleteAlias = useCallback((aliasId: number) => {
    deleteAlias.mutate(aliasId, {
      onSuccess: () => toast.success('Đã xoá tên phụ'),
      onError: () => toast.error('Không thể xoá tên phụ'),
    })
  }, [deleteAlias, toast])

  const handleMerge = useCallback((sourceId: number, targetId: number) => {
    mergeLocations.mutate({ sourceLocationId: sourceId, targetLocationId: targetId }, {
      onSuccess: () => { toast.success('Đã gộp địa điểm'); setMergeOpen(false) },
      onError: () => toast.error('Không thể gộp địa điểm'),
    })
  }, [mergeLocations, toast])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <header>
        <h1 className="typo-display">Địa điểm</h1>
        <p className="typo-body-sm mt-1" style={{ color: 'var(--ink-3)' }}>Quản lý địa điểm và tên phụ</p>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <StatPill count={locations.length} label=" địa điểm" accent />
          <StatPill count={aliases.length} label=" tên phụ" />
          <div style={{ marginLeft: 'auto' }} className="flex items-center gap-2">
            {locations.length >= 2 && (
              <Button variant="ghost" onClick={() => setMergeOpen(true)}>
                <Merge className="h-4 w-4" /> Gộp
              </Button>
            )}
            <Button variant="default" onClick={() => setEditingId('new')}>
              <Plus className="h-4 w-4" /> Thêm
            </Button>
          </div>
        </div>
      </header>

      {/* ── Table section ── */}
      <section>
        <SectionHeader
          icon={<MapPin className="h-4 w-4" />}
          title="Danh sách địa điểm"
          count={filtered.length}
          action={<SearchInput value={search} onChange={setSearch} placeholder="Tìm địa điểm, tên phụ…" />}
        />
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
                icon={<MapPin className="h-5 w-5" />}
                title={search.trim() ? 'Không tìm thấy địa điểm' : 'Chưa có địa điểm nào'}
                compact
                action={!search.trim() ? (
                  <button onClick={() => setEditingId('new')} className="btn-primary text-xs">
                    <Plus size={14} strokeWidth={2.25} /><span>Thêm địa điểm</span>
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <>
              <div className="nepo-table-scroll overflow-x-auto">
                <table className="nepo-table w-full" style={{ minWidth: 400 }}>
                  <thead>
                    <tr>
                      <th className="text-left">Tên địa điểm</th>
                      <th className="text-right">Tên phụ</th>
                      <th style={{ width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {editingId === 'new' && (
                      <LocationEditRow
                        initialName=""
                        onSave={handleCreate}
                        onCancel={() => setEditingId(null)}
                        saving={createLocation.isPending}
                      />
                    )}
                    {visible.map(loc =>
                      editingId === loc.id ? (
                        <LocationEditRow
                          key={loc.id}
                          initialName={loc.name}
                          onSave={(name) => handleUpdate(loc.id, name)}
                          onCancel={() => setEditingId(null)}
                          saving={updateLocation.isPending}
                        />
                      ) : (
                        <LocationRow
                          key={loc.id}
                          location={loc}
                          aliasCount={aliasesByLoc.get(loc.id)?.length ?? 0}
                          onEdit={() => setEditingId(loc.id)}
                          onOpenAliases={() => setAliasTarget(loc)}
                          onDelete={() => setDeleteTarget(loc)}
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

      {/* ── Alias detail drawer ── */}
      {aliasTarget && (
        <LocationDetailDrawer
          location={aliasTarget}
          aliases={aliasesByLoc.get(aliasTarget.id) ?? []}
          onClose={() => setAliasTarget(null)}
          onPromoteAlias={handlePromoteAlias}
          onDeleteAlias={handleDeleteAlias}
          onAddAlias={(alias) => handleAddAlias(aliasTarget.id, alias)}
          promoting={promoteAlias.isPending}
          addingAlias={createAlias.isPending}
        />
      )}

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá địa điểm"
        description={`"${deleteTarget?.name}" sẽ bị xoá vĩnh viễn cùng tất cả tên phụ.`}
        confirmLabel="Xoá"
        variant="warning"
      />

      {/* ── Merge dialog ── */}
      <MergeDialog open={mergeOpen} onClose={() => setMergeOpen(false)} locations={locations} onMerge={handleMerge} merging={mergeLocations.isPending} />
    </div>
  )
}
