import { Search, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{
            background: 'color-mix(in srgb, var(--accent) 8%, var(--surface-2))',
            border: '1px solid color-mix(in srgb, var(--accent) 16%, transparent)',
          }}
        >
          <Search className="h-5 w-5" style={{ color: 'var(--accent)' }} />
        </div>
        <p
          className="font-semibold mb-1"
          style={{ fontSize: '13.5px', letterSpacing: '-0.012em', color: 'var(--ink)' }}
        >
          Không tìm thấy kết quả{searchQuery ? ` cho "${searchQuery}"` : ''}
        </p>
        <p className="typo-meta mb-4">
          Thử xoá bộ lọc hoặc tìm với từ khoá khác
        </p>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          <X className="w-3.5 h-3.5" /> Xoá tìm kiếm
        </Button>
      </div>
    )
  }

  return (
    <div className="py-16 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
        style={{
          background: 'color-mix(in srgb, var(--accent) 8%, var(--surface-2))',
          border: '1px solid color-mix(in srgb, var(--accent) 16%, transparent)',
        }}
      >
        <Search className="h-5 w-5" style={{ color: 'var(--accent)' }} />
      </div>
      <p
        className="font-semibold mb-1"
        style={{ fontSize: '13.5px', letterSpacing: '-0.012em', color: 'var(--ink)' }}
      >
        {emptyTitle}
      </p>
      {primaryActionLabel && onPrimaryAction && (
        <Button size="sm" onClick={onPrimaryAction} className="mt-3">
          {PrimaryActionIcon && <PrimaryActionIcon className="w-4 h-4" />}
          {primaryActionLabel}
        </Button>
      )}
    </div>
  )
}
