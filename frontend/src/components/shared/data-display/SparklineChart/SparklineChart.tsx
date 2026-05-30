interface SparklineChartProps {
  data: number[]
  color?: string
  height?: number
  className?: string
}

export function SparklineChart({ data, color = 'var(--theme-brand-primary)', height = 22, className }: SparklineChartProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const svgHeight = height

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = svgHeight - Math.max(2, ((val - min) / range) * (svgHeight - 4)) - 2
      return `${x},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 100 ${svgHeight}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      style={{ width: '100%', height: 22, display: 'block', opacity: 0.55 }}
    >
      <polyline fill="none" stroke={color} strokeWidth="1.2" points={points} />
    </svg>
  )
}
