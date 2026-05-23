import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { MapPin, Plus, AlertTriangle, Merge, ArrowUp, Trash2, Search, X, Check, Pencil, Tag } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { DangerConfirmDialog } from '@/components/shared/DangerConfirmDialog/DangerConfirmDialog'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatPill } from '@/components/shared/StatPill'
import { PageHeader } from '@/components/shared/PageHeader'
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
import { fuzzyMatch, normalizeVietnamese } from '@/lib/search-utils'
import type { Location, LocationAlias } from '@/data/domain'

// ─── Near-duplicate detection ─────────────────────────────────────────────────

/**
 * Returns true if two location names look like potential duplicates:
 * one is a prefix/substring of the other in normalized form, OR they share
 * a common acronym pattern (e.g. "NAM ĐỊNH VŨ" ↔ "NHĐV").
 */
function looksLikeDuplicate(a: string, b: string): boolean {
  const na = normalizeVietnamese(a).replace(/\s+/g, '')
  const nb = normalizeVietnamese(b).replace(/\s+/g, '')
  if (!na || !nb || na === nb) return false
  if (na.length < 3 || nb.length < 3) return false
  // Substring containment (e.g., "đình vũ" inside "nam định vũ")
  if (na.includes(nb) || nb.includes(na)) return true
  // Acronym match (e.g., "nhđv" vs "namdinhvu" → first letters of each word)
  const initialsA = normalizeVietnamese(a).split(/\s+/).map(w => w[0]).join('')
  const initialsB = normalizeVietnamese(b).split(/\s+/).map(w => w[0]).join('')
  if (initialsA.length >= 2 && initialsA === nb) return true
  if (initialsB.length >= 2 && initialsB === na) return true
  return false
}

function findDuplicateHint(loc: Location, all: Location[]): Location | null {
  for (const other of all) {
    if (other.id === loc.id) continue
    if (looksLikeDuplicate(loc.name, other.name)) return other
  }
  return null
}

// ─── Left-rail location row ───────────────────────────────────────────────────

function LocationListItem({
  location, aliasCount, isSelected, isDuplicateCandidate, onClick, 'data-loc-id': dataLocId,
}: {
  location: Location
  aliasCount: number
  isSelected: boolean
  isDuplicateCandidate: boolean
  onClick: () => void
  'data-loc-id'?: number
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      data-loc-id={dataLocId}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex items-center justify-between gap-2 px-3.5 py-2.5 transition-colors"
      style={{
        borderLeft: '3px solid',
        borderLeftColor: isSelected ? 'var(--accent)' : 'transparent',
        background: isSelected
          ? 'var(--surface)'
          : hovered
          ? 'color-mix(in srgb, var(--accent) 4%, var(--surface-2))'
          : 'transparent',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-[13px] font-medium truncate"
          style={{ color: isSelected ? 'var(--ink)' : hovered ? 'var(--ink)' : 'var(--ink-2)' }}
        >
          {location.name}
        </span>
        {isDuplicateCandidate && (
          <AlertTriangle
            className="h-3 w-3 shrink-0"
            style={{ color: 'var(--warning)' }}
            aria-label="Có thể trùng với địa điểm khác"
          />
        )}
      </div>
      {aliasCount > 0 && (
        <span
          className="text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded shrink-0"
          title={`${aliasCount} tên phụ`}
          style={{
            background: isSelected ? 'var(--accent-soft)' : 'var(--surface-3)',
            color: isSelected ? 'var(--accent)' : 'var(--ink-3)',
          }}
        >
          {aliasCount}
        </span>
      )}
    </button>
  )
}

// ─── Inline-editable location name (detail header) ────────────────────────────

function EditableLocationName({
  name, onSave, saving,
}: {
  name: string
  onSave: (newName: string) => void
  saving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setValue(name); setEditing(false) }, [name])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = () => {
    const v = value.trim()
    if (!v || v === name) { setEditing(false); setValue(name); return }
    onSave(v)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            if (e.key === 'Escape') { setEditing(false); setValue(name) }
          }}
          className="nepo-input"
          style={{ fontSize: 20, fontWeight: 600, flex: 1, maxWidth: 360 }}
        />
        <button
          type="button"
          onClick={commit}
          disabled={saving}
          className="flex items-center justify-center rounded"
          style={{ width: 28, height: 28, background: 'var(--success)', color: '#fff' }}
          title="Lưu (Enter)"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setValue(name) }}
          className="flex items-center justify-center rounded"
          style={{ width: 28, height: 28, background: 'var(--surface-3)', color: 'var(--ink-2)' }}
          title="Huỷ (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <h2
        className="m-0"
        style={{
          fontFamily: 'var(--theme-font-display)',
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
        }}
      >
        {name}
      </h2>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 26, height: 26, color: 'var(--ink-3)' }}
        title="Sửa tên"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Right-side detail panel ──────────────────────────────────────────────────

