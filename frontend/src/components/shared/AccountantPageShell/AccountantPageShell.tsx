import type { ElementType, ReactNode } from 'react'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { SearchBar } from '@/components/shared/SearchBar'
import { PulseHint } from '@/components/shared/PulseHint'
import { Decoration } from '@/components/shared/Decoration'
import { Reveal } from '@/components/shared/Reveal'

interface AccountantPageShellProps {
  title: string
  subtitle: string
  icon?: ElementType
  searchValue?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  count?: number
  countLabel?: string
  onAdd?: () => void
  addLabel?: string
  addIcon?: ElementType
  /** When provided, wraps the add button in a PulseHint for first-time onboarding */
  addHintKey?: string
  children: ReactNode
}

export function AccountantPageShell({
  title,
  subtitle,
  icon: Icon,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  count,
  countLabel,
  onAdd,
  addLabel = 'Thêm',
  addIcon: AddIcon,
  addHintKey,
  children,
}: AccountantPageShellProps) {
  return (
    <div className="space-y-4 animate-page-enter">
      <div className="relative overflow-hidden">
        <h1 className="typo-display" style={{ color: 'var(--theme-text-primary)' }}>{title}</h1>
        <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>{subtitle}</p>
        <Decoration variant="dot-grid" width={180} height={48} className="absolute right-0 top-0 opacity-20" ariaLabel="" />
      </div>

      {(onSearchChange || onAdd) && (
        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-3"
          style={{
            background: 'var(--theme-bg-secondary)',
            borderColor: 'var(--theme-border-default)',
            boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06)',
          }}
        >
          {countLabel != null && (
            <span className="text-xs shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
              {countLabel}
            </span>
          )}
          {onSearchChange && (
            <div className="flex-1">
              <SearchBar
                placeholder={searchPlaceholder}
                value={searchValue ?? ''}
                onChange={onSearchChange}
              />
            </div>
          )}
          {onAdd && (
            addHintKey ? (
              <PulseHint hintKey={addHintKey} className="shrink-0">
                <button onClick={onAdd} className="btn-primary">
                  {AddIcon && <AddIcon size={16} strokeWidth={2.25} />}
                  <span>{addLabel}</span>
                </button>
              </PulseHint>
            ) : (
              <button onClick={onAdd} className="btn-primary shrink-0">
                {AddIcon && <AddIcon size={16} strokeWidth={2.25} />}
                <span>{addLabel}</span>
              </button>
            )
          )}
        </div>
      )}

      <Reveal threshold={0.04}>
        {children}
      </Reveal>
    </div>
  )
}

