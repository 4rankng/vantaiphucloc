import { useCallback, useRef, useEffect, useMemo, useState } from 'react'
import type { ElementType, ReactNode, RefObject } from 'react'
import { Route, ChevronRight, ChevronsUpDown, Search, MapPin, Clock3, ChevronUp } from 'lucide-react'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { RoutePricingEditRow } from './RoutePricingEditRow'
import { RoutePricingRow } from './RoutePricingRow'
import { RoutePricingMobileGroup } from './RoutePricingMobileGroup'
import { COL, SALARY_TINT, SALARY_BORDER, GROUPED_LEFT_GROUP_WIDTH, FARE_GROUP_WIDTH, SALARY_GROUP_WIDTH, RIGHT_GROUP_WIDTH } from './RoutePricingTable.constants'
import type { FocusableField, RoutePricingFormData, RoutePricingTableProps, ClientGroup } from './RoutePricingTable.types'
import type { RoutePricing } from '@/data/domain'

export type { FocusableField, RoutePricingFormData, RoutePricingTableProps }
export type { ClientGroup }

// ─── Avatar helper ─────────────────────────────────────────────────────────

function clientInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function clientAvatarColor(id: number): string {
  const colors = [
    'color-mix(in srgb, var(--theme-brand-primary) 16%, var(--theme-bg-secondary))',
    'color-mix(in srgb, var(--theme-status-info) 15%, var(--theme-bg-secondary))',
    'color-mix(in srgb, var(--theme-status-warning) 16%, var(--theme-bg-secondary))',
    'color-mix(in srgb, var(--theme-express-color) 14%, var(--theme-bg-secondary))',
    'color-mix(in srgb, var(--theme-status-success) 14%, var(--theme-bg-secondary))',
  ]
  return colors[id % colors.length]
}

function ClientListItem({
  group,
  isSelected,
  onSelect,
}: {
  group: ClientGroup
  isSelected: boolean
  onSelect: () => void
}) {
  const label = group.clientCode ? `${group.clientCode} – ${group.clientName}` : group.clientName

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors"
      style={{
        background: isSelected ? 'var(--theme-brand-primary-light)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--theme-brand-primary)' : '3px solid transparent',
      }}
    >
      <span
        className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold shrink-0"
        style={{ background: clientAvatarColor(group.clientId), color: 'var(--theme-text-primary)' }}
      >
        {clientInitials(group.clientName)}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
        {label}
      </span>
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
        style={{
          background: 'color-mix(in srgb, var(--theme-text-primary) 7%, transparent)',
          color: 'var(--theme-text-muted)',
        }}
      >
        {group.routeCount} tuyến
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
    </button>
  )
}

function ClientRail({
  groups,
  selectedClientId,
  onSelectClient,
}: {
  groups: ClientGroup[]
  selectedClientId: number
  onSelectClient: (clientId: number) => void
}) {
  const [query, setQuery] = useState('')
  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return groups
    return groups.filter(group => {
      const label = `${group.clientCode ?? ''} ${group.clientName}`.toLowerCase()
      return label.includes(term)
    })
  }, [groups, query])

  return (
    <aside
      className="flex min-h-[620px] flex-col overflow-hidden rounded-xl"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        boxShadow: 'var(--theme-shadow-card)',
      }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Danh sách chủ hàng</h2>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, var(--theme-bg-secondary))',
            color: 'var(--theme-brand-primary)',
          }}
        >
          {groups.length}
        </span>
      </div>
      <div className="p-4 pb-3">
        <div className="relative">
          <Search className="absolute h-4 w-4" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--theme-text-muted)' }} />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Tìm chủ hàng..."
            className="nepo-input w-full text-xs"
            style={{ height: 38, paddingLeft: 34 }}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {filteredGroups.map(group => (
          <ClientListItem
            key={group.clientId}
            group={group}
            isSelected={group.clientId === selectedClientId}
            onSelect={() => onSelectClient(group.clientId)}
          />
        ))}
        {!filteredGroups.length && (
          <p className="px-3 py-8 text-center text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            Không tìm thấy chủ hàng
          </p>
        )}
      </div>
    </aside>
  )
}