function LocationDetailPanel({
  location, aliases, allLocations, onUpdate, onDelete, onPromoteAlias, onDeleteAlias, onAddAlias,
  onMergeInto, updatePending, addingAlias, promoting,
}: {
  location: Location
  aliases: LocationAlias[]
  allLocations: Location[]
  onUpdate: (id: number, name: string) => void
  onDelete: (loc: Location) => void
  onPromoteAlias: (id: number) => void
  onDeleteAlias: (id: number) => void
  onAddAlias: (alias: string) => void
  onMergeInto: (target: Location) => void
  updatePending: boolean
  addingAlias: boolean
  promoting: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const newAliasRef = useRef<HTMLInputElement>(null)
  const duplicate = useMemo(() => findDuplicateHint(location, allLocations), [location, allLocations])

  useEffect(() => { setNewAlias(''); setAdding(false) }, [location.id])
  useEffect(() => { if (adding) newAliasRef.current?.focus() }, [adding])

  const submitAlias = () => {
    const v = newAlias.trim()
    if (!v) { setAdding(false); return }
    onAddAlias(v)
    setNewAlias('')
    // Stay in adding mode so user can quickly add multiple
    setTimeout(() => newAliasRef.current?.focus(), 50)
  }

  const cancelAdd = () => {
    setNewAlias('')
    setAdding(false)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} />
              <p className="text-[11px] uppercase tracking-wide m-0 font-semibold" style={{ color: 'var(--accent)' }}>
                Địa điểm
              </p>
            </div>
            <EditableLocationName
              name={location.name}
              onSave={(n) => onUpdate(location.id, n)}
              saving={updatePending}
            />
            <p className="text-[12px] mt-1" style={{ color: 'var(--ink-3)' }}>
              {aliases.length > 0
                ? `${aliases.length} tên phụ`
                : 'Chưa có tên phụ'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onDelete(location)}
              className="flex items-center justify-center rounded transition-colors"
              style={{ width: 32, height: 32, color: 'var(--ink-4)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger, #dc2626)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-4)')}
              title="Xoá địa điểm"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {duplicate && (
          <div
            className="mt-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
            style={{ background: 'var(--warning-soft)', border: '1px solid color-mix(in srgb, var(--warning) 50%, transparent)' }}
          >
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" style={{ color: 'var(--warning)' }} />
              <p className="text-[12px] m-0 leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                Có thể trùng với <strong>{duplicate.name}</strong>. Hãy gộp lại nếu cùng một địa điểm.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onMergeInto(duplicate)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium shrink-0 transition-colors"
              style={{ background: 'var(--warning)', color: '#fff', border: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              title={`Gộp vào "${duplicate.name}"`}
            >
              <Merge className="h-3.5 w-3.5" />
              Gộp
            </button>
          </div>
        )}
      </header>

      {/* Aliases */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Tag className="h-3 w-3 shrink-0" style={{ color: 'var(--ink-4)' }} />
          <h3
            className="text-[11px] uppercase tracking-wide m-0"
            style={{ color: 'var(--ink-4)', fontWeight: 600 }}
          >
            Tên phụ
          </h3>
          {aliases.length > 0 && (
            <span
              className="text-[10px] tabular-nums px-1.5 py-px rounded-full font-medium"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-3)' }}
            >
              {aliases.length}
            </span>
          )}
        </div>

        {aliases.length === 0 && !adding ? (
          <div
            className="flex flex-col items-start gap-3 rounded-xl p-4"
            style={{ border: '1.5px dashed var(--line-2, var(--line))' }}
          >
            <p className="text-[12px] m-0 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              Thêm tên gọi khác để hệ thống tự nhận diện địa điểm khi nhập liệu (ví dụ:
              "CVA", "Chu Van An").
            </p>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                border: 'none',
              }}
              title="Thêm tên phụ"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm tên phụ
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {aliases.map(a => (
              <AliasChip
                key={a.id}
                alias={a}
                onPromote={() => onPromoteAlias(a.id)}
                onDelete={() => onDeleteAlias(a.id)}
                disabled={promoting}
              />
            ))}

            {adding ? (
              <span
                className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full"
                style={{
                  background: 'var(--surface)',
                  border: '1px dashed var(--accent)',
                  minWidth: 160,
                }}
              >
                <input
                  ref={newAliasRef}
                  value={newAlias}
                  onChange={e => setNewAlias(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); submitAlias() }
                    if (e.key === 'Escape') { e.preventDefault(); cancelAdd() }
                  }}
                  onBlur={() => { if (!newAlias.trim()) cancelAdd() }}
                  placeholder="Tên phụ mới…"
                  disabled={addingAlias}
                  className="flex-1 bg-transparent border-0 outline-none text-[12px] min-w-0"
                  style={{ color: 'var(--ink)' }}
                />
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={cancelAdd}
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{ width: 18, height: 18, color: 'var(--ink-3)' }}
                  title="Huỷ (Esc)"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full text-[12px] transition-colors"
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--line-2, var(--line))',
                  color: 'var(--ink-3)',
                }}
                title="Thêm tên phụ"
              >
                <Plus className="h-3 w-3" />
                Thêm
              </button>
            )}
          </div>
        )}
      </div>

      {/* Metadata footer */}
      <footer
        className="px-6 py-3 shrink-0 flex items-center gap-3 text-[11px]"
        style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-4)' }}
      >
        <span>Tạo {new Date(location.createdAt).toLocaleDateString('vi-VN')}</span>
        {location.updatedAt && location.updatedAt !== location.createdAt && (
          <>
            <span style={{ color: 'var(--line-2, var(--line))' }}>·</span>
            <span>Cập nhật {new Date(location.updatedAt).toLocaleDateString('vi-VN')}</span>
          </>
        )}
        <span className="ml-auto tabular-nums font-medium" style={{ color: 'var(--ink-4)' }}>
          #{location.id}
        </span>
      </footer>
    </div>
  )
}

