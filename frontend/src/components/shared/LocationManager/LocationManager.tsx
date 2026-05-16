import { useState, useEffect, useCallback } from 'react'
import { MapPin, Plus, Edit2, Check, X, Loader2, Trash2, Star } from 'lucide-react'
import { AliasManager } from '@/components/shared/AliasManager'
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '@/hooks/use-queries'
import { api } from '@/services/api/client'
import { toCamel } from '@/services/api/utils'
import { useToast } from '@/components/atoms/Toast'
import { useQueryClient } from '@tanstack/react-query'
import type { Location as Loc, LocationAlias } from '@/data/domain'

interface LocationManagerProps {
  search?: string
  compact?: boolean
}

export function LocationManager({ search, compact }: LocationManagerProps) {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: locations = [], isLoading } = useLocations()
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()
  const deleteLocation = useDeleteLocation()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [aliasData, setAliasData] = useState<Record<number, LocationAlias[]>>({})
  const [editingPrimary, setEditingPrimary] = useState(false)
  const [primaryValue, setPrimaryValue] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = search?.trim()
    ? locations.filter((l: Loc) => l.name.toLowerCase().includes(search.toLowerCase()))
    : locations

  const selectedLocation = locations.find((l: Loc) => l.id === selectedId) ?? null

  useEffect(() => {
    filtered.slice(0, 30).forEach((l: Loc) => {
      if (aliasData[l.id]) return
      fetchAliases(l.id)
    })
  }, [filtered])

  const fetchAliases = async (locationId: number) => {
    try {
      const res = await api.get('/location-aliases', { params: { location_id: locationId } })
      const aliases = ((res.data?.items ?? res.data ?? []) as Record<string, unknown>[]).map((r) => toCamel<LocationAlias>(r))
      setAliasData(prev => ({ ...prev, [locationId]: aliases }))
    } catch {
      setAliasData(prev => ({ ...prev, [locationId]: [] }))
    }
  }

  const handleAddAlias = useCallback(async (locationId: number, alias: string) => {
    try {
      await api.post('/location-aliases', { location_id: locationId, alias, source: 'manual' })
      await fetchAliases(locationId)
      toast.success('Đã thêm tên phụ')
    } catch {
      toast.error('Không thể thêm tên phụ')
    }
  }, [toast])

  const handlePromoteAlias = useCallback(async (locationId: number, aliasId: number) => {
    const aliases = aliasData[locationId] ?? []
    const alias = aliases.find(a => a.id === aliasId)
    if (!alias) return

    const loc = locations.find((l: Loc) => l.id === locationId)
    if (!loc) return

    const oldName = loc.name
    const newName = alias.alias

    try {
      await api.put(`/locations/${locationId}`, { name: newName })
      await api.post('/location-aliases', { location_id: locationId, alias: oldName, source: 'manual' })
      await api.post(`/location-aliases/${aliasId}/reject`)
      await fetchAliases(locationId)
      qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success(`Đã đặt "${newName}" làm tên chính`)
    } catch {
      toast.error('Không thể đổi tên chính')
    }
  }, [aliasData, locations, qc, toast])

  const handleDeleteAlias = useCallback(async (locationId: number, aliasId: number) => {
    try {
      await api.post(`/location-aliases/${aliasId}/reject`)
      await fetchAliases(locationId)
      toast.success('Đã xoá tên phụ')
    } catch {
      toast.error('Không thể xoá tên phụ')
    }
  }, [toast])

  const handleCreateLocation = async () => {
    const trimmed = newLocationName.trim()
    if (!trimmed) return

    setCreating(true)
    try {
      await createLocation.mutateAsync({ name: trimmed })
      toast.success('Đã thêm địa điểm')
      setNewLocationName('')
      setShowCreateDialog(false)
    } catch {
      toast.error('Không thể thêm địa điểm')
    } finally {
      setCreating(false)
    }
  }

  const handleUpdatePrimary = async () => {
    if (!selectedLocation || !primaryValue.trim()) return

    try {
      await updateLocation.mutateAsync({ id: selectedLocation.id, data: { name: primaryValue.trim() } })
      setEditingPrimary(false)
      toast.success('Đã cập nhật tên chính')
    } catch {
      toast.error('Không thể cập nhật tên chính')
    }
  }

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return

    if (!confirm(`Xoá địa điểm "${selectedLocation.name}"? Hành động này không thể hoàn tác.`)) return

    try {
      await deleteLocation.mutateAsync(selectedLocation.id)
      setSelectedId(null)
      toast.success('Đã xoá địa điểm')
    } catch {
      toast.error('Không thể xoá địa điểm')
    }
  }

  const confirmedAliases = (selectedLocation
    ? (aliasData[selectedLocation.id] ?? []).filter(a => a.status !== 'REJECTED' && a.status !== 'MERGED')
    : []
  ).map(a => ({ id: a.id, alias: a.alias }))

  const innerContent = (
    <div className="flex" style={{ height: compact ? '100%' : 600 }}>
      {/* Left panel: Location list */}
      <div className={`${compact ? 'w-full' : 'w-[280px] shrink-0 border-r'} overflow-y-auto`} style={{ borderColor: compact ? 'transparent' : 'var(--theme-border-light)', background: compact ? 'transparent' : 'var(--theme-bg-primary)' }}>
        {!compact && (
          <div className="sticky top-0 z-10 backdrop-blur-sm px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border-light)', background: 'color-mix(in srgb, var(--theme-bg-primary) 90%, transparent)' }}>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="w-full btn-primary text-xs flex items-center justify-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2.25} />
              Thêm địa điểm
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 gap-2">
            <MapPin className="h-5 w-5" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>
              {search ? 'Không tìm thấy địa điểm nào' : 'Chưa có địa điểm'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((loc: Loc) => {
              const aliasCount = (aliasData[loc.id] ?? []).filter(a => a.status !== 'REJECTED' && a.status !== 'MERGED').length
              return (
                <button
                  key={loc.id}
                  onClick={() => setSelectedId(loc.id)}
                  className="w-full px-4 py-2.5 text-left transition-colors flex items-center gap-2"
                  style={{
                    background: selectedId === loc.id ? 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (selectedId !== loc.id) (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'
                  }}
                  onMouseLeave={e => {
                    if (selectedId !== loc.id) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded" style={{
                    background: selectedId === loc.id ? 'var(--theme-brand-primary)' : 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)',
                  }}>
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: selectedId === loc.id ? 'var(--theme-text-on-brand)' : 'var(--theme-brand-primary)' }}
                    />
                  </div>
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: selectedId === loc.id ? 'var(--theme-brand-primary)' : 'var(--theme-text-primary)' }}>
                    {loc.name}
                  </span>
                  {aliasCount > 0 && (
                    <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>{aliasCount}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right panel: Detail — only show in non-compact mode */}
      {!compact && (
        <div className="flex-1 overflow-y-auto">
          {selectedLocation ? (
            <div className="p-5 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                    Tên chính
                  </p>
                  <button
                    onClick={() => { setPrimaryValue(selectedLocation.name); setEditingPrimary(true) }}
                    className="shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors"
                    style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
                  >
                    <Edit2 className="h-2.5 w-2.5" />
                    Đổi tên
                  </button>
                </div>

                {editingPrimary ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={primaryValue}
                      onChange={e => setPrimaryValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdatePrimary(); if (e.key === 'Escape') { setEditingPrimary(false); setPrimaryValue('') } }}
                      autoFocus
                      className="flex-1 rounded-md border px-3 py-2 text-sm font-semibold outline-none"
                      style={{
                        background: 'var(--theme-bg-primary)',
                        borderColor: 'var(--theme-brand-primary)',
                        color: 'var(--theme-text-primary)',
                      }}
                    />
                    <button
                      onClick={handleUpdatePrimary}
                      disabled={!primaryValue.trim() || updateLocation.isPending}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                      style={{ background: 'var(--theme-status-success)', color: '#fff' }}
                    >
                      {updateLocation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => { setEditingPrimary(false); setPrimaryValue('') }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                      style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)' }}>
                      <MapPin className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)', opacity: 0.7 }} />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}>
                      <Star className="h-3 w-3" fill="currentColor" style={{ color: 'var(--theme-brand-primary)' }} />
                      <span className="text-sm font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{selectedLocation.name}</span>
                    </div>
                  </div>
                )}
              </div>

              <AliasManager
                aliases={confirmedAliases}
                onAddAlias={(alias) => handleAddAlias(selectedLocation.id, alias)}
                onPromoteAlias={(id) => handlePromoteAlias(selectedLocation.id, id)}
                onDeleteAlias={(id) => handleDeleteAlias(selectedLocation.id, id)}
              />

              <div className="pt-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }}>
                <button
                  onClick={handleDeleteLocation}
                  disabled={deleteLocation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-red-600 transition-colors"
                  style={{ background: 'color-mix(in srgb, #ef4444 8%, transparent)' }}
                >
                  {deleteLocation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Xoá địa điểm này
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)' }}>
                <MapPin className="h-6 w-6" style={{ color: 'var(--theme-brand-primary)', opacity: 0.5 }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Chọn địa điểm</p>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>hoặc tạo địa điểm mới để bắt đầu</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      {compact ? (
        innerContent
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06), 0 4px 16px -4px rgba(9,9,11,0.05)' }}>
          {innerContent}
        </div>
      )}

      {/* Create location dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowCreateDialog(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border p-5 shadow-xl" style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)' }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--theme-text-primary)' }}>Thêm địa điểm mới</h3>
            <input
              value={newLocationName}
              onChange={e => setNewLocationName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateLocation(); if (e.key === 'Escape') setShowCreateDialog(false) }}
              placeholder="VD: HẢI AN, NHĐV..."
              autoFocus
              className="w-full rounded-md border px-3 py-2 text-sm outline-none mb-4"
              style={{
                background: 'var(--theme-bg-secondary)',
                borderColor: 'var(--theme-brand-primary)',
                color: 'var(--theme-text-primary)',
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="flex-1 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
              >
                Huỷ
              </button>
              <button
                onClick={handleCreateLocation}
                disabled={!newLocationName.trim() || creating}
                className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', opacity: (!newLocationName.trim() || creating) ? 0.5 : 1 }}
              >
                {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
