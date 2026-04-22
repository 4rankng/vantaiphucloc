import { ChevronRight } from 'lucide-react'

export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>{title}</span>
      {children || (
        <button onClick={() => {}} className="flex items-center gap-0.5 text-xs font-semibold"
          style={{ color: 'var(--theme-brand-primary)' }}>
          Chi tiết <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
