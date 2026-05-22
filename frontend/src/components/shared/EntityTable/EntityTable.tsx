import type { ReactNode, ElementType } from 'react'
import { Plus } from 'lucide-react'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { InfoTip } from '@/components/shared/InfoTip'
import { PulseHint } from '@/components/shared/PulseHint'

export interface EntityColumn<T> {
  key: string
  header: string
  render: (row: T, index: number) => ReactNode
  className?: string
  tooltip?: string
}

interface EntityTableProps<T> {
  columns: EntityColumn<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  rowKey: (row: T) => string | number
  sectionTitle: string
  sectionIcon?: ElementType
  sectionRight?: ReactNode
  emptyIcon?: ElementType
  emptyText?: string
  loading?: boolean
  skeletonRows?: number
  /** Shows a PulseHint-wrapped add button in the empty state */
  onEmptyAdd?: () => void
  emptyAddLabel?: string
  emptyHintKey?: string
}

export function EntityTable<T>({
  columns,
  data,
  onRowClick,
  rowKey,
  sectionTitle,
  sectionIcon,
  sectionRight,
  emptyIcon: EmptyIcon,
  emptyText = 'Không có dữ liệu',
  loading,
  skeletonRows = 4,
  onEmptyAdd,
  emptyAddLabel = 'Thêm mới',
  emptyHintKey,
}: EntityTableProps<T>) {
  return (
    <div
      className="rounded-xl border overflow-hidden card-hover-lift"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: 'none',
      }}
    >
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
        <DashboardSectionHeader
          title={sectionTitle}
          icon={sectionIcon}
          right={sectionRight}
        />
      </div>

      {loading ? (
        <div className="divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
          {[...Array(skeletonRows)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
              <div className="h-4 w-32 rounded" style={{ background: 'var(--theme-bg-tertiary)' }} />
              <div className="h-4 w-20 rounded" style={{ background: 'var(--theme-bg-tertiary)' }} />
              <div className="h-4 w-24 rounded" style={{ background: 'var(--theme-bg-tertiary)' }} />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          {EmptyIcon && (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)' }}
            >
              <EmptyIcon className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} />
            </div>
          )}
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{emptyText}</p>
          {onEmptyAdd && (
            emptyHintKey ? (
              <PulseHint hintKey={emptyHintKey}>
                <button onClick={onEmptyAdd} className="btn-primary text-xs mt-1">
                  <Plus size={14} strokeWidth={2.25} />
                  <span>{emptyAddLabel}</span>
                </button>
              </PulseHint>
            ) : (
              <button onClick={onEmptyAdd} className="btn-primary text-xs mt-1">
                <Plus size={14} strokeWidth={2.25} />
                <span>{emptyAddLabel}</span>
              </button>
            )
          )}
        </div>
      ) : (
        <>
          {/* Desktop header row */}
          <div
            className="hidden lg:grid gap-4 px-5 py-2.5"
            style={{
              gridTemplateColumns: columns.map(c => c.className ?? '1fr').join(' '),
              borderBottom: '1px solid var(--theme-border-light)',
              background: 'var(--theme-bg-primary)',
            }}
          >
            {columns.map(col => (
              <span
                key={col.key}
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {col.header}
                {col.tooltip && <InfoTip text={col.tooltip} />}
              </span>
            ))}
          </div>

          {/* Data rows */}
          <div>
            {data.map((row, i) => (
              <div
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={`entity-row-enter lg:grid gap-4 px-5 py-3 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                style={{
                  gridTemplateColumns: columns.map(c => c.className ?? '1fr').join(' '),
                  borderBottom: i < data.length - 1 ? '1px solid var(--theme-border-light)' : 'none',
                  animationDelay: `${Math.min(i * 28, 280)}ms`,
                }}
                onMouseEnter={e => {
                  if (onRowClick) (e.currentTarget as HTMLElement).style.background = 'var(--theme-bg-tertiary)'
                }}
                onMouseLeave={e => {
                  if (onRowClick) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                {columns.map(col => (
                  <div key={col.key} className="flex items-center min-w-0">
                    {col.render(row, i)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
