import { ChevronRight } from 'lucide-react'

/** Small link-style action button — green text, optional icon */
export function LinkButton({ onClick, icon: Icon, children }: {
  onClick: () => void
  icon?: React.ElementType
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-semibold"
      style={{ color: 'var(--theme-brand-primary)' }}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  )
}

/** Link button with "Chi tiết →" suffix */
export function DetailLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-0.5 text-xs font-semibold"
      style={{ color: 'var(--theme-brand-primary)' }}
    >
      Chi tiết <ChevronRight className="w-3 h-3" />
    </button>
  )
}
