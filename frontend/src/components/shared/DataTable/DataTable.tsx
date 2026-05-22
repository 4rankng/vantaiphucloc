import { Fragment, type ReactNode } from 'react'
import type { Column, ColumnAlign } from './columns'

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string | number
  /** Loading state — renders skeleton rows. */
  isLoading?: boolean
  /** Number of skeleton rows when loading. Defaults to 5. */
  loadingRows?: number
  /** Rendered when not loading and rows.length === 0. */
  empty?: ReactNode
  /** Optional footer row (e.g. totals). Rendered inside <tfoot>. */
  footer?: ReactNode
  /** Per-row click handler. When set, rows show cursor:pointer. */
  onRowClick?: (row: T, index: number) => void
  /** Per-row selected state. Adds accent-soft background. */
  isSelected?: (row: T, index: number) => boolean
  /** Per-row CSS class name. */
  rowClassName?: (row: T, index: number) => string
  /** When provided, returning non-null inserts an expansion row below the data row. */
  renderExpanded?: (row: T, index: number) => ReactNode | null
  /** Minimum table width before horizontal scroll kicks in. Defaults to 900. */
  minWidth?: number
  /** Use fixed table layout — column widths are strictly honoured. */
  fixedLayout?: boolean
  /** Extra wrapper class. */
  className?: string
  /** Currently active sort column key (matches Column.sortKey). */
  sortBy?: string
  /** Current sort direction. */
  sortOrder?: 'asc' | 'desc'
  /** Called when the user clicks a sortable column header. */
  onSort?: (key: string, order: 'asc' | 'desc') => void
}

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

const HIDE_CLASS: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
}

// ── Sort indicator icon ───────────────────────────────────────────────────────
function SortIcon({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 1,
        marginLeft: 4,
        verticalAlign: 'middle',
        opacity: active ? 1 : 0.35,
        transition: 'opacity 0.15s',
      }}
      aria-hidden
    >
      <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
        <path d="M3.5 0L7 4H0L3.5 0Z" fill={active && order === 'asc' ? 'currentColor' : 'var(--ink-3)'} />
      </svg>
      <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
        <path d="M3.5 4L0 0H7L3.5 4Z" fill={active && order === 'desc' ? 'currentColor' : 'var(--ink-3)'} />
      </svg>
    </span>
  )
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  loadingRows = 5,
  empty,
  footer,
  onRowClick,
  isSelected,
  rowClassName,
  renderExpanded,
  minWidth = 900,
  fixedLayout = false,
  className = '',
  sortBy,
  sortOrder = 'desc',
  onSort,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={`p-6 space-y-3 ${className}`}>
        {Array.from({ length: loadingRows }).map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-lg animate-pulse"
            style={{ background: 'var(--surface-3)' }}
          />
        ))}
      </div>
    )
  }

  if (rows.length === 0 && empty) {
    return <div className={className}>{empty}</div>
  }

  return (
    <div className={`nepo-table-scroll overflow-x-auto ${className}`}>
      <table
        className="nepo-table w-full"
        style={{ minWidth: `${minWidth}px`, borderCollapse: 'collapse', tableLayout: fixedLayout ? 'fixed' : 'auto' }}
      >
        <thead>
          <tr>
            {columns.map((col) => {
              const align = col.align ?? 'left'
              const hide = col.hideBelow ? HIDE_CLASS[col.hideBelow] : ''
              const isSortable = !!col.sortKey && !!onSort
              const isActive = isSortable && sortBy === col.sortKey
              const nextOrder: 'asc' | 'desc' = isActive && sortOrder === 'asc' ? 'desc' : 'asc'
              return (
                <th
                  key={col.key}
                  className={`${ALIGN_CLASS[align]} ${hide} ${col.headerClassName ?? ''} ${col.sticky ? 'nepo-th-sticky' : ''}`}
                  style={col.width ? { width: typeof col.width === 'number' ? `${col.width}px` : col.width } : undefined}
                >
                  {isSortable ? (
                    <button
                      type="button"
                      onClick={() => onSort!(col.sortKey!, isActive ? nextOrder : 'desc')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: isActive ? 'var(--ink)' : 'inherit',
                        fontWeight: isActive ? 700 : undefined,
                        fontSize: 'inherit',
                        letterSpacing: 'inherit',
                        textTransform: 'inherit',
                      }}
                      title={`Sắp xếp theo ${typeof col.header === 'string' ? col.header : col.key}`}
                    >
                      {col.header}
                      <SortIcon active={isActive} order={isActive ? sortOrder : 'desc'} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key = rowKey(row, i)
            const selected = isSelected?.(row, i) ?? false
            const expanded = renderExpanded?.(row, i) ?? null
            return (
              <Fragment key={key}>
                <tr
                  className={`${selected ? 'is-selected' : ''} ${rowClassName?.(row, i) ?? ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                >
                  {columns.map((col) => {
                    const align = col.align ?? 'left'
                    const hide = col.hideBelow ? HIDE_CLASS[col.hideBelow] : ''
                    return (
                      <td
                        key={col.key}
                        className={`${ALIGN_CLASS[align]} ${hide} ${col.cellClassName ?? ''} ${col.sticky ? 'nepo-td-sticky' : ''}`}
                        style={col.width ? { width: typeof col.width === 'number' ? `${col.width}px` : col.width, maxWidth: typeof col.width === 'number' ? `${col.width}px` : col.width } : undefined}
                      >
                        {col.render(row, i)}
                      </td>
                    )
                  })}
                </tr>
                {expanded && (
                  <tr className="nepo-tr-expanded">
                    <td colSpan={columns.length} className="!p-0">
                      {expanded}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
        {footer && <tfoot className="nepo-tfoot">{footer}</tfoot>}
      </table>
    </div>
  )
}
