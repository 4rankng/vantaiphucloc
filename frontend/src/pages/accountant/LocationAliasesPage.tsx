import { useState, useMemo, useCallback, useEffect } from 'react'
import { MapPin, Plus, AlertTriangle, X, Search, Merge, ArrowUp, Trash2 } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Sheet, SheetContent } from '@/components/ui/Sheet'
import { StatBreakdownCard } from '@/components/shared/StatBreakdownCard'
import { DashboardCard } from '@/components/shared/DashboardCard/DashboardCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { PulseHint } from '@/components/shared/PulseHint'
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

const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500,
  color: 'var(--theme-text-primary)', padding: 0, outline: 'none', fontFamily: 'inherit',
}

const selectStyle: React.CSSProperties = {
  width: '100%', background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)',
  borderRadius: 8, padding: '10px 12px', fontSize: '13px', fontWeight: 500,
  color: 'var(--theme-text-primary)', outline: 'none',
}

// ─── Create / Edit Sheet ────────────────────────────────────────────

function LocationFormSheet({ open, onClose, onSave, title, initialName = '', saving }: {
  open: boolean; onClose: () => void; onSave: (name: string) => void
  title: string; initialName?: string; saving?: boolean
}) {
  const [name, setName] = useState(initialName)
  useEffect(() => { if (open) setName(initialName) }, [open, initialName])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 gap-0" style={{ width: '100%', maxWidth: 400, border: 'none' }}>
        <div className="flex items-center justify-between" style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{title}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--theme-text-muted)' }} aria-label="Đóng"><X size={18} /></button>
        </div>
        <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--theme-text-muted)' }}>
            Tên địa điểm <span style={{ color: 'var(--theme-status-error)' }}>*</span>
          </p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nhập tên địa điểm"
            style={inputStyle}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()) }}
          />
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={() => onSave(name.trim())} disabled={!name.trim() || saving} className="flex-1">
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Detail Sheet ───────────────────────────────────────────────────

