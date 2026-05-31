import { useState, useMemo, useRef, useEffect } from 'react'
import { MapPin, Plus, AlertTriangle, Merge, Trash2, Tag, X, ArrowLeft } from 'lucide-react'
import { EditableLocationName } from '@/components/shared/cards/EditableLocationName'
import { AliasChip } from '@/components/shared/cards/AliasChip'
import { findDuplicateHint } from '@/lib/duplicate-detection'
import type { Location, LocationAlias } from '@/data/domain'

export interface LocationDetailPanelProps {
  location: Location
  aliases: LocationAlias[]
  allAliases: LocationAlias[]
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
  onBack?: () => void
}

export function LocationDetailPanel({
  location, aliases, allAliases, allLocations, onUpdate, onDelete, onPromoteAlias, onDeleteAlias, onAddAlias,
  onMergeInto, updatePending, addingAlias, promoting, onBack,
}: LocationDetailPanelProps) {
  const [adding, setAdding] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const newAliasRef = useRef<HTMLInputElement>(null)
  const aliasesByLocAll = useMemo(() => {
    const m = new Map<number, LocationAlias[]>()
    for (const a of allAliases) {
      const list = m.get(a.locationId) ?? []
      list.push(a)
      m.set(a.locationId, list)
    }
    return m
  }, [allAliases])
  const duplicate = useMemo(
    () => findDuplicateHint(location, allLocations, aliasesByLocAll),
    [location, allLocations, aliasesByLocAll],
  )

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
 setNewAlias(''); setAdding(false) }, [location.id])
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
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 mb-2.5 text-[12px] font-medium transition-colors"
                style={{ color: 'var(--accent)', background: 'none', border: 'none', padding: '6px 0', minHeight: 44 }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
              </button>
            )}
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
              style={{ background: 'var(--warning)', color: 'var(--theme-text-on-brand)', border: 'none' }}
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
