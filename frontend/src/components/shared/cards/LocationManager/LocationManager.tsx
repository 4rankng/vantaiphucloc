import { useState, useEffect, useCallback, useRef } from 'react'
import { normalizeVietnamese } from '@/lib/search-utils'
import { Plus, Check, X, Loader2, Star, Trash2 } from 'lucide-react'
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '@/hooks/use-queries'
import { api } from '@/services/api/client'
import { toCamel } from '@/services/api/utils'
import { useToast } from '@/components/atoms/Toast'
import { ConfirmDialog } from '@/components/shared/overlays/ConfirmDialog/ConfirmDialog'
import { useQueryClient } from '@tanstack/react-query'
import type { Location as Loc, LocationAlias } from '@/data/domain'

interface LocationManagerProps {
  search?: string
}

export function LocationManager({ search }: LocationManagerProps) {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: locations = [], isLoading } = useLocations()
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()
  const deleteLocation = useDeleteLocation()

  const [aliasData, setAliasData] = useState<Record<number, LocationAlias[]>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [addingAliasFor, setAddingAliasFor] = useState<number | null>(null)
  const [newAliasValue, setNewAliasValue] = useState('')
  const [newLocationName, setNewLocationName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const aliasInputRef = useRef<HTMLInputElement>(null)
  const [confirmTarget, setConfirmTarget] = useState<{
    type: 'alias' | 'location'
    locationId: number
    aliasId?: number
    label: string
  } | null>(null)

  const filtered = search?.trim()
    ? locations.filter((l: Loc) => {
        const q = normalizeVietnamese(search)
        if (normalizeVietnamese(l.name).includes(q)) return true
        const aliases = aliasData[l.id] ?? []
        return aliases.some(a => normalizeVietnamese(a.alias).includes(q))
      })
    : locations

  const fetchAliases = async (locationId: number) => {
    try {
      const res = await api.get('/location-aliases', { params: { location_id: locationId } })
      const aliases = ((res.data?.items ?? res.data ?? []) as Record<string, unknown>[]).map((r) => toCamel<LocationAlias>(r))
      setAliasData(prev => ({ ...prev, [locationId]: aliases }))
    } catch {
      setAliasData(prev => ({ ...prev, [locationId]: [] }))
    }
  }

  useEffect(() => {
    filtered.forEach((l: Loc) => {
      if (aliasData[l.id]) return
      fetchAliases(l.id)
    })
  }, [filtered, aliasData])

  useEffect(() => {
    if (editingKey && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingKey])

  useEffect(() => {
    if (addingAliasFor !== null && aliasInputRef.current) {
      aliasInputRef.current.focus()
    }
  }, [addingAliasFor])

  const getAliases = useCallback((locationId: number) => {
    const loc = locations.find((l: Loc) => l.id === locationId)
    return (aliasData[locationId] ?? [])
      .filter(a => !loc || a.alias !== loc.name)
  }, [aliasData, locations])

  const handleCreateLocation = async () => {
    const trimmed = newLocationName.trim()
    if (!trimmed) return
    try {
      await createLocation.mutateAsync({ name: trimmed })
      toast.success('Đã thêm địa điểm')
      setNewLocationName('')
    } catch {
      toast.error('Không thể thêm địa điểm')
    }
  }

  const handleUpdatePrimary = async (locationId: number) => {
    const trimmed = editValue.trim()
    if (!trimmed) { setEditingKey(null); return }
    const loc = locations.find((l: Loc) => l.id === locationId)
    if (!loc || trimmed === loc.name) { setEditingKey(null); return }

    try {
      await updateLocation.mutateAsync({ id: locationId, data: { name: trimmed } })
      toast.success('Đã cập nhật tên chính')
      setEditingKey(null)
    } catch {
      toast.error('Không thể cập nhật tên chính')
    }
  }

  const handleAddAlias = async (locationId: number) => {
    const trimmed = newAliasValue.trim()
    if (!trimmed) return
    const actionKey = `add-alias-${locationId}`
    setPendingAction(actionKey)
    try {
      await api.post('/location-aliases', { location_id: locationId, alias: trimmed, source: 'manual' })
      await fetchAliases(locationId)
      toast.success('Đã thêm tên phụ')
      setNewAliasValue('')
      setAddingAliasFor(null)
    } catch {
      toast.error('Không thể thêm tên phụ')
    } finally {
      setPendingAction(null)
    }
  }

  const handlePromoteAlias = async (locationId: number, aliasId: number) => {
    const aliases = aliasData[locationId] ?? []
    const alias = aliases.find(a => a.id === aliasId)
    if (!alias) return

    const actionKey = `promote-${aliasId}`
    setPendingAction(actionKey)
    try {
      await api.post(`/location-aliases/${aliasId}/promote`)
      await qc.refetchQueries({ queryKey: ['locations'] })
      await fetchAliases(locationId)
      toast.success(`Đã đặt "${alias.alias}" làm tên chính`)
    } catch (err: unknown) {
      const detail = typeof err === 'object' && err !== null && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined
      const msg = detail ?? 'Không thể đổi tên chính'
      toast.error(msg)
    } finally {
      setPendingAction(null)
    }
  }

  const handleDeleteAlias = (locationId: number, aliasId: number) => {
    const aliases = aliasData[locationId] ?? []
    const alias = aliases.find(a => a.id === aliasId)
    if (!alias) return
    setConfirmTarget({ type: 'alias', locationId, aliasId, label: alias.alias })
  }

  const confirmDeleteAlias = async () => {
    if (!confirmTarget || confirmTarget.type !== 'alias' || !confirmTarget.aliasId) return
    const actionKey = `del-alias-${confirmTarget.aliasId}`
    setPendingAction(actionKey)
    try {
      await api.delete(`/location-aliases/${confirmTarget.aliasId}`)
      await fetchAliases(confirmTarget.locationId)
      toast.success('Đã xoá tên phụ')
    } catch {
      toast.error('Không thể xoá tên phụ')
    } finally {
      setPendingAction(null)
      setConfirmTarget(null)
    }
  }

  const handleDeleteLocation = (locationId: number) => {
    const loc = locations.find((l: Loc) => l.id === locationId)
    if (!loc) return
    setConfirmTarget({ type: 'location', locationId, label: loc.name })
  }

  const confirmDeleteLocation = async () => {
    if (!confirmTarget || confirmTarget.type !== 'location') return
    try {
      await deleteLocation.mutateAsync(confirmTarget.locationId)
      toast.success('Đã xoá địa điểm')
    } catch {
      toast.error('Không thể xoá địa điểm')
    } finally {
      setConfirmTarget(null)
    }
  }

  // ─── Loading / Empty ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  if (locations.length === 0 && !newLocationName) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>Chưa có địa điểm nào</p>
        <InlineCreate
          value={newLocationName}
          onChange={setNewLocationName}
          onSubmit={handleCreateLocation}
          placeholder="Nhập tên địa điểm đầu tiên..."
        />
      </div>
    )
  }

  // ─── Table ───────────────────────────────────────────────────────────

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--theme-bg-tertiary)', borderBottom: '2px solid var(--theme-border-default)' }}>
            <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)', width: 220 }}>Tên chính</th>
            <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tên phụ</th>
            <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)', width: 52 }} />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={3} className="px-5 py-1.5" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
              <span style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>
                Nhấp tên để sửa ·{' '}
                <Star className="inline h-2.5 w-2.5" style={{ color: 'var(--theme-brand-primary)', verticalAlign: -1 }} />{' '}
                đặt tên phụ thành chính ·{' '}
                <Plus className="inline h-2.5 w-2.5" style={{ verticalAlign: -1 }} />{' '}
                thêm tên phụ
              </span>
            </td>
          </tr>
          {filtered.map((loc: Loc, i: number) => {
            const aliases = getAliases(loc.id)
            const isEditing = editingKey === `primary-${loc.id}`
            const isAddingAlias = addingAliasFor === loc.id

            return (
              <tr
                key={loc.id}
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--theme-border-light)' : 'none',
                  background: i % 2 === 1 ? 'var(--theme-bg-tertiary)' : 'transparent',
                }}
              >
                {/* Tên chính */}
                <td className="px-5 py-3">
                  {isEditing ? (
                    <InlineInput
                      value={editValue}
                      onChange={setEditValue}
                      onSubmit={() => handleUpdatePrimary(loc.id)}
                      onCancel={() => { setEditingKey(null); setEditValue('') }}
                      inputRef={editInputRef}
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingKey(`primary-${loc.id}`); setEditValue(loc.name) }}
                      className="text-left rounded px-1 py-0.5 transition-colors cursor-pointer"
                      title="Click để sửa"
                    >
                      <span className="text-[13px] font-bold" style={{ color: 'var(--theme-text-primary)' }}>{loc.name}</span>
                    </button>
                  )}
                </td>

                {/* Tên phụ — all aliases as pills on same row */}
                <td className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {aliases.map(a => {
                      const isBusy = pendingAction === `promote-${a.id}` || pendingAction === `del-alias-${a.id}`
                      return (
                        <span
                          key={a.id}
                          className="group inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5"
                          style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)' }}
                        >
                          <span className="text-[12px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{a.alias}</span>
                          <button
                            onClick={() => handlePromoteAlias(loc.id, a.id)}
                            disabled={isBusy}
                            className="flex h-5 w-5 items-center justify-center rounded-full transition-colors"
                            style={{ color: 'var(--theme-brand-primary)' }}
                            title="Đặt làm tên chính"
                          >
                            {pendingAction === `promote-${a.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={() => handleDeleteAlias(loc.id, a.id)}
                            disabled={isBusy}
                            className="flex h-5 w-5 items-center justify-center rounded-full transition-colors"
                            style={{ color: 'var(--theme-text-muted)' }}
                            title="Xoá tên phụ"
                          >
                            {pendingAction === `del-alias-${a.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                          </button>
                        </span>
                      )
                    })}

                    {isAddingAlias ? (
                      <InlineInput
                        value={newAliasValue}
                        onChange={setNewAliasValue}
                        onSubmit={() => handleAddAlias(loc.id)}
                        onCancel={() => { setAddingAliasFor(null); setNewAliasValue('') }}
                        inputRef={aliasInputRef}
                        placeholder="Tên phụ..."
                        compact
                      />
                    ) : (
                      <button
                        onClick={() => { setAddingAliasFor(loc.id); setNewAliasValue('') }}
                        className="inline-flex items-center justify-center rounded-full transition-colors"
                        style={{ border: '1.5px dashed var(--theme-border-default)', color: 'var(--theme-text-muted)', width: 24, height: 24 }}
                        title="Thêm tên phụ"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </td>

                {/* Delete location */}
                <td className="px-3 py-3 text-right">
                  <button
                    onClick={() => handleDeleteLocation(loc.id)}
                    disabled={deleteLocation.isPending}
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                    style={{ color: 'var(--theme-text-muted)' }}
                    title="Xoá địa điểm"
                  >
                    {deleteLocation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--theme-border-default)', background: 'var(--theme-bg-tertiary)' }}>
            <td colSpan={3} className="px-3 py-2.5">
              <InlineCreate
                value={newLocationName}
                onChange={setNewLocationName}
                onSubmit={handleCreateLocation}
                placeholder="Thêm địa điểm..."
              />
            </td>
          </tr>
        </tfoot>
      </table>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmTarget?.type === 'alias' ? confirmDeleteAlias : confirmDeleteLocation}
        title={confirmTarget?.type === 'alias' ? 'Xoá tên phụ' : 'Xoá địa điểm'}
        description={
          confirmTarget?.type === 'alias'
            ? `Xoá tên phụ "${confirmTarget.label}"? Hành động này không thể hoàn tác.`
            : `Xoá địa điểm "${confirmTarget?.label}" và tất cả tên phụ? Hành động này không thể hoàn tác.`
        }
        confirmLabel="Xoá"
        variant="danger"
      />
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────

function InlineInput({
  value, onChange, onSubmit, onCancel, placeholder, inputRef, isLoading, compact,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  placeholder?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  isLoading?: boolean
  compact?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel() }}
        placeholder={placeholder}
        autoFocus
        className="rounded-md border px-2 py-1 outline-none"
        style={{
          background: 'var(--theme-bg-primary)',
          borderColor: 'var(--theme-brand-primary)',
          color: 'var(--theme-text-primary)',
          boxShadow: '0 0 0 2px color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)',
          fontSize: compact ? 12 : 13,
          width: compact ? 100 : 120,
        }}
      />
      <button
        onClick={onSubmit}
        disabled={!value.trim() || isLoading}
        className="flex shrink-0 items-center justify-center rounded-md transition-opacity"
        style={{
          background: 'var(--theme-brand-primary)',
          color: 'var(--theme-text-on-brand)',
          width: 24,
          height: 24,
          opacity: !value.trim() ? 0.4 : 1,
        }}
      >
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      </button>
      <button
        onClick={onCancel}
        className="flex shrink-0 items-center justify-center rounded-md"
        style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)', width: 24, height: 24 }}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

function InlineCreate({
  value, onChange, onSubmit, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onChange('') }}
        placeholder={placeholder}
        className="flex-1 rounded-md border px-2.5 py-1.5 text-xs outline-none"
        style={{
          background: 'var(--theme-bg-secondary)',
          borderColor: 'var(--theme-border-default)',
          color: 'var(--theme-text-primary)',
        }}
        onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--theme-brand-primary)' }}
        onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--theme-border-default)' }}
      />
      <button
        onClick={onSubmit}
        disabled={!value.trim()}
        className="flex h-7 items-center gap-1 rounded-md px-3 text-[11px] font-semibold transition-opacity"
        style={{
          background: value.trim() ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
          color: value.trim() ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
          opacity: value.trim() ? 1 : 0.4,
        }}
      >
        <Plus className="h-3 w-3" strokeWidth={2.5} />
        Thêm
      </button>
    </div>
  )
}
