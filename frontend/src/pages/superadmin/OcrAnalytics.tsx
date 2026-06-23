import { useMemo, useState } from 'react'
import { ScanText } from 'lucide-react'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import {
  BarChartWidget,
  LineChartWidget,
} from '@/components/shared/data-display/Charts'
import { OcrViewToggle, type ViewMode } from '@/components/shared/data-display/OcrViewToggle/OcrViewToggle'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import {
  OCR_COLORS,
  buildDailyLineData,
  buildMonthlyBarData,
  grandTotal,
  successRate,
} from './ocrAnalytics.helpers'

interface ViewConfig {
  days: number
  title: string
  subtitle: string
}

const VIEW_CONFIG: Record<ViewMode, ViewConfig> = {
  day: {
    days: 30,
    title: 'Lượt OCR theo ngày',
    subtitle: 'MiniMax (chính) và Gemini (dự phòng)',
  },
  month: {
    days: 365,
    title: 'Lượt OCR theo tháng',
    subtitle: 'Tổng hợp theo nhà cung cấp',
  },
}

export function OcrAnalytics() {
  const [view, setView] = useState<ViewMode>('day')
  const config = VIEW_CONFIG[view]
  const { data, isLoading } = useOcrStats(config.days)

  const monthlyData = useMemo(
    () => buildMonthlyBarData(data?.monthly ?? []),
    [data],
  )
  const dailyData = useMemo(
    () => buildDailyLineData(data?.daily ?? []),
    [data],
  )

  const totals = data?.totals
  const minimax = totals?.minimax
  const gemini = totals?.gemini

  const chartActions = <OcrViewToggle value={view} onChange={setView} />

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Thống kê OCR"
        subtitle="Số lượt nhận dạng số cont theo ngày / tháng"
        lucideIcon={ScanText}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Tổng lượt OCR"
          value={grandTotal(data)}
          hint={`${config.days} ngày gần nhất`}
        />
        <StatTile
          label="MiniMax"
          value={minimax?.total ?? 0}
          hint={
            minimax
              ? `Thành công ${successRate(minimax.total, minimax.success)}%`
              : 'Chưa có dữ liệu'
          }
          dotColor={OCR_COLORS.minimax}
        />
        <StatTile
          label="Gemini"
          value={gemini?.total ?? 0}
          hint={
            gemini
              ? `Thành công ${successRate(gemini.total, gemini.success)}%`
              : 'Chưa có dữ liệu'
          }
          dotColor={OCR_COLORS.gemini}
        />
      </div>

      <ChartCard
        title={config.title}
        subtitle={config.subtitle}
        actions={chartActions}
        loading={isLoading}
      >
        {view === 'month' ? (
          <BarChartWidget data={monthlyData} height={320} />
        ) : (
          <LineChartWidget
            data={dailyData}
            height={320}
            options={{
              plugins: {
                legend: {
                  display: true,
                  labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 },
                },
              },
              interaction: {
                mode: 'index',
                intersect: false,
              },
            }}
          />
        )}
      </ChartCard>
    </div>
  )
}

interface StatTileProps {
  label: string
  value: number
  hint?: string
  dotColor?: string
}

function StatTile({ label, value, hint, dotColor }: StatTileProps) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-2">
        {dotColor && (
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: dotColor }}
          />
        )}
        <p className="typo-meta">{label}</p>
      </div>
      <p
        className="mt-2 font-semibold leading-none"
        style={{
          fontFamily: 'var(--theme-font-display)',
          fontSize: '1.75rem',
          letterSpacing: '-0.03em',
          color: 'var(--theme-text-primary)',
        }}
      >
        {value.toLocaleString('vi-VN')}
      </p>
      {hint && <p className="typo-meta mt-2">{hint}</p>}
    </div>
  )
}