function AliasChip({
  alias, onPromote, onDelete, disabled,
}: {
  alias: LocationAlias
  onPromote: () => void
  onDelete: () => void
  disabled?: boolean
}) {
  return (
    <span
      className="group inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-[12px] transition-colors"
      style={{
        background: 'var(--accent-soft)',
        color: 'var(--accent)',
        border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
      }}
    >
      <span className="font-medium leading-none">{alias.alias}</span>
      {alias.source && alias.source !== 'manual' && (
        <span
          className="text-[9px] uppercase tracking-wide px-1 py-px rounded"
          style={{ background: 'var(--surface)', color: 'var(--ink-3)' }}
        >
          {alias.source}
        </span>
      )}
      <span className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
        <button
          type="button"
          onClick={onPromote}
          disabled={disabled}
          className="flex items-center justify-center rounded-full"
          style={{ width: 18, height: 18, color: 'var(--accent)' }}
          title="Đặt làm tên chính"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center justify-center rounded-full"
          style={{ width: 18, height: 18, color: 'var(--accent)' }}
          title="Xoá tên phụ"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    </span>
  )
}

// ─── Create-new-location row in left rail ─────────────────────────────────────

function NewLocationInput({
  onCreate, onCancel, saving,
}: {
  onCreate: (name: string) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const submit = () => {
    if (!name.trim()) { onCancel(); return }
    onCreate(name.trim())
  }

  return (
    <div
      className="flex items-center gap-1 px-3 py-2"
      style={{ borderBottom: '1px solid var(--line)', background: 'var(--accent-soft)' }}
    >
      <input
        ref={ref}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); submit() }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Tên địa điểm mới…"
        className="nepo-input text-[13px] flex-1"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim() || saving}
        className="flex items-center justify-center rounded"
        style={{ width: 26, height: 26, background: 'var(--success)', color: '#fff', opacity: !name.trim() ? 0.5 : 1 }}
        title="Tạo (Enter)"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center justify-center rounded"
        style={{ width: 26, height: 26, background: 'var(--surface-3)', color: 'var(--ink-2)' }}
        title="Huỷ (Esc)"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Merge Dialog (preserved, lightly improved) ───────────────────────────────

