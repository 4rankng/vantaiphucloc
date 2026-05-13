import { Hash, X, type LucideIcon } from 'lucide-react'

export interface SearchEmptyStateProps {
  /** Whether any filters/search are active */
  hasFilters: boolean
  /** Current search query (echoed back in the message) */
  searchQuery?: string
  /** Called when user wants to clear all filters */
  onClearFilters: () => void
  /** Title when no filters are active */
  emptyTitle?: string
  /** CTA label for the primary action when no filters */
  primaryActionLabel?: string
  /** Icon for the primary action */
  PrimaryActionIcon?: LucideIcon
  /** Called when user clicks the primary CTA */
  onPrimaryAction?: () => void
}

export function SearchEmptyState({
  hasFilters,
  searchQuery,
  onClearFilters,
  emptyTitle = 'Chưa có dữ liệu',
  primaryActionLabel,
  PrimaryActionIcon,
  onPrimaryAction,
}: SearchEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="py-16 text-center">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
          style={{ background: 'var(--theme-bg-tertiary)' }}
        >
          <Hash className="h-6 w-6" style={{ color: 'var(--theme-text-muted)' }} />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
          Không tìm thấy kết quả{searchQuery ? ` cho "${searchQuery}"` : ''}
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--theme-text-muted)' }}>
          Thử xoá bộ lọc hoặc tìm với từ khoá khác
        </p>
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-80"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
        >
          <X className="w-3.5 h-3.5" /> Xoá tìm kiếm
        </button>
      </div>
    )
  }

  return (
    <div className="py-16 text-center">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
        style={{ background: 'var(--theme-bg-tertiary)' }}
      >
        <Hash className="h-6 w-6" style={{ color: 'var(--theme-text-muted)' }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
        {emptyTitle}
      </p>
      {primaryActionLabel && onPrimaryAction && (
        <button
          onClick={onPrimaryAction}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90"
          style={{ background: 'var(--theme-brand-primary)', color: '#fff' }}
        >
          {PrimaryActionIcon && <PrimaryActionIcon className="w-4 h-4" />}
          {primaryActionLabel}
        </button>
      )}
    </div>
  )
}
