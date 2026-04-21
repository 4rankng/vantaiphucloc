interface SparklineChartProps {
  data: number[]
  color?: string
  height?: number
  className?: string
}

export function SparklineChart({ data, color = 'var(--theme-brand-primary)', height = 14, className }: SparklineChartProps) {
  if (!data || data.length === 0) return null

  const max = Math.max(...data)
  const barWidth = 3
  const gap = 1.5
  const totalWidth = data.length * (barWidth + gap) - gap

  return (
    <svg width={totalWidth} height={height} className={className} aria-hidden="true">
      {data.map((val, i) => {
        const barHeight = max > 0 ? Math.max(2, (val / max) * height) : 2
        const y = height - barHeight
        const isLast = i === data.length - 1
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={1}
            fill={isLast ? color : '#e2e8f0'}
          />
        )
      })}
    </svg>
  )
}