function MergeDialog({
  open, onClose, locations, presetSource, presetTarget, onMerge, merging,
}: {
  open: boolean
  onClose: () => void
  locations: Location[]
  presetSource?: number
  presetTarget?: number
  onMerge: (s: number, t: number) => void
  merging: boolean
}) {
  const [source, setSource] = useState<number | ''>('')
  const [target, setTarget] = useState<number | ''>('')

  useEffect(() => {
    if (open) {
      setSource(presetSource ?? '')
      setTarget(presetTarget ?? '')
    }
  }, [open, presetSource, presetTarget])

  const handleClose = useCallback(() => { setSource(''); setTarget(''); onClose() }, [onClose])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Gộp địa điểm trùng</DialogTitle></DialogHeader>

        <div
          className="flex items-start gap-3 rounded-lg px-3 py-2.5"
          style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}
        >
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
            <InlineSelect
              placeholder="— Chọn địa điểm —"
              value={source !== '' ? String(source) : ''}
              options={[
                { value: '', label: '— Chọn địa điểm —' },
                ...locations.map(l => ({ value: String(l.id), label: l.name })),
              ]}
              onChange={v => setSource(v ? Number(v) : '')}
            />
          </div>
          <div>
            <label className="nepo-field-label">
              Địa điểm đích <span style={{ color: 'var(--ink-3)' }}>(giữ lại)</span>
            </label>
            <InlineSelect
              placeholder="— Chọn địa điểm —"
              value={target !== '' ? String(target) : ''}
              options={[
                { value: '', label: '— Chọn địa điểm —' },
                ...locations.filter(l => l.id !== source).map(l => ({ value: String(l.id), label: l.name })),
              ]}
              onChange={v => setTarget(v ? Number(v) : '')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Huỷ</Button>
          <Button
            variant="default"
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

  // Detect potential duplicates (compute once per location-set change)
  const duplicateIds = useMemo(() => {
    const ids = new Set<number>()
    for (const loc of locations) {
      if (findDuplicateHint(loc, locations)) ids.add(loc.id)
    }
    return ids
  }, [locations])

  // Search filter (matches both location name and any alias)
  const filtered = useMemo(() => {
    if (!search.trim()) return locations
    const q = search.toLowerCase()
    return locations.filter(l => {
      if (fuzzyMatch(l.name, search)) return true
      return (aliasesByLoc.get(l.id) ?? []).some(a => fuzzyMatch(a.alias, search) || a.alias.toLowerCase().includes(q))
    })
  }, [locations, search, aliasesByLoc])

  // Auto-select first location once data loads, or when current selection disappears
  useEffect(() => {
    if (locations.length === 0) {
      if (selectedId !== null) setSelectedId(null)
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
    <div className="animate-fade-in flex flex-col" style={{ minHeight: 'calc(100dvh - 80px)' }}>
      {/* ── Header ── */}
      <div className="shrink-0">
        <PageHeader
          title="Địa điểm"
          subtitle="Quản lý địa điểm và tên phụ"
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
            <button
              type="button"
              onClick={() => setCreating(true)}
              disabled={creating}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-[12px] font-medium transition-colors"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                opacity: creating ? 0.5 : 1,
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm địa điểm
            </button>
          </div>

          {/* List — scroll-fade wrapper */}
          <div className="flex-1 relative overflow-hidden">
            <div
              className="absolute inset-x-0 bottom-0 h-8 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(to bottom, transparent, var(--surface-2))',
              }}
            />
            <div ref={listRef} className="h-full overflow-y-auto">
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
      <MergeDialog
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
