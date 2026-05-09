import { useState, useMemo, useCallback, useRef, useEffect, Fragment, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, Check } from 'lucide-react'

export interface Column<T> {
  /** Unique key for the column */
  key: string
  /** Header label */
  header: string
  /** Accessor function to get cell value */
  accessor: (row: T) => ReactNode
  /** Enable sorting for this column */
  sortable?: boolean
  /** Sort key if different from accessor */
  sortKey?: (row: T) => string | number
  /** Column width (e.g., '120px', 'auto', '1fr') */
  width?: string
  /** Align content */
  align?: 'left' | 'center' | 'right'
  /** Hide on mobile */
  hideOnMobile?: boolean
  /** Sticky column */
  sticky?: boolean
}

export interface RowAction<T> {
  label: string
  icon?: ReactNode
  onClick: (row: T) => void
  danger?: boolean
  hidden?: (row: T) => boolean
}

export interface DataTableProProps<T> {
  /** Data rows */
  data: T[]
  /** Column definitions */
  columns: Column<T>[]
  /** Unique key accessor for each row */
  rowKey: (row: T) => string | number
  /** Click handler for row */
  onRowClick?: (row: T) => void
  /** Row actions (appears in ... menu) */
  rowActions?: RowAction<T>[]
  /** Enable row selection with checkboxes */
  selectable?: boolean
  /** Selected row keys */
  selectedKeys?: Set<string | number>
  /** Selection change handler */
  onSelectionChange?: (keys: Set<string | number>) => void
  /** Loading state */
  loading?: boolean
  /** Number of skeleton rows to show when loading */
  skeletonRows?: number
  /** Empty state content */
  emptyState?: ReactNode
  /** Sticky header */
  stickyHeader?: boolean
  /** Max height for scrollable table */
  maxHeight?: string
  /** Row striping */
  striped?: boolean
  /** Compact mode (less padding) */
  compact?: boolean
  /** Custom row className */
  rowClassName?: (row: T) => string
  /** Default sort column key */
  defaultSortKey?: string
  /** Default sort direction */
  defaultSortDir?: 'asc' | 'desc'
  /** Remove outer border/rounded wrapper — use when embedding inside a card */
  noBorder?: boolean
  /** Key of the currently expanded row */
  expandedRowKey?: string | number
  /** Render function for expanded row content */
  renderExpandedRow?: (row: T) => ReactNode
}

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton-shimmer h-4 w-full rounded" />
        </td>
      ))}
    </tr>
  )
}

