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
  const cellPad = compact ? 'px-3 py-2' : 'px-4 py-3'

  return (
    <div className={cn(
      'rounded-xl border border-[var(--theme-border-default)]',
      'bg-[var(--theme-bg-secondary)] shadow-sm overflow-hidden',
      className,
    )}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--theme-border-default)]">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    cellPad,
                    'text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={cn(cellPad, 'text-center text-sm text-[var(--theme-text-muted)] py-8')}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-[var(--theme-border-default)] last:border-0',
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-[var(--theme-bg-tertiary)]',
                  )}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={cn(
                        cellPad,
                        'text-sm text-[var(--theme-text-primary)]',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                      )}
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
