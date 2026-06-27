import { useMemo, useState } from 'react'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import { BarChartWidget, LineChartWidget } from '@/components/shared/data-display/Charts'
import { OcrViewToggle, type ViewMode } from '@/components/shared/data-display/OcrViewToggle/OcrViewToggle'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import {
  buildDailyLatencyLineData,
  buildMonthlyLatencyBarData,
  formatLatencyMs,
  hasLatencyData,
} from '@/lib/ocr-analytics'

interface OcrLatencyChartProps {
  /** Window for the "day" view; the "month" view always uses 365 days. */
  days?: number
  /** Show the day/month segmented toggle. Hidden on compact dashboard tiles. */
  showToggle?: boolean
  className?: string
  title?: string
}

/**
 * OCR request latency chart. Two-series line on the day view (avg + p95),
 * single-series bar on the month view (avg). Buckets with too few samples
 * are rendered as gaps — never as "0 ms" — so a single slow request does
 * not skew an otherwise quiet day.
 *
 * Mirrors the OcrTotalChart shape so callers can drop it into the same
 * bento grid slots.
 */
export function OcrLatencyChart({
  days = 30,
  showToggle = true,
  className,
  title = 'Độ trễ OCR',
}: OcrLatencyChartProps) {
  const [view, setView] = useState<ViewMode>('day')
  const isMonth = showToggle && view === 'month'
  const effectiveDays = isMonth ? 365 : days
  const { data: stats, isLoading } = useOcrStats(effectiveDays)

  const dailyData = useMemo(
    () => buildDailyLatencyLineData(stats?.daily ?? []),
    [stats],
  )
  const monthlyData = useMemo(
    () => buildMonthlyLatencyBarData(stats?.monthly ?? []),
    [stats],
  )

  const baseSubtitle = isMonth
    ? 'Độ trễ nhận dạng số cont trung bình theo tháng'
    : `Độ trễ nhận dạng số cont · ${effectiveDays} ngày gần nhất`

  const subtitle = stats && hasLatencyData(stats)
    ? `${baseSubtitle} · trung bình ${formatLatencyMs(stats.totals.latencyAvgMs)} · p95 ${formatLatencyMs(stats.totals.latencyP95Ms)}`
    : baseSubtitle

  const actions = showToggle ? <OcrViewToggle value={view} onChange={setView} /> : undefined
  const showEmpty = !isLoading && !hasLatencyData(stats)

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      loading={isLoading}
      className={className}
    >
      {showEmpty ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            Chưa có dữ liệu độ trễ
          </p>
        </div>
      ) : isMonth ? (
        <BarChartWidget
          data={monthlyData}
          height={240}
          options={{
            plugins: {
              legend: {
                display: true,
                labels: {
                  usePointStyle: true,
                  pointStyle: 'circle',
                  boxWidth: 6,
                  boxHeight: 6,
                  padding: 15,
                },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const raw = ctx.parsed.y
                    if (raw === null || raw === undefined) return `${ctx.dataset.label}: —`
                    return `${ctx.dataset.label}: ${formatLatencyMs(raw * 1000)}`
                  },
                },
              },
            },
            scales: {
              y: {
                ticks: {
                  callback: (value) => formatLatencyMs(Number(value) * 1000),
                },
              },
            },
          }}
        />
      ) : (
        <LineChartWidget
          data={dailyData}
          height={240}
          options={{
            plugins: {
              legend: {
                display: true,
                labels: {
                  usePointStyle: true,
                  pointStyle: 'circle',
                  boxWidth: 6,
                  boxHeight: 6,
                  padding: 15,
                },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const raw = ctx.parsed.y
                    if (raw === null || raw === undefined) return `${ctx.dataset.label}: —`
                    return `${ctx.dataset.label}: ${formatLatencyMs(raw * 1000)}`
                  },
                },
              },
            },
            scales: {
              y: {
                ticks: {
                  callback: (value) => formatLatencyMs(Number(value) * 1000),
                },
              },
            },
            interaction: { mode: 'index', intersect: false },
          }}
        />
      )}
    </ChartCard>
  )
}