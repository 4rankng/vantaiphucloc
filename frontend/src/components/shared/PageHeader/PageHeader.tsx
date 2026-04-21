import { Plus } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onAdd?: () => void
  addLabel?: string
  breadcrumbs?: React.ReactNode
}

export function PageHeader({ title, subtitle, onAdd, addLabel = 'Tạo mới', breadcrumbs }: PageHeaderProps) {
  return (
    <div>
      {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--theme-text-primary)] font-display">{title}</h2>
          {subtitle && <p className="text-sm text-[var(--theme-text-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="hidden lg:inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] bg-[var(--theme-brand-secondary)] text-[var(--theme-text-inverse)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-secondary)] focus-visible:ring-offset-2"
          >
            <Plus size={16} /> {addLabel}
          </button>
        )}
      </div>
    </div>
  )
}
