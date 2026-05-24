import type { ReactNode, CSSProperties } from 'react'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'

// ─── Column definition ────────────────────────────────────────────────────────

export interface NepoColumn<T> {
  /** Unique column key */
  key: string
  /** Header label */
  header: ReactNode
  /** Text alignment — defaults to 'left' */
  align?: 'left' | 'right' | 'center'
  /** Fixed px width */
  width?: number
  /** Sticky to the left edge */
  sticky?: boolean
  /** Hide below a breakpoint */
  hideBelow?: 'md' | 'lg'
  /** Extra className on <th> */
  headerClass?: string
  /** Extra className on <td> */
  cellClass?: string
  /** Cell renderer */
  render: (row: T, index: number) => ReactNode
}

// ─── Footer cell ─────────────────────────────────────────────────────────────

export interface NepoFooterCell {
  content: ReactNode
  align?: 'left' | 'right' | 'center'
  sticky?: boolean
  className?: string
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NepoTableProps<T> {
  columns: NepoColumn<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  isLoading?: boolean
  loadingRows?: number
  emptyText?: string
  /** Optional illustration rendered above the empty-state text */
  emptyIcon?: ReactNode
  /** Minimum table width for horizontal scroll */
  minWidth?: number
  /** Optional tfoot row — one entry per column */
  footerCells?: NepoFooterCell[]
  className?: string
  /** Extra content rendered above the table inside the card (e.g. filter bar) */
  toolbar?: ReactNode
  /** Hide the column header row (e.g. when showing empty state) */
  hideHeader?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function colClass(col: NepoColumn<unknown>): string {
  const parts: string[] = []
  if (col.align === 'right') parts.push('text-right')
  else if (col.align === 'center') parts.push('text-center')
  else parts.push('text-left')
  if (col.hideBelow === 'md') parts.push('hidden md:table-cell')
  if (col.hideBelow === 'lg') parts.push('hidden lg:table-cell')
  if (col.sticky) parts.push('nepo-th-sticky')
  return parts.join(' ')
}

function cellClass(col: NepoColumn<unknown>): string {
  const parts: string[] = []
  if (col.align === 'right') parts.push('text-right')
  else if (col.align === 'center') parts.push('text-center')
  if (col.hideBelow === 'md') parts.push('hidden md:table-cell')
  if (col.hideBelow === 'lg') parts.push('hidden lg:table-cell')
  if (col.sticky) parts.push('nepo-td-sticky')
  if (col.cellClass) parts.push(col.cellClass)
  return parts.join(' ')
}

function colStyle(col: NepoColumn<unknown>): CSSProperties | undefined {
  return col.width ? { width: col.width } : undefined
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NepoTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  loadingRows = 6,
  emptyText = 'Không có dữ liệu',
  emptyIcon,
  minWidth = 600,
  footerCells,
  className,
  toolbar,
  hideHeader = false,
}: NepoTableProps<T>) {
  return (
    <div
      className={`rounded-xl overflow-hidden${className ? ` ${className}` : ''}`}
      style={{
        border: '1px solid var(--line-2)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        background: 'var(--surface)',
      }}
    >
      {toolbar && (
        <div
          className="flex items-center gap-3 px-4 py-2.5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          {toolbar}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={loadingRows} />
      ) : (
        <div className="nepo-table-scroll overflow-x-auto">
          <table
            className="nepo-table"
            style={{ minWidth, borderCollapse: 'collapse' }}
          >
            {!hideHeader && (
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`${colClass(col)}${col.headerClass ? ` ${col.headerClass}` : ''}`}
                      style={colStyle(col)}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}

            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center"
                    style={{ color: 'var(--ink-3)', fontSize: 13, padding: emptyIcon ? '24px 16px 32px' : '56px 16px' }}
                  >
                    {emptyIcon && (
                      <div className="flex justify-center mb-3">
                        {emptyIcon}
                      </div>
                    )}
                    {emptyText}
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr key={rowKey(row)}>
                    {columns.map((col) => (
                      <td key={col.key} className={cellClass(col)}>
                        {col.render(row, index)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>

            {footerCells && data.length > 0 && (
              <tfoot className="nepo-tfoot">
                <tr>
                  {footerCells.map((fc, i) => {
                    const col = columns[i]
                    const alignClass =
                      fc.align === 'right'
                        ? 'text-right'
                        : fc.align === 'center'
                          ? 'text-center'
                          : col?.align === 'right'
                            ? 'text-right'
                            : ''
                    const hideClass = col?.hideBelow === 'md'
                      ? 'hidden md:table-cell'
                      : col?.hideBelow === 'lg'
                        ? 'hidden lg:table-cell'
                        : ''
                    const stickyClass = fc.sticky || col?.sticky ? 'nepo-td-sticky' : ''
                    return (
                      <td
                        key={i}
                        className={[alignClass, hideClass, stickyClass, fc.className].filter(Boolean).join(' ')}
                      >
                        {fc.content}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
