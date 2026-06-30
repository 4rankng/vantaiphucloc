import { useMemo } from 'react'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import { MixedChartWidget } from '@/components/shared/data-display/Charts'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import {
  buildDailyOcrAccuracyData,
  hasAccuracyData,
} from '@/lib/ocr-analytics'

interface OcrAccuracyChartProps {
  days?: number
  className?: string
}

/**
 * OCR accuracy chart — compares the driver-submitted container number against
 * the matched BookedTrip's ground-truth container number. Stacked bars show
 * daily result buckets; the line shows rolling exact-match accuracy over the
 * latest 500 evaluated OCR trip snapshots.
 */
export function OcrAccuracyChart({
  days = 30,
  className,
}: OcrAccuracyChartProps) {
  const { data: stats, isLoading } = useOcrStats(days)

  const dailyData = useMemo(
    () => buildDailyOcrAccuracyData(stats?.accuracy?.daily ?? []),
    [stats?.accuracy?.daily],
  )

  const totals = stats?.accuracy?.totals
  const accuracyPct = totals?.accuracyPct
  const evaluated = totals?.evaluated ?? 0

  const subtitle = hasAccuracyData(stats)
    ? [
        `Độ chính xác OCR · ${days} ngày gần nhất`,
        `${accuracyPct}% chính xác`,
        `${evaluated.toLocaleString('vi-VN')} mẫu`,
      ]
        .filter(Boolean)
        .join(' · ')
    : `Độ chính xác OCR · ${days} ngày gần nhất`

  return (
    <ChartCard
      title="Độ chính xác OCR"
      subtitle={subtitle}
      loading={isLoading}
      className={className}
    >
      {!isLoading && !hasAccuracyData(stats) ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            Chưa có dữ liệu ghép chuyến
          </p>
        </div>
      ) : (
        <MixedChartWidget
          data={dailyData}
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
                    if (ctx.dataset.yAxisID === 'yPct') {
                      return `${label}: ${Number(value)}%`
                    }
                    return `${label}: ${Number(value).toLocaleString('vi-VN')}`
                  },
                },
              },
            },
            scales: {
              x: {
                stacked: true,
              },
              y: {
                stacked: true,
                title: {
                  display: true,
                  text: 'Số chuyến',
                },
                ticks: {
                  precision: 0,
                  callback: (value) => Number(value).toLocaleString('vi-VN'),
                },
              },
              yPct: {
                position: 'right',
                min: 0,
                max: 100,
                grid: {
                  drawOnChartArea: false,
                },
                title: {
                  display: true,
                  text: '% chính xác',
                },
                ticks: {
                  callback: (value) => `${Number(value)}%`,
                },
              },
              yLatency: {
                display: false,
                grid: {
                  display: false,
                  drawOnChartArea: false,
                },
                ticks: {
                  display: false,
                },
                title: {
                  display: false,
                },
              },
            },
          }}
        />
      )}
    </ChartCard>
  )
}
