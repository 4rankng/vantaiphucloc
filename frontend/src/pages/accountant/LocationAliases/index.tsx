import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { MapPin, Plus, AlertTriangle, Merge, Search } from 'lucide-react'
import { Button } from '@/components/ui'
import { DangerConfirmDialog } from '@/components/shared/DangerConfirmDialog/DangerConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatPill } from '@/components/shared/StatPill'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/components/atoms/Toast'
import { LocationListItem } from '@/components/shared/LocationListItem'
import { LocationDetailPanel } from '@/components/shared/LocationDetailPanel'
import { NewLocationInput } from '@/components/shared/NewLocationInput'
import { LocationMergeDialog } from '@/components/shared/LocationMergeDialog'
import { findDuplicateHint } from '@/lib/duplicate-detection'
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
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showOnlyDupes, setShowOnlyDupes] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergePreset, setMergePreset] = useState<{ source?: number; target?: number }>({})

  // Group aliases by location
  const aliasesByLoc = useMemo(() => {
    const m = new Map<number, LocationAlias[]>()
    for (const a of aliases) {
      const list = m.get(a.locationId) ?? []
      list.push(a)
      m.set(a.locationId, list)
    }
    return m
  }, [aliases])

  // Detect potential duplicates (recomputes when locations or aliases change)
  const duplicateIds = useMemo(() => {
    const ids = new Set<number>()
    for (const loc of locations) {
      if (findDuplicateHint(loc, locations, aliasesByLoc)) ids.add(loc.id)
    }
    return ids
  }, [locations, aliasesByLoc])

  // Search filter (matches both location name and any alias) + optional dupe-only filter
  const filtered = useMemo(() => {
    let list = locations
    if (showOnlyDupes) list = list.filter(l => duplicateIds.has(l.id))
    if (!search.trim()) return list
    return list.filter(l => {
      if (fuzzyMatch(l.name, search)) return true
      return (aliasesByLoc.get(l.id) ?? []).some(a => fuzzyMatch(a.alias, search))
    })
  }, [locations, search, aliasesByLoc, showOnlyDupes, duplicateIds])

  // Auto-select first location once data loads, or when current selection disappears
  useEffect(() => {
    if (locations.length === 0) {
      if (selectedId !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedId(null)
      }
      return
    }
    if (selectedId === null || !locations.find(l => l.id === selectedId)) {
      setSelectedId(locations[0].id)
    }
  }, [locations, selectedId])

  // Keyboard navigation: ↑/↓ move through filtered list, unless focus is inside an input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (filtered.length === 0) return
      e.preventDefault()
      const idx = filtered.findIndex(l => l.id === selectedId)
      const next = e.key === 'ArrowDown'
        ? Math.min(idx + 1, filtered.length - 1)
        : Math.max(idx - 1, 0)
      setSelectedId(filtered[next].id)
      // Scroll the row into view inside the list container
      const row = listRef.current?.querySelector(`[data-loc-id="${filtered[next].id}"]`)
      row?.scrollIntoView({ block: 'nearest' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, selectedId])

  const selected = useMemo(
    () => locations.find(l => l.id === selectedId) ?? null,
    [locations, selectedId]
  )
  const selectedAliases = selected ? aliasesByLoc.get(selected.id) ?? [] : []

  // ── Handlers ──
  const handleCreate = useCallback((name: string) => {
    createLocation.mutate({ name }, {
      onSuccess: (loc) => {
        toast.success('Đã thêm địa điểm')
        setCreating(false)
        if (loc && typeof loc === 'object' && 'id' in loc) {
          setSelectedId((loc as Location).id)
        }
      },
      onError: () => toast.error('Không thể thêm địa điểm'),
    })
  }, [createLocation, toast])

  const handleUpdate = useCallback((id: number, name: string) => {
    updateLocation.mutate({ id, data: { name } }, {
      onSuccess: () => toast.success('Đã cập nhật'),
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [updateLocation, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteLocation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Đã xoá')
        setDeleteTarget(null)
        if (selectedId === deleteTarget.id) setSelectedId(null)
      },
      onError: () => toast.error('Không thể xoá địa điểm'),
    })
  }, [deleteTarget, deleteLocation, toast, selectedId])

  const handleAddAlias = useCallback((alias: string) => {
    if (!selected) return
    createAlias.mutate({ locationId: selected.id, alias }, {
      onSuccess: () => toast.success('Đã thêm tên phụ'),
      onError: () => toast.error('Không thể thêm tên phụ'),
    })
  }, [selected, createAlias, toast])

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
      onSuccess: () => {
        toast.success('Đã gộp địa điểm')
        setMergeOpen(false)
        setMergePreset({})
        if (selectedId === sourceId) setSelectedId(targetId)
      },
      onError: () => toast.error('Không thể gộp địa điểm'),
    })
  }, [mergeLocations, toast, selectedId])

  const openMergeDialog = (presets?: { source?: number; target?: number }) => {
    setMergePreset(presets ?? {})
    setMergeOpen(true)
  }

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100dvh - 80px)', maxHeight: 'calc(100dvh - 80px)', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div className="shrink-0">
        <PageHeader
          title="Địa điểm"
          subtitle="Tên phụ giúp hệ thống nhận ra các cách viết khác nhau của cùng một địa điểm khi ghép chuyến tự động"
          lucideIcon={MapPin}
          actions={
            <div className="flex items-center gap-2">
              <StatPill count={locations.length} label=" địa điểm" accent />
              <StatPill count={aliases.length} label=" tên phụ" />
              {locations.length >= 2 && (
                <Button variant="ghost" onClick={() => openMergeDialog()}>
                  <Merge className="h-4 w-4" /> Gộp
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* ── Master-detail split ── */}
      <div
        className="flex-1 flex overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          minHeight: 480,
        }}
      >
        {/* ── Left rail: list ── */}
        <aside
          className="shrink-0 flex flex-col"
          style={{ width: 300, borderRight: '1px solid var(--line)', background: 'var(--surface-2)' }}
        >
          {/* Search + add */}
          <div className="px-3 py-3 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
            <div className="relative mb-2">
              <Search
                className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                style={{ left: 10, color: 'var(--ink-3)' }}
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm địa điểm, tên phụ…"
                className="nepo-input text-[13px] w-full"
                style={{ paddingLeft: 32 }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreating(true)}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[12px] font-medium transition-colors"
                style={{ background: 'var(--accent)', color: '#fff', opacity: creating ? 0.5 : 1 }}
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm địa điểm
              </button>
              {duplicateIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setShowOnlyDupes(v => !v)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded text-[11px] font-medium transition-colors shrink-0"
                  style={showOnlyDupes
                    ? { background: 'var(--warning)', color: '#fff', border: 'none' }
                    : { background: 'var(--surface-3)', color: 'var(--ink-3)', border: 'none' }
                  }
                  title={showOnlyDupes ? 'Xem tất cả' : 'Chỉ hiện địa điểm có thể trùng'}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {duplicateIds.size}
                </button>
              )}
            </div>
          </div>

          {/* List — scroll-fade wrapper */}
          <div className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
              <div ref={listRef} style={{ height: '100%', overflowY: 'auto', paddingBottom: 32 }}>
            {creating && (
              <NewLocationInput
                onCreate={handleCreate}
                onCancel={() => setCreating(false)}
                saving={createLocation.isPending}
              />
            )}

            {isLoading ? (
              <div className="px-3 py-4 text-[12px]" style={{ color: 'var(--ink-3)' }}>
                Đang tải…
              </div>
            ) : filtered.length === 0 && !creating ? (
              <div className="py-8">
                <EmptyState
                  icon={<MapPin className="h-5 w-5" />}
                  title={search.trim() ? 'Không tìm thấy' : 'Chưa có địa điểm'}
                  compact
                />
              </div>
            ) : (
              filtered.map(loc => (
                <LocationListItem
                  key={loc.id}
                  data-loc-id={loc.id}
                  location={loc}
                  aliasCount={aliasesByLoc.get(loc.id)?.length ?? 0}
                  isSelected={selectedId === loc.id}
                  isDuplicateCandidate={duplicateIds.has(loc.id)}
                  query={search}
                  onClick={() => setSelectedId(loc.id)}
                />
              ))
            )}
            </div>{/* end inner scroll */}
          </div>{/* end scroll-fade wrapper */}
        </aside>

        {/* ── Right panel: detail ── */}
        <main className="flex-1 min-w-0" style={{ background: 'var(--surface)' }}>
          {selected ? (
            <LocationDetailPanel
              location={selected}
              aliases={selectedAliases}
              allAliases={aliases}
              allLocations={locations}
              onUpdate={handleUpdate}
              onDelete={(loc) => setDeleteTarget(loc)}
              onPromoteAlias={handlePromoteAlias}
              onDeleteAlias={handleDeleteAlias}
              onAddAlias={handleAddAlias}
              onMergeInto={(target) =>
                openMergeDialog({ source: selected.id, target: target.id })
              }
              updatePending={updateLocation.isPending}
              addingAlias={createAlias.isPending}
              promoting={promoteAlias.isPending}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={<MapPin className="h-5 w-5" />}
                title="Chọn một địa điểm"
                description="Chọn từ danh sách bên trái để xem và sửa tên phụ."
                compact
              />
            </div>
          )}
        </main>
      </div>

      {/* ── Delete confirmation ── */}
      <DangerConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá địa điểm?"
        entityName={deleteTarget?.name ?? ''}
        warningText="sẽ bị xoá vĩnh viễn cùng tất cả tên phụ và không thể khôi phục."
        loading={deleteLocation.isPending}
      />

      {/* ── Merge dialog ── */}
      <LocationMergeDialog
        open={mergeOpen}
        onClose={() => { setMergeOpen(false); setMergePreset({}) }}
        locations={locations}
        presetSource={mergePreset.source}
        presetTarget={mergePreset.target}
        onMerge={handleMerge}
        merging={mergeLocations.isPending}
      />
    </div>
  )
}
