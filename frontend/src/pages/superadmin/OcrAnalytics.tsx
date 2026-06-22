import { useMemo, useState } from 'react'
import { ScanText } from 'lucide-react'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import {
  BarChartWidget,
  LineChartWidget,
} from '@/components/shared/data-display/Charts'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import {
  OCR_COLORS,
  buildDailyLineData,
  buildMonthlyBarData,
  grandTotal,
  successRate,
} from './ocrAnalytics.helpers'

const DAY_OPTIONS = [7, 30, 90, 365] as const

export function OcrAnalytics() {
  const [days, setDays] = useState<number>(30)
  const { data, isLoading } = useOcrStats(days)

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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Thống kê OCR"
        subtitle="Số lượt nhận dạng số cont theo ngày / tháng và theo nhà cung cấp (MiniMax, Gemini)"
        lucideIcon={ScanText}
        actions={
          <div
            className="flex items-center gap-1 rounded-lg p-1"
            style={{ background: 'var(--theme-bg-secondary)' }}
          >
            {DAY_OPTIONS.map((opt) => {
              const active = opt === days
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDays(opt)}
                  className="rounded-md min-h-[44px] px-3 py-2 text-[12.5px] font-medium transition-colors"
                  style={{
                    background: active ? 'var(--surface)' : 'transparent',
                    color: active
                      ? 'var(--theme-text-primary)'
                      : 'var(--theme-text-muted)',
                    boxShadow: active
                      ? '0 1px 2px rgba(0,0,0,0.06)'
                      : 'none',
                  }}
                  aria-pressed={active}
                >
                  {opt === 365 ? '12 tháng' : `${opt} ngày`}
                </button>
              )
            })}
          </div>
        }
      />

      {/* ── Totals ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Tổng lượt OCR"
          value={grandTotal(data)}
          hint={`${days} ngày gần nhất`}
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

      {/* ── Monthly bar chart ──────────────────────────────────────────── */}
      <ChartCard
        title="Lượt OCR theo tháng"
        subtitle="Tổng hợp theo nhà cung cấp"
        loading={isLoading}
      >
        <BarChartWidget data={monthlyData} height={280} />
      </ChartCard>

      {/* ── Daily line chart ───────────────────────────────────────────── */}
      <ChartCard
        title="Lượt OCR theo ngày"
        subtitle="MiniMax (chính) và Gemini (dự phòng)"
        loading={isLoading}
      >
        <LineChartWidget
          data={dailyData}
          height={280}
          options={{ plugins: { legend: { display: true } } }}
        />
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
