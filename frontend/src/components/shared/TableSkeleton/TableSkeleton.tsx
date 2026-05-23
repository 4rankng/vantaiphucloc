/**
 * Structured table skeleton — each row renders proportional column-shaped pills
 * so the loading state visually matches the real table layout.
 *
 * cols preset widths (% of row):
 *   col-1: 28%  (primary / name)
 *   col-2: 16%  (secondary)
 *   col-3: 12%  (number)
 *   col-4: 12%  (number)
 *   col-5: 12%  (number)
 *   col-6:  8%  (action)
 */
const COL_WIDTHS = ['28%', '16%', '12%', '12%', '12%', '8%'] as const

export function TableSkeleton({
  rows = 5,
  cols = 5,
  className,
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  const activeCols = COL_WIDTHS.slice(0, Math.min(cols, COL_WIDTHS.length))

  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      {/* Header row */}
      <div
        className="flex items-center gap-4 px-4 py-3 border-b"
        style={{ background: 'var(--surface-2)', borderColor: 'var(--line-2)' }}
      >
        {activeCols.map((w, i) => (
          <div
            key={i}
            className="skeleton-shimmer rounded"
            style={{ width: w, height: 10, flexShrink: 0 }}
          />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 px-4 border-b"
          style={{
            height: 52,
            borderColor: 'var(--line)',
            background: rowIdx % 2 === 1 ? 'var(--surface-2)' : 'var(--surface)',
          }}
        >
          {activeCols.map((w, colIdx) => (
            <div
              key={colIdx}
              className="skeleton-shimmer rounded-md"
              style={{
                width: w,
                height: colIdx === 0 ? 14 : 11,
                flexShrink: 0,
                // stagger shimmer per column so it feels more natural
                animationDelay: `${rowIdx * 0.06 + colIdx * 0.04}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
