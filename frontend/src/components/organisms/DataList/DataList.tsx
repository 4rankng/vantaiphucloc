import type { ReactNode } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingState } from '@/components/shared/LoadingState'
import { Inbox } from 'lucide-react'

interface DataListProps<T> {
  items: T[]
  loading?: boolean
  emptyIcon?: ReactNode
  emptyTitle?: string
  renderItem: (item: T) => ReactNode
  className?: string
}

export function DataList<T>({ items, loading, emptyIcon, emptyTitle = 'Không có dữ liệu', renderItem, className }: DataListProps<T>) {
  if (loading) return <LoadingState />
  if (items.length === 0) {
    return <EmptyState icon={emptyIcon ?? <Inbox className="w-7 h-7" />} title={emptyTitle} />
  }
  return <div className={`space-y-2.5 ${className ?? ''}`}>{items.map(renderItem)}</div>
}
