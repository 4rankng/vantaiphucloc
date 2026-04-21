import { Plus } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onAdd?: () => void
  addLabel?: string
}

export function PageHeader({ title, subtitle, onAdd, addLabel = 'Tạo mới' }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-bold text-[var(--theme-text-primary)] font-display">{title}</h2>
        {subtitle && <p className="text-sm text-[var(--theme-text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {onAdd && (
        <button
          onClick={onAdd}
          className="hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
          style={{ background: 'var(--theme-brand-secondary)', color: 'var(--theme-text-inverse)' }}
        >
          <Plus size={16} /> {addLabel}
        </button>
      )}
    </div>
  )
}
