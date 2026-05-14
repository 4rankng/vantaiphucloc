'use client'

import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
  compact?: boolean
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'Không có dữ liệu',
  className,
  compact = false,
}: DataTableProps<T>) {
  const headerPad = compact ? 'px-3 py-2.5' : 'px-5 py-3'
  const cellPad = compact ? 'px-3 py-2.5' : 'px-5 py-3.5'

  return (
    <div className={cn(
      'rounded-[var(--theme-radius-lg,10px)] border border-[var(--theme-border-default)]',
      'bg-[var(--theme-bg-secondary)] overflow-hidden',
      'shadow-[var(--theme-shadow-card,0_1px_0_rgba(9,9,11,0.02))]',
      className,
    )}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--theme-border-light, var(--theme-border-default))' }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    headerPad,
                    'text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                  )}
                  style={{
                    color: 'var(--theme-text-muted)',
                    ...(col.width ? { width: col.width } : {}),
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={cn(cellPad, 'text-center text-sm py-16')} style={{ color: 'var(--theme-text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-[var(--theme-bg-tertiary)]',
                  )}
                  style={{ borderBottom: '1px solid var(--theme-border-light, var(--theme-border-default))' }}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={cn(
                        cellPad,
                        'text-[13px]',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                      )}
                      style={{ color: 'var(--theme-text-secondary)' }}
                    >
                      {col.render ? col.render(row, i) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
