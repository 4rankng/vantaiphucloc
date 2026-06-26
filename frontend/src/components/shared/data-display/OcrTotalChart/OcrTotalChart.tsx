import { useMemo, useState } from 'react'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import { BarChartWidget, LineChartWidget } from '@/components/shared/data-display/Charts'
import { OcrViewToggle, type ViewMode } from '@/components/shared/data-display/OcrViewToggle/OcrViewToggle'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import {
  buildDailyLineData,
  buildMonthlyBarData,
  grandTotal,
  hasOcrData,
  successRate,
} from '@/lib/ocr-analytics'

interface OcrTotalChartProps {
  /** Window for the "day" view; the "month" view always uses 365 days. */
  days?: number
  /** Show the day/month segmented toggle. Hidden on compact dashboard tiles. */
  showToggle?: boolean
  className?: string
  title?: string
}

/**
 * Total-only OCR request chart. One series counts every OCR request across
 * ALL providers (Gemini, MiniMax, OpenRouter, …), so it is model-agnostic and
 * works for any provider without per-model wiring. Shared by the superadmin
 * overview/detail pages and the director & accountant dashboards.
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
  const isMonth = showToggle && view === 'month'
  const effectiveDays = isMonth ? 365 : days
  const { data: stats, isLoading } = useOcrStats(effectiveDays)

  const dailyData = useMemo(() => buildDailyLineData(stats?.daily ?? []), [stats])
  const monthlyData = useMemo(() => buildMonthlyBarData(stats?.monthly ?? []), [stats])

  const baseSubtitle = isMonth
    ? 'Số lượt nhận dạng số cont theo tháng'
    : `Số lượt nhận dạng số cont · ${effectiveDays} ngày gần nhất`

  const total = grandTotal(stats)
  const successPct = stats ? successRate(stats.totals.total, stats.totals.success) : 0
  const subtitle = hasOcrData(stats)
    ? `${baseSubtitle} · ${total.toLocaleString('vi-VN')} lượt · thành công ${successPct}%`
    : baseSubtitle

  const actions = showToggle ? <OcrViewToggle value={view} onChange={setView} /> : undefined

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
            },
            interaction: { mode: 'index', intersect: false },
          }}
        />
      )}
    </ChartCard>
  )
}