function latestUpdate(routes: RoutePricing[]): string {
  const timestamps = routes.map(route => Date.parse(route.updatedAt)).filter(Number.isFinite)
  if (!timestamps.length) return 'Chưa có dữ liệu'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(Math.max(...timestamps)))
}

function DetailMeta({ icon: Icon, children }: { icon: ElementType; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  )
}

function PricingLegend() {
  const items = [
    {
      label: 'Cước chủ hàng',
      swatch: 'var(--theme-brand-primary)',
      background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, var(--theme-bg-secondary))',
    },
    {
      label: 'Lương tài xế',
      swatch: 'var(--theme-status-warning)',
      background: SALARY_TINT,
    },
    {
      label: 'Nhấp vào ô giá để sửa',
      swatch: 'var(--theme-status-info)',
      background: 'color-mix(in srgb, var(--theme-status-info) 9%, var(--theme-bg-secondary))',
    },
    {
      label: 'Dùng phím ← và → để cuộn ngang',
      swatch: 'var(--theme-text-muted)',
      background: 'var(--theme-bg-tertiary)',
    },
  ]

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11px] font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Chú giải</span>
      {items.map(item => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{
            background: item.background,
            color: 'var(--theme-text-secondary)',
            border: '1px solid var(--theme-border-light)',
          }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: item.swatch }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function GroupTable({
  group,
  editingId,
  editingField,
  editInitial,
  isSaving,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
  clients,
  locations,
  rowOffset,
  scrollRef,
}: {
  group: ClientGroup
  editingId: number | null
  editingField?: FocusableField
  editInitial?: RoutePricingFormData
  isSaving?: boolean
  onStartEdit: (rp: RoutePricing, field?: FocusableField) => void
  onSave: (id: number, data: RoutePricingFormData) => void
  onCancelEdit: () => void
  onDelete: (id: number) => void
  clients: Array<{ id: number; name: string; code?: string | null }>
  locations: Array<{ id: number; name: string }>
  rowOffset: number
  scrollRef?: RefObject<HTMLDivElement | null>
}) {
  const tableMinWidth = GROUPED_LEFT_GROUP_WIDTH + FARE_GROUP_WIDTH + SALARY_GROUP_WIDTH + RIGHT_GROUP_WIDTH

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      role="region"
      aria-label="Bảng giá cước có thể cuộn ngang"
      className="nepo-table-scroll overflow-x-auto rounded-xl pb-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-primary)]"
      style={{ border: '1px solid var(--theme-border-light)' }}
    >
      <table
        className="nepo-table"
        style={{ minWidth: tableMinWidth, width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}
      >
        <colgroup>
          <col style={{ width: COL.index }} />
          <col style={{ width: COL.pickup }} />
          <col style={{ width: COL.dropoff }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.workType }} />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2}>#</th>
            <th colSpan={2} className="text-center" style={{ color: 'var(--theme-brand-primary)', background: 'color-mix(in srgb, var(--theme-brand-primary) 5%, var(--theme-bg-secondary))' }}>
              Hành trình
            </th>
            <th colSpan={4} className="text-center" style={{ color: 'var(--theme-brand-primary)', background: 'color-mix(in srgb, var(--theme-brand-primary) 5%, var(--theme-bg-secondary))' }}>
              Cước (VND)
            </th>
            <th colSpan={4} className="text-center" style={{ color: 'var(--theme-status-warning)', background: SALARY_TINT }}>
              Lương (VND)
            </th>
            <th rowSpan={2} className="text-left" style={{ position: 'sticky', right: 0, background: 'var(--theme-bg-secondary)', zIndex: 3, borderLeft: '1px solid var(--theme-border-light)' }}>
              Tác nghiệp
            </th>
          </tr>
          <tr>
            <th className="text-left">Điểm đi</th>
            <th className="text-left">Điểm đến</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: 'var(--theme-brand-primary)' }}>F20</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: 'var(--theme-brand-primary)' }}>F40</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: 'var(--theme-brand-primary)' }}>E20</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: 'var(--theme-brand-primary)' }}>E40</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: 'var(--theme-status-warning)', background: SALARY_TINT, borderLeft: SALARY_BORDER }}>F20</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: 'var(--theme-status-warning)', background: SALARY_TINT }}>F40</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: 'var(--theme-status-warning)', background: SALARY_TINT }}>E20</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: 'var(--theme-status-warning)', background: SALARY_TINT }}>E40</th>
          </tr>
        </thead>
        <tbody>
          {group.routes.map((rp, idx) =>
            editingId === rp.id && editInitial ? (
              <RoutePricingEditRow
                key={rp.id}
                initial={editInitial}
                onSave={(formData) => onSave(rp.id, formData)}
                onCancel={onCancelEdit}
                saving={isSaving}
                clients={clients}
                locations={locations}
                initialFocus={editingField ?? 'f20Price'}
                hideClient
              />
            ) : (
              <RoutePricingRow
                key={rp.id}
                rp={rp}
                idx={rowOffset + idx}
                onEdit={(field) => onStartEdit(rp, field)}
                onDelete={() => onDelete(rp.id)}
                hideClient
              />
            )
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main table component ──────────────────────────────────────────────────

export function RoutePricingTable({
  isLoading,
  editingId,
  editingField,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
  editInitial,
  isSaving,
  clients,
  locations,
  groups,
  expandedClients,
  onToggleClient,
  onExpandAll,
  onCollapseAll,
  selectedClientId,
  onSelectClient,
  routeSearch = '',
  isMobile = false,
  onEditOpenDialog,
}: RoutePricingTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleStartEdit = useCallback(
    (rp: RoutePricing, field: FocusableField = 'f20Price') => onStartEdit(rp, field),
    [onStartEdit],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'SELECT' ||
          active.tagName === 'TEXTAREA' ||
          active.hasAttribute('contenteditable'))
      ) {
        return
      }

      const hasOpenDialog = document.querySelector('[role="dialog"], [role="alertdialog"], .radix-overlay')
      if (hasOpenDialog) {
        return
      }

      if (e.key === 'ArrowLeft') {
        if (scrollContainerRef.current) {
          e.preventDefault()
          scrollContainerRef.current.scrollBy({ left: -120, behavior: 'smooth' })
        }
      } else if (e.key === 'ArrowRight') {
        if (scrollContainerRef.current) {
          e.preventDefault()
          scrollContainerRef.current.scrollBy({ left: 120, behavior: 'smooth' })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Compute row offsets so # column shows global numbering
  const offsets = useMemo(() => {
    const map = new Map<number, number>()
    let offset = 0
    for (const g of groups) {
      map.set(g.clientId, offset)
      offset += g.routes.length
    }
    return map
  }, [groups])

  const selectedGroup = useMemo(() => {
    if (!groups.length) return null
    if (selectedClientId) {
      return groups.find(group => group.clientId === selectedClientId) ?? groups[0]
    }
    return groups[0]
  }, [groups, selectedClientId])

  if (isLoading) return <TableSkeleton rows={5} />

  if (!groups.length) {
    return (
      <div className="py-10">
        <EmptyState
          icon={<Route className="h-5 w-5" />}
          title="Chưa có cước tuyến nào"
          description="Thêm cước tuyến mới hoặc nhập từ file Excel để bắt đầu"
          compact
        />
      </div>
    )
  }

  const allExpanded = groups.every(g => expandedClients.has(g.clientId))
  const totalRoutes = groups.reduce((sum, g) => sum + g.routeCount, 0)

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
            💡 Nhấp vào thẻ để chỉnh sửa • {groups.length} chủ hàng, {totalRoutes} tuyến
          </span>
          <button
            onClick={allExpanded ? onCollapseAll : onExpandAll}
            className="inline-flex items-center gap-1 text-[11px] font-medium transition-colors whitespace-nowrap"
            style={{ color: 'var(--theme-text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--theme-text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--theme-text-muted)' }}
          >
            <ChevronsUpDown className="h-3 w-3" />
            {allExpanded ? 'Đóng tất cả' : 'Mở tất cả'}
          </button>
        </div>

        <div className="space-y-3">
          {groups.map(group => (
            <RoutePricingMobileGroup
              key={group.clientId}
              group={group}
              isExpanded={expandedClients.has(group.clientId)}
              onToggle={() => onToggleClient(group.clientId)}
              rowOffset={offsets.get(group.clientId) ?? 0}
              onDelete={onDelete}
              onEditOpenDialog={onEditOpenDialog ?? (() => {})}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <ClientRail
        groups={groups}
        selectedClientId={selectedGroup?.clientId ?? groups[0].clientId}
        onSelectClient={onSelectClient ?? onToggleClient}
      />

      <div
        className="overflow-hidden rounded-xl"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          boxShadow: 'var(--theme-shadow-card)',
        }}
      >
        {selectedGroup && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
              <div className="flex min-w-0 items-start gap-4">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  style={{ background: clientAvatarColor(selectedGroup.clientId), color: 'var(--theme-text-primary)' }}
                >
                  {clientInitials(selectedGroup.clientName)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold leading-tight" style={{ color: 'var(--theme-text-primary)' }}>
                      {selectedGroup.clientCode ? `${selectedGroup.clientCode} – ${selectedGroup.clientName}` : selectedGroup.clientName}
                    </h2>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, var(--theme-bg-secondary))',
                        color: 'var(--theme-brand-primary)',
                      }}
                    >
                      {selectedGroup.routeCount} tuyến đang áp dụng
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    <DetailMeta icon={MapPin}>Tổng số tuyến: {selectedGroup.routeCount}</DetailMeta>
                    <DetailMeta icon={Clock3}>Cập nhật gần nhất: {latestUpdate(selectedGroup.routes)}</DetailMeta>
                    {routeSearch && <DetailMeta icon={Search}>Đang lọc: {routeSearch}</DetailMeta>}
                  </div>
                  <PricingLegend />
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                style={{
                  color: 'var(--theme-text-muted)',
                  border: '1px solid var(--theme-border-light)',
                  background: 'var(--theme-bg-primary)',
                }}
                onClick={() => onSelectClient?.(selectedGroup.clientId)}
                title="Chủ hàng đang chọn"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollContainerRef} className="px-4 pb-4">
              <GroupTable
                group={selectedGroup}
                editingId={editingId}
                editingField={editingField}
                editInitial={editInitial}
                isSaving={isSaving}
                onStartEdit={handleStartEdit}
                onSave={onSave}
                onCancelEdit={onCancelEdit}
                onDelete={onDelete}
                clients={clients}
                locations={locations}
                rowOffset={offsets.get(selectedGroup.clientId) ?? 0}
                scrollRef={scrollContainerRef}
              />
              <div
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                style={{
                  color: 'var(--theme-text-muted)',
                  border: '1px solid var(--theme-border-light)',
                  borderTop: 0,
                  borderBottomLeftRadius: 'var(--r-lg)',
                  borderBottomRightRadius: 'var(--r-lg)',
                }}
              >
                <span>Hiển thị 1 – {selectedGroup.routeCount} của {selectedGroup.routeCount} tuyến</span>
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 font-semibold" style={{ color: 'var(--theme-brand-primary)', border: '1px solid var(--theme-brand-primary)' }}>
                  1
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
