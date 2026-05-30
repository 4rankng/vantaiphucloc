export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>{title}</span>
      {children}
    </div>
  )
}
