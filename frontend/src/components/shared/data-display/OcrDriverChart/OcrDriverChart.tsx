import { useMemo, useState } from 'react'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import { MixedChartWidget } from '@/components/shared/data-display/Charts'
import { OcrViewToggle, type ViewMode } from '@/components/shared/data-display/OcrViewToggle/OcrViewToggle'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import {
  buildDailyDriverExperienceData,
  buildHourlyDriverExperienceData,
  buildMonthlyDriverExperienceData,
  driverSuccess,
  driverTotal,
  formatLatencyMs,
  hasDriverData,
  hasDriverLatencyData,
  successRate,
} from '@/lib/ocr-analytics'

interface OcrDriverChartProps {
  days?: number
  showToggle?: boolean
  className?: string
  title?: string
}

/**
 * Driver-experience OCR chart — the human grain, distinct from the per-provider
 * performance chart. Bars count how many times drivers uploaded a photo (one
 * per upload, regardless of fallback calls); the latency line shows the
 * average wait time inside each visible chart bucket.
 */
export function OcrDriverChart({
  days = 30,
  showToggle = true,
  className,
  title = 'Trải nghiệm tài xế',
}: OcrDriverChartProps) {
  const [view, setView] = useState<ViewMode>('day')
  const isHour = showToggle && view === 'hour'
  const isMonth = showToggle && view === 'month'
  const effectiveDays = isMonth ? 365 : isHour ? 7 : days
  const { data: stats, isLoading } = useOcrStats(effectiveDays, isHour)

  const hourlyData = useMemo(
    () => buildHourlyDriverExperienceData(stats?.driverExperience.hourly ?? []),
    [stats?.driverExperience.hourly],
  )
  const dailyData = useMemo(
    () => buildDailyDriverExperienceData(stats?.driverExperience.daily ?? []),
    [stats?.driverExperience.daily],
  )
  const monthlyData = useMemo(
    () => buildMonthlyDriverExperienceData(stats?.driverExperience.monthly ?? []),
    [stats?.driverExperience.monthly],
  )

  const hourlyTotal = stats?.driverExperience.hourly.reduce((sum, point) => sum + point.requests, 0) ?? 0
  const hourlySuccess = stats?.driverExperience.hourly.reduce((sum, point) => sum + point.success, 0) ?? 0
  const total = isHour ? hourlyTotal : driverTotal(stats)
  const successCount = isHour ? hourlySuccess : driverSuccess(stats)
  const successPct = stats ? successRate(total, successCount) : 0
  const baseSubtitle = isHour ? '7 ngày' : isMonth ? '12 tháng' : `${effectiveDays} ngày`
  const latencySubtitle = hasDriverLatencyData(stats)
    ? ` · TB ${formatLatencyMs(stats?.driverExperience.totals.latencyAvgMs ?? null)}`
    : ''
  const subtitle = hasDriverData(stats)
    ? `${baseSubtitle} · ${total.toLocaleString('vi-VN')} lượt · đạt ${successPct}%${latencySubtitle}`
    : `${baseSubtitle} · Chưa có dữ liệu`

  const actions = showToggle ? <OcrViewToggle value={view} onChange={setView} /> : undefined
  const chartData = isHour ? hourlyData : isMonth ? monthlyData : dailyData

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      actions={actions}
      loading={isLoading}
      className={className}
    >
      {!isLoading && !hasDriverData(stats) ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            Chưa có dữ liệu
          </p>
        </div>
      ) : (
        <MixedChartWidget
          data={chartData}
          height={300}
          options={{
            plugins: {
              legend: {
                position: 'top',
                align: 'end',
                labels: {
                  usePointStyle: true,
                  pointStyle: 'circle',
                  boxWidth: 7,
                  boxHeight: 7,
                  padding: 14,
                },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const label = ctx.dataset.label ?? ''
                    const value = ctx.parsed.y
                    if (ctx.dataset.yAxisID === 'yLatency') {
                      return `${label}: ${formatLatencyMs(Number(value) * 1000)}`
                    }
                    return `${label}: ${Number(value).toLocaleString('vi-VN')} lượt`
                  },
                },
              },
            },
            scales: {
              x: {
                stacked: true,
                ticks: {
                  autoSkip: true,
                  maxRotation: 0,
                  maxTicksLimit: isHour ? 8 : isMonth ? 12 : 7,
                },
              },
              y: {
                stacked: true,
                title: {
                  display: true,
                  text: 'Lượt tải ảnh',
                },
                ticks: {
                  precision: 0,
                  callback: (value) => Number(value).toLocaleString('vi-VN'),
                },
              },
              yLatency: {
                position: 'right',
                grid: {
                  drawOnChartArea: false,
                },
                title: {
                  display: true,
                  text: 'Độ trễ',
                },
                ticks: {
                  callback: (value) => formatLatencyMs(Number(value) * 1000),
                },
              },
            },
          }}
        />
      )}
    </ChartCard>
  )
}
