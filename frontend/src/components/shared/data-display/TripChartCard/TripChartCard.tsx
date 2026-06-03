import { useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
  type ChartData,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { cn } from '@/lib/utils'
import { useTheme } from '@/themes/ThemeContext'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

export interface TripChartBar {
  day: number
  date?: string
  matched: number
  pending: number
}

export interface TripChartCardProps {
  title?: string
  subtitle?: string
  bars: TripChartBar[]
  chartHeight?: number
  className?: string
  style?: React.CSSProperties
}

function formatLabel(bar: TripChartBar): string {
  if (bar.date) {
    const parts = bar.date.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`
  }
  return String(bar.day)
}

export function TripChartCard({
  title = 'Chuyến theo ngày',
  subtitle,
  bars,
  chartHeight = 220,
  className,
  style,
}: TripChartCardProps) {
  const chartRef = useRef(null)
  const { theme } = useTheme()

  // Read the concrete colors from the active theme. Chart.js renders the
  // canvas with whatever hex string we hand it, so we can't rely on a
  // `var(--token)` resolving inside the canvas context — pass the real
  // values from the theme registry to keep the bars and the legend in sync.
  const matchedColor = theme.colors.brandPrimary
  const pendingColor = theme.colors.statusWarning

  const labels = bars.map(formatLabel)

  const data: ChartData<'bar'> = {
    labels,
    datasets: [
      {
        label: 'Ghép',
        data: bars.map(b => b.matched),
        backgroundColor: matchedColor,
        borderRadius: 3,
        borderSkipped: 'bottom',
        stack: 'trips',
      },
      {
        label: 'Chờ',
        data: bars.map(b => b.pending),
        backgroundColor: pendingColor,
        borderRadius: 3,
        borderSkipped: 'bottom',
        stack: 'trips',
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--theme-text-primary)',
        titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
        bodyFont:  { family: "'JetBrains Mono', monospace", size: 11 },
        padding: 8,
        cornerRadius: 8,
        callbacks: {
          title: (items) => items[0].label,
          label: (item) => `${item.dataset.label}: ${item.raw}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        border: { display: false },
        ticks: {
          font: { family: "'JetBrains Mono', monospace", size: 9 },
          color: 'var(--theme-text-muted)',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        stacked: true,
        grid: {
          color: 'var(--theme-border-default)',
          lineWidth: 1,
        },
        border: {
          display: false,
          dash: [4, 4],
        },
        ticks: {
          font: { family: "'JetBrains Mono', monospace", size: 9 },
          color: 'var(--theme-text-muted)',
          maxTicksLimit: 5,
        },
      },
    },
    barPercentage: 0.75,
    categoryPercentage: 0.85,
  }

  return (
    <div
      className={cn('overflow-hidden bento-card', className)}
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
        borderRadius: 20,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02), 0 4px 16px rgba(0,0,0,0.01)',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 10px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted-2)',
                marginTop: 2,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                letterSpacing: '0.02em',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Legend — swatch + label only, matches the bar colors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {[
            { label: 'Ghép', color: matchedColor },
            { label: 'Chờ',  color: pendingColor },
          ].map(({ label, color }) => (
            <span
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--theme-text-muted)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: color,
                }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: '0 20px 16px', position: 'relative', height: chartHeight }}>
        <Bar ref={chartRef} data={data} options={options} />
      </div>
    </div>
  )
}
