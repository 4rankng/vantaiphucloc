import { useMemo, useState } from 'react'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import { BarChartWidget } from '@/components/shared/data-display/Charts'
import { OcrViewToggle, type ViewMode } from '@/components/shared/data-display/OcrViewToggle/OcrViewToggle'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import {
  buildDailyTotalData,
  buildHourlyTotalData,
  buildMonthlyTotalData,
  hasOcrData,
} from '@/lib/ocr-analytics'

interface OcrTotalChartProps {
  /** Window for the "day" view; hour uses 7 days and month uses 365 days. */
  days?: number
  /** Show the hour/day/month dropdown. Hidden on compact dashboard tiles. */
  showToggle?: boolean
  className?: string
  title?: string
}

/**
 * Total OCR chart counting provider calls across OCR providers. Shared by the
 * director and accountant dashboards; superadmin uses the dual-axis charts.
 *
 * `className` passes through to the ChartCard root so callers can place the
 * tile in a bento grid (e.g. `className="bento-col-12 lg:bento-col-8"`).
 */
export function OcrTotalChart({
  days = 30,
  showToggle = true,
  className,
  title = 'Tổng lượt OCR',
}: OcrTotalChartProps) {
  const [view, setView] = useState<ViewMode>('day')
  const isHour = showToggle && view === 'hour'
  const isMonth = showToggle && view === 'month'
  const effectiveDays = isMonth ? 365 : isHour ? 7 : days
  const { data: stats, isLoading } = useOcrStats(effectiveDays, isHour)

  const hourlyData = useMemo(() => buildHourlyTotalData(stats?.hourly ?? []), [stats])
  const dailyData = useMemo(() => buildDailyTotalData(stats?.daily ?? []), [stats])
  const monthlyData = useMemo(() => buildMonthlyTotalData(stats?.monthly ?? []), [stats])

  const actions = showToggle ? <OcrViewToggle value={view} onChange={setView} /> : undefined
  const baseSubtitle = isHour ? '7 ngày' : isMonth ? '12 tháng' : `${effectiveDays} ngày`
  const total = stats?.totals.total ?? 0
  const subtitle = hasOcrData(stats)
    ? `${baseSubtitle} · ${total.toLocaleString('vi-VN')} lượt`
    : `${baseSubtitle} · Chưa có dữ liệu`

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      loading={isLoading}
      className={className}
    >
      {!isLoading && !hasOcrData(stats) ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            Chưa có dữ liệu
          </p>
        </div>
      ) : (
        <BarChartWidget
          data={isHour ? hourlyData : isMonth ? monthlyData : dailyData}
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
                    const label = ctx.dataset.label ?? ''
                    const value = ctx.parsed.y
                    return `${label}: ${Number(value).toLocaleString('vi-VN')} lượt`
                  },
                },
              },
            },
            scales: {
              x: {
                ticks: {
                  autoSkip: true,
                  maxRotation: 0,
                  maxTicksLimit: isHour ? 8 : isMonth ? 12 : 7,
                },
              },
              y: {
                title: {
                  display: true,
                  text: 'Lượt OCR',
                },
                ticks: {
                  precision: 0,
                  callback: (value) => Number(value).toLocaleString('vi-VN'),
                },
              },
            },
          }}
        />
      )}
    </ChartCard>
  )
}

