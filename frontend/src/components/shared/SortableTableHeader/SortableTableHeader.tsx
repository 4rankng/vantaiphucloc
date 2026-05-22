import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export type SortDirection = 'asc' | 'desc'

export interface SortableTableHeaderProps<T extends string = string> {
  label: string
  col: T
  sort: { col: T; dir: SortDirection }
  onSort: (c: T) => void
  align?: 'left' | 'right'
}

export function SortableTableHeader<T extends string = string>({
  label, col, sort, onSort, align = 'right',
}: SortableTableHeaderProps<T>) {
  const active = sort.col === col
  const Icon = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <th
      onClick={() => onSort(col)}
      className={`py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ color: active ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {align === 'left' && <Icon className="h-3 w-3" style={{ opacity: active ? 1 : 0.4 }} />}
        {label}
        {align === 'right' && <Icon className="h-3 w-3" style={{ opacity: active ? 1 : 0.4 }} />}
      </span>
    </th>
  )
}
