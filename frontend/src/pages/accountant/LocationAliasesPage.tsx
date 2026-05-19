import { useState, useMemo } from 'react'
import { MapPin, ChevronDown, ChevronRight, ArrowUp, Plus, X, Merge, Info } from 'lucide-react'
import { Panel } from '@/components/shared/Panel'
import { Pill } from '@/components/shared/Pill'
import { Toolbar, ToolbarSearch } from '@/components/shared/Toolbar'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { fuzzyMatch } from '@/lib/search-utils'
import {
  useLocations,
  useLocationAliases,
  useCreateAlias,
  usePromoteAlias,
  useMergeLocations,
} from '@/hooks/use-queries'
import type { LocationAlias } from '@/data/domain'

export function LocationAliasesPage() {
  const [tab, setTab] = useState<'locations' | 'merge'>('locations')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [addingFor, setAddingFor] = useState<number | null>(null)
  const [newAlias, setNewAlias] = useState('')
  const [mergeSource, setMergeSource] = useState<number | ''>('')
  const [mergeTarget, setMergeTarget] = useState<number | ''>('')

  const { data: locations = [], isLoading } = useLocations()
  const { data: aliases = [] } = useLocationAliases()
  const createAlias = useCreateAlias()
  const promoteAlias = usePromoteAlias()
  const mergeLocations = useMergeLocations()

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
    return locations.filter(l => fuzzyMatch(search, l.name))
  }, [locations, search])

  function handleAddAlias(locationId: number) {
    if (!newAlias.trim()) return
    createAlias.mutate(
      { locationId, alias: newAlias.trim() },
      { onSuccess: () => { setNewAlias(''); setAddingFor(null) } },
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="typo-display">Quản lý địa điểm</h1>
          <p className="typo-body-sm mt-1.5">
            Quản lý tên địa điểm chính, các alias và thao tác gộp địa điểm trùng lặp
          </p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList variant="underline">
          <TabsTrigger value="locations">
            <MapPin className="h-3.5 w-3.5 mr-1.5" /> Địa điểm
          </TabsTrigger>
          <TabsTrigger value="merge">
            <Merge className="h-3.5 w-3.5 mr-1.5" /> Gộp địa điểm
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="mt-5">
          <Panel
            title="Danh sách địa điểm"
            subtitle={`${locations.length} địa điểm${aliases.length > 0 ? ` · ${aliases.length} alias` : ''}`}
            flush
          >
            <Toolbar bordered>
              <ToolbarSearch
                value={search}
                onChange={setSearch}
                placeholder="Tìm địa điểm..."
                width={280}
              />
            </Toolbar>

            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-10">
                <EmptyState
                  icon={<MapPin className="h-5 w-5" />}
                  title={search.trim() ? 'Không tìm thấy địa điểm' : 'Chưa có địa điểm nào'}
                  compact
                />
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--line)' }}>
                {filtered.map((loc) => {
                  const locAliases = aliasesByLoc.get(loc.id) ?? []
                  const isExpanded = expandedId === loc.id
                  const isAdding = addingFor === loc.id

                  return (
                    <li key={loc.id} style={{ borderTop: '1px solid var(--line)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedId(isExpanded ? null : loc.id)
                          setAddingFor(null)
                          setNewAlias('')
                        }}
                        className="nepo-location-row w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
                          )}
                          <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                            {loc.name}
                          </span>
                        </div>
                        <Pill variant={locAliases.length > 0 ? 'accent' : 'neutral'} dot={false}>
                          {locAliases.length} alias
                        </Pill>
                      </button>

                      {isExpanded && (
                        <div className="pl-11 pr-5 pb-4 space-y-2" style={{ background: 'var(--surface-2)' }}>
                          {locAliases.length === 0 && (
                            <p className="text-[13px] py-2" style={{ color: 'var(--ink-3)' }}>
                              Chưa có alias nào cho địa điểm này.
                            </p>
                          )}
                          {locAliases.map(a => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--line)',
                                borderRadius: 'var(--r-sm)',
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[13px] truncate" style={{ color: 'var(--ink)' }}>
                                  {a.alias}
                                </span>
                                {a.source && (
                                  <span
                                    className="text-[10.5px] uppercase font-semibold shrink-0"
                                    style={{ color: 'var(--ink-3)', letterSpacing: '0.06em' }}
                                  >
                                    ({a.source})
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => promoteAlias.mutate(a.id)}
                                disabled={promoteAlias.isPending}
                              >
                                <ArrowUp className="h-3 w-3" />
                                Đổi tên chính
                              </Button>
                            </div>
                          ))}

                          {isAdding ? (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                value={newAlias}
                                onChange={e => setNewAlias(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddAlias(loc.id)
                                  if (e.key === 'Escape') { setAddingFor(null); setNewAlias('') }
                                }}
                                placeholder="Nhập alias mới..."
                                autoFocus
                                className="nepo-input flex-1"
                                style={{ minHeight: 36, padding: '8px 12px', fontSize: 13 }}
                              />
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAddAlias(loc.id)}
                                disabled={createAlias.isPending || !newAlias.trim()}
                              >
                                Lưu
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => { setAddingFor(null); setNewAlias('') }}
                                aria-label="Hủy"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="pt-1">
                              <Button
                                variant="muted"
                                size="sm"
                                onClick={() => { setAddingFor(loc.id); setNewAlias('') }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Thêm alias
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="merge" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
            <Panel
              title="Gộp địa điểm trùng"
              subtitle="Tất cả alias và tham chiếu sẽ được chuyển sang địa điểm đích"
            >
              <div className="space-y-5">
                <div
                  className="flex items-start gap-2.5 px-4 py-3"
                  style={{
                    background: 'var(--warning-soft)',
                    borderRadius: 'var(--r)',
                  }}
                >
                  <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
                  <p className="text-[12.5px] m-0" style={{ color: 'var(--warning)' }}>
                    Thao tác này không thể hoàn tác. Hãy chắc chắn hai địa điểm là cùng một thực thể.
                  </p>
                </div>

                <div>
                  <label className="nepo-field-label" htmlFor="merge-source">
                    Địa điểm nguồn <span style={{ color: 'var(--ink-3)' }}>(sẽ bị gộp)</span>
                  </label>
                  <select
                    id="merge-source"
                    value={mergeSource}
                    onChange={e => setMergeSource(Number(e.target.value) || '')}
                    className="nepo-select"
                  >
                    <option value="">— Chọn địa điểm —</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="nepo-field-label" htmlFor="merge-target">
                    Địa điểm đích <span style={{ color: 'var(--ink-3)' }}>(giữ lại)</span>
                  </label>
                  <select
                    id="merge-target"
                    value={mergeTarget}
                    onChange={e => setMergeTarget(Number(e.target.value) || '')}
                    className="nepo-select"
                  >
                    <option value="">— Chọn địa điểm —</option>
                    {locations
                      .filter(l => l.id !== mergeSource)
                      .map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    variant="default"
                    onClick={() => {
                      if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return
                      mergeLocations.mutate(
                        { sourceLocationId: mergeSource, targetLocationId: mergeTarget },
                        { onSuccess: () => { setMergeSource(''); setMergeTarget('') } },
                      )
                    }}
                    disabled={
                      mergeLocations.isPending ||
                      !mergeSource ||
                      !mergeTarget ||
                      mergeSource === mergeTarget
                    }
                  >
                    <Merge className="h-4 w-4" />
                    {mergeLocations.isPending ? 'Đang gộp...' : 'Gộp địa điểm'}
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel title="Hướng dẫn">
              <ol className="m-0 pl-4 space-y-2.5 text-[13px]" style={{ color: 'var(--ink-2)' }}>
                <li>Chọn địa điểm bị trùng (nguồn).</li>
                <li>Chọn địa điểm chính thức (đích).</li>
                <li>Hệ thống chuyển toàn bộ alias và tham chiếu sang đích.</li>
                <li>Sau khi gộp, địa điểm nguồn bị xóa khỏi danh sách.</li>
              </ol>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