export function DataTablePro<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  rowActions,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  loading = false,
  skeletonRows = 5,
  emptyState,
  stickyHeader = true,
  maxHeight,
  striped = true,
  compact = false,
  rowClassName,
  defaultSortKey,
  defaultSortDir = 'asc',
  expandedRowKey,
  renderExpandedRow,
}: DataTableProProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir)
  const [openActionMenu, setOpenActionMenu] = useState<string | number | null>(null)
  const actionMenuRef = useRef<HTMLDivElement>(null)

  // Close action menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find((c) => c.key === sortKey)
    if (!col || !col.sortable) return data

    const getSortValue = col.sortKey ?? ((row: T) => {
      const val = col.accessor(row)
      return typeof val === 'string' || typeof val === 'number' ? val : String(val)
    })

    return [...data].sort((a, b) => {
      const aVal = getSortValue(a)
      const bVal = getSortValue(b)
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir, columns])

  const handleSort = useCallback((colKey: string) => {
    if (sortKey === colKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(colKey)
      setSortDir('asc')
    }
  }, [sortKey])

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return
    const allKeys = new Set(data.map(rowKey))
    if (selectedKeys.size === data.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(allKeys)
    }
  }, [data, rowKey, selectedKeys, onSelectionChange])

  const handleSelectRow = useCallback(
    (key: string | number) => {
      if (!onSelectionChange) return
      const newKeys = new Set(selectedKeys)
      if (newKeys.has(key)) {
        newKeys.delete(key)
      } else {
        newKeys.add(key)
      }
      onSelectionChange(newKeys)
    },
    [selectedKeys, onSelectionChange]
  )

  const visibleColumns = columns.filter((col) => !col.hideOnMobile || window.innerWidth >= 1024)

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3'
  const headerPadding = compact ? 'px-3 py-2' : 'px-4 py-3'

  const allSelected = data.length > 0 && selectedKeys.size === data.length
  const someSelected = selectedKeys.size > 0 && selectedKeys.size < data.length

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
    >
      <div
        className="overflow-x-auto"
        style={{ maxHeight: maxHeight ?? 'none' }}
      >
        <table className="min-w-full border-collapse">
          <thead
            className={stickyHeader ? 'sticky top-0 z-10' : ''}
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            <tr>
              {/* Selection checkbox column */}
              {selectable && (
                <th className={`${headerPadding} w-12`}>
                  <button
                    onClick={handleSelectAll}
                    className="flex h-5 w-5 items-center justify-center rounded border transition-colors"
                    style={{
                      background: allSelected || someSelected ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                      borderColor: allSelected || someSelected ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                    }}
                  >
                    {(allSelected || someSelected) && (
                      <Check className="h-3 w-3" style={{ color: 'white' }} />
                    )}
                  </button>
                </th>
              )}

              {/* Data columns */}
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`${headerPadding} text-left typo-label whitespace-nowrap`}
                  style={{
                    color: 'var(--theme-text-muted)',
                    width: col.width,
                    textAlign: col.align ?? 'left',
                  }}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 transition-colors hover:opacity-80"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}

              {/* Actions column */}
              {rowActions && rowActions.length > 0 && (
                <th className={`${headerPadding} w-12`} />
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} colCount={visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} />
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="px-4 py-16 text-center"
                >
                  {emptyState ?? (
                    <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                      Không có dữ liệu
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => {
                const key = rowKey(row)
                const isSelected = selectedKeys.has(key)
                const isClickable = !!onRowClick
                const isExpanded = expandedRowKey === key

                return (
                  <Fragment key={key}
                  >
                  <tr
                    onClick={() => onRowClick?.(row)}
                    className={`
                      transition-colors
                      ${isClickable ? 'cursor-pointer hover:bg-[color-mix(in_srgb,var(--theme-brand-primary)_4%,transparent)]' : ''}
                      ${striped && idx % 2 === 1 ? 'bg-[color-mix(in_srgb,var(--theme-bg-tertiary)_50%,transparent)]' : ''}
                      ${isSelected ? 'bg-[color-mix(in_srgb,var(--theme-brand-primary)_8%,transparent)]' : ''}
                      ${rowClassName?.(row) ?? ''}
                    `}
                    style={{
                      borderBottom: '1px solid var(--theme-border-light)',
                      borderLeft: isExpanded ? '3px solid var(--theme-brand-primary)' : undefined,
                    }}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleSelectRow(key)}
                          className="flex h-5 w-5 items-center justify-center rounded border transition-colors"
                          style={{
                            background: isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                            borderColor: isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                          }}
                        >
                          {isSelected && <Check className="h-3 w-3" style={{ color: 'var(--theme-text-on-brand)' }} />}
                        </button>
                      </td>
                    )}

                    {/* Data cells */}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`${cellPadding} text-sm`}
                        style={{
                          color: 'var(--theme-text-primary)',
                          textAlign: col.align ?? 'left',
                          width: col.width,
                          maxWidth: col.width,
                          overflow: 'hidden',
                        }}
                      >
                        {col.accessor(row)}
                      </td>
                    ))}

                    {/* Actions menu */}
                    {rowActions && rowActions.length > 0 && (
                      <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                        <div className="relative" ref={openActionMenu === key ? actionMenuRef : undefined}>
                          <button
                            onClick={() => setOpenActionMenu(openActionMenu === key ? null : key)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:opacity-80"
                            style={{ background: 'var(--theme-bg-tertiary)' }}
                          >
                            <MoreHorizontal className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
                          </button>

                          {openActionMenu === key && (
                            <div
                              className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-xl border py-1 shadow-lg"
                              style={{
                                background: 'var(--theme-bg-secondary)',
                                borderColor: 'var(--theme-border-default)',
                              }}
                            >
                              {rowActions
                                .filter((action) => !action.hidden?.(row))
                                .map((action, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      action.onClick(row)
                                      setOpenActionMenu(null)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:opacity-80"
                                    style={{
                                      color: action.danger ? 'var(--theme-status-error)' : 'var(--theme-text-primary)',
                                    }}
                                  >
                                    {action.icon}
                                    {action.label}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {isExpanded && renderExpandedRow && (
                    <tr key={`expanded-${key}`}>
                      <td
                        colSpan={visibleColumns.length + (selectable ? 1 : 0) + (rowActions && rowActions.length > 0 ? 1 : 0)}
                        className="p-0"
                        style={{ background: 'var(--theme-bg-primary)' }}
                      >
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
