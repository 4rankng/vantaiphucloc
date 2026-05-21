export function TableSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={`p-6 space-y-3 ${className ?? ''}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
      ))}
    </div>
  )
}
