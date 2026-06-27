import { useMemo, useState } from 'react'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import { BarChartWidget, LineChartWidget } from '@/components/shared/data-display/Charts'
import { OcrViewToggle, type ViewMode } from '@/components/shared/data-display/OcrViewToggle/OcrViewToggle'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import {
  buildDailyDriverVolumeData,
  buildMonthlyDriverVolumeData,
  driverSuccess,
  driverTotal,
  hasDriverData,
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
 * Total OCR chart counting DRIVER PHOTO UPLOADS (the human action), not
 * provider LLM calls — a single upload that falls back across providers is
 * one upload, however many calls it triggered. Model-agnostic. Shared by the
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
  const isMonth = showToggle && view === 'month'
  const effectiveDays = isMonth ? 365 : days
  const { data: stats, isLoading } = useOcrStats(effectiveDays)

  const driverDaily = stats?.driverExperience.daily ?? []
  const driverMonthly = stats?.driverExperience.monthly ?? []
  const dailyData = useMemo(() => buildDailyDriverVolumeData(driverDaily), [driverDaily])
  const monthlyData = useMemo(() => buildMonthlyDriverVolumeData(driverMonthly), [driverMonthly])

  const baseSubtitle = isMonth
    ? 'Số lượt tài xế tải ảnh nhận dạng theo tháng'
    : `Số lượt tài xế tải ảnh · ${effectiveDays} ngày gần nhất`

  const total = driverTotal(stats)
  const successPct = stats ? successRate(driverTotal(stats), driverSuccess(stats)) : 0
  const subtitle = hasDriverData(stats)
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
      {!isLoading && !hasDriverData(stats) ? (
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