function LocationDetailSheet({
  location, aliases, onClose, onEdit, onDelete, onPromoteAlias, onDeleteAlias, onAddAlias, promoting, addingAlias,
}: {
  location: Location; aliases: LocationAlias[]; onClose: () => void; onEdit: () => void; onDelete: () => void
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
    <Sheet open onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent side="right" className="p-0 gap-0" style={{ width: '100%', maxWidth: 440, border: 'none' }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          <div>
            <span className="text-[15px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{location.name}</span>
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)', fontFeatureSettings: "'tnum'" }}>
              {aliases.length} tên phụ
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--theme-bg-tertiary)]"
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--theme-text-muted)' }}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Alias list */}
        <div className="flex-1 overflow-y-auto">
          {aliases.length === 0 && (
            <p className="text-[13px] px-5 py-4" style={{ color: 'var(--theme-text-muted)' }}>Chưa có tên phụ nào.</p>
          )}
          {aliases.map(a => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2"
              style={{ padding: '10px 20px', borderBottom: '0.5px solid var(--theme-border-light)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[13px] font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>{a.alias}</span>
                {a.source && (
                  <span className="text-[10px] uppercase font-semibold shrink-0 px-1.5 py-0.5 rounded" style={{ color: 'var(--theme-text-muted)', background: 'var(--theme-bg-tertiary)' }}>
                    {a.source}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => onPromoteAlias(a.id)}
                  disabled={promoting}
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                  style={{ color: 'var(--theme-brand-primary)' }}
                  title="Đặt làm tên chính"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteAlias(a.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                  style={{ color: 'var(--theme-text-muted)' }}
                  title="Xoá tên phụ"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Add alias */}
          <div className="flex items-center gap-2" style={{ padding: '12px 20px' }}>
            <input
              value={newAlias}
              onChange={e => setNewAlias(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setNewAlias('') }}
              placeholder="Thêm tên phụ..."
              className="flex-1 rounded-md border px-2.5 py-1.5 text-[13px] outline-none"
              style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
            />
            <Button size="sm" onClick={handleAdd} disabled={!newAlias.trim() || addingAlias}>
              <Plus className="h-3.5 w-3.5" />
              Thêm
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '0.5px solid var(--theme-border-light)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button variant="danger" onClick={onDelete} className="text-[12px] h-7 px-2 border-0 bg-transparent shadow-none">Xoá</Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose} className="text-[12px] h-7">Đóng</Button>
          <Button onClick={onEdit} className="text-[12px] h-7">Sửa tên</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Merge Dialog ───────────────────────────────────────────────────

function MergeDialog({ open, onClose, locations, onMerge, merging }: {
  open: boolean; onClose: () => void; locations: Location[]
  onMerge: (s: number, t: number) => void; merging: boolean
}) {
  const [source, setSource] = useState<number | ''>('')
  const [target, setTarget] = useState<number | ''>('')

  const handleClose = useCallback(() => {
    setSource('')
    setTarget('')
    onClose()
  }, [onClose])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Gộp địa điểm trùng</DialogTitle></DialogHeader>

        <div className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ background: 'color-mix(in srgb, var(--theme-status-warning, #F59E0B) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-status-warning, #F59E0B) 15%, transparent)' }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-warning, #F59E0B)' }} />
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            Thao tác không thể hoàn tác. Toàn bộ tên phụ và tham chiếu sẽ chuyển sang đích.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold block mb-1.5" style={{ color: 'var(--theme-text-muted)' }}>
              Địa điểm nguồn <span style={{ color: 'var(--theme-text-muted)' }}>(sẽ bị gộp)</span>
            </label>
            <select value={source} onChange={e => setSource(Number(e.target.value) || '')} style={selectStyle}>
              <option value="">— Chọn địa điểm —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold block mb-1.5" style={{ color: 'var(--theme-text-muted)' }}>
              Địa điểm đích <span style={{ color: 'var(--theme-text-muted)' }}>(giữ lại)</span>
            </label>
            <select value={target} onChange={e => setTarget(Number(e.target.value) || '')} style={selectStyle}>
              <option value="">— Chọn địa điểm —</option>
              {locations.filter(l => l.id !== source).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Huỷ</Button>
          <Button
            onClick={() => { if (source && target && source !== target) onMerge(source, target) }}
            disabled={merging || !source || !target || source === target}
          >
            <Merge className="h-4 w-4" />
            {merging ? 'Đang gộp...' : 'Gộp địa điểm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Table Row ──────────────────────────────────────────────────────

function LocationRow({ location, aliasCount, onOpenDetail, isLast }: {
  location: Location; aliasCount: number; onOpenDetail: () => void; isLast: boolean
}) {
  const initial = location.name.charAt(0).toUpperCase()

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
          {initial}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-[13px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{location.name}</span>
      </td>
      <td className="px-3 py-2.5 text-right">
        {aliasCount > 0 ? (
          <span
            className="text-[12px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)', color: 'var(--theme-brand-primary)' }}
          >
            {aliasCount}
          </span>
        ) : (
          <span className="text-[12px]" style={{ color: 'var(--theme-text-muted)' }}>—</span>
        )}
      </td>
    </tr>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────

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
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Location | null>(null)
  const [detailTarget, setDetailTarget] = useState<Location | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)

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

  const handleCreate = useCallback((name: string) => {
    createLocation.mutate({ name }, {
      onSuccess: () => { toast.success('Đã thêm địa điểm'); setShowCreate(false) },
      onError: () => toast.error('Không thể thêm địa điểm'),
    })
  }, [createLocation, toast])

  const handleUpdate = useCallback((name: string) => {
    if (!editTarget) return
    updateLocation.mutate({ id: editTarget.id, data: { name } }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setEditTarget(null) },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [editTarget, updateLocation, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteLocation.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setDetailTarget(null) },
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
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-display" style={{ color: 'var(--theme-text-primary)' }}>Địa điểm</h1>
          <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>Quản lý địa điểm và tên phụ</p>
        </div>
        <div className="flex items-center gap-2">
          {locations.length >= 2 && (
            <Button variant="outline" onClick={() => setMergeOpen(true)}>
              <Merge className="h-3.5 w-3.5" />
              Gộp
            </Button>
          )}
          <PulseHint hintKey="locations-add">
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={16} strokeWidth={2.25} /><span>Thêm</span>
            </button>
          </PulseHint>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 w-full md:max-w-[360px]">
        <StatBreakdownCard
          label="Tổng địa điểm"
          total={locations.length}
          items={[{ label: 'Tên phụ', value: aliases.length }]}
        />
      </div>

      {/* Table */}
      <DashboardCard>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader
            title="Danh sách địa điểm"
            icon={MapPin}
            right={
              <div className="flex items-center gap-3">
                {filtered.length !== locations.length && (
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{filtered.length}/{locations.length}</span>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--theme-text-muted)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm địa điểm, tên phụ..." className="search-pill h-8 w-56" />
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
            icon={<MapPin className="h-5 w-5" />}
            title={search.trim() ? 'Không tìm thấy địa điểm' : 'Chưa có địa điểm nào'}
            compact
            action={!search.trim() ? (
              <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
                <Plus size={14} strokeWidth={2.25} /><span>Thêm địa điểm</span>
              </button>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full [&_td]:align-middle" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--theme-bg-primary)', borderBottom: '1px solid var(--theme-border-light)' }}>
                  <th className="px-3 py-2.5 w-12"></th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tên địa điểm</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tên phụ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loc, i) => (
                  <LocationRow
                    key={loc.id}
                    location={loc}
                    aliasCount={aliasesByLoc.get(loc.id)?.length ?? 0}
                    onOpenDetail={() => setDetailTarget(loc)}
                    isLast={i === filtered.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      {/* Detail sheet */}
      {detailTarget && !editTarget && (
        <LocationDetailSheet
          location={detailTarget}
          aliases={aliasesByLoc.get(detailTarget.id) ?? []}
          onClose={() => setDetailTarget(null)}
          onEdit={() => { setEditTarget(detailTarget); setDetailTarget(null) }}
          onDelete={() => { setDeleteTarget(detailTarget); setDetailTarget(null) }}
          onPromoteAlias={handlePromoteAlias}
          onDeleteAlias={handleDeleteAlias}
          onAddAlias={(alias) => handleAddAlias(detailTarget.id, alias)}
          promoting={promoteAlias.isPending}
          addingAlias={createAlias.isPending}
        />
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá địa điểm?</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ background: 'color-mix(in srgb, var(--theme-status-error) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--theme-status-error) 15%, transparent)' }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-error)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              <strong style={{ color: 'var(--theme-text-primary)' }}>{deleteTarget?.name}</strong> sẽ bị xoá vĩnh viễn cùng tất cả tên phụ.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} variant="destructive" className="flex-1">Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit sheets */}
      <LocationFormSheet open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} title="Thêm địa điểm" saving={createLocation.isPending} />
      <LocationFormSheet key={editTarget?.id ?? 'none'} open={!!editTarget} onClose={() => setEditTarget(null)} onSave={handleUpdate} title="Sửa tên địa điểm" initialName={editTarget?.name} saving={updateLocation.isPending} />

      {/* Merge dialog */}
      <MergeDialog open={mergeOpen} onClose={() => setMergeOpen(false)} locations={locations} onMerge={handleMerge} merging={mergeLocations.isPending} />
    </div>
  )
}
