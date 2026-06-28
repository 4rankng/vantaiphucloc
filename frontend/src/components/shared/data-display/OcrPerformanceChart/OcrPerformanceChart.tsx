import { useMemo, useState } from 'react'
import { ChartCard } from '@/components/shared/data-display/ChartCard'
import { MixedChartWidget } from '@/components/shared/data-display/Charts'
import { OcrViewToggle, type ViewMode } from '@/components/shared/data-display/OcrViewToggle/OcrViewToggle'
import { useOcrStats } from '@/hooks/queries/ocr-stats'
import {
  buildDailyOcrPerformanceData,
  buildMonthlyOcrPerformanceData,
  driverFailedTotal,
  driverTotal,
  formatLatencyMs,
  grandTotal,
  hasLatencyData,
  hasOcrData,
  successRate,
} from '@/lib/ocr-analytics'

interface OcrPerformanceChartProps {
  days?: number
  showToggle?: boolean
  className?: string
  title?: string
}

export function OcrPerformanceChart({
  days = 30,
  showToggle = true,
  className,
  title = 'Hiệu suất OCR',
}: OcrPerformanceChartProps) {
  const [view, setView] = useState<ViewMode>('day')
  const isMonth = showToggle && view === 'month'
  const effectiveDays = isMonth ? 365 : days
  const { data: stats, isLoading } = useOcrStats(effectiveDays)

  const dailyData = useMemo(
    () => buildDailyOcrPerformanceData(stats?.daily ?? []),
    [stats],
  )
  const monthlyData = useMemo(
    () => buildMonthlyOcrPerformanceData(stats?.monthly ?? []),
    [stats],
  )

  const total = grandTotal(stats)
  const successPct = stats ? successRate(stats.totals.total, stats.totals.success) : 0
  const baseSubtitle = isMonth
    ? 'Số lượt OCR và độ trễ trung bình theo tháng'
    : `Số lượt OCR và độ trễ · ${effectiveDays} ngày gần nhất`
  const latencySubtitle = hasLatencyData(stats)
    ? ` · TB ${formatLatencyMs(stats?.totals.latencyAvgMs ?? null)} · p95 ${formatLatencyMs(stats?.totals.latencyP95Ms ?? null)}`
    : ''
  const subtitle = hasOcrData(stats)
    ? `${baseSubtitle} · ${total.toLocaleString('vi-VN')} lượt · thành công ${successPct}%${latencySubtitle}`
    : baseSubtitle

  const actions = showToggle ? <OcrViewToggle value={view} onChange={setView} /> : undefined
  const chartData = isMonth ? monthlyData : dailyData
  const providerErrors = stats?.providerErrors ?? []
  const topErrors = providerErrors.slice(0, 5)
  const driverFailed = driverFailedTotal(stats)
  const uploads = driverTotal(stats)

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
              },
              y: {
                stacked: true,
                title: {
                  display: true,
                  text: 'Lượt OCR',
                },
                ticks: {
                  precision: 0,
                  callback: (value) => Number(value).toLocaleString('vi-VN'),
                },
              },
              yLatency: {
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
      {(providerErrors.length > 0 || uploads > 0) && (
        <div
          className="mt-4 border-t pt-3"
          style={{ borderColor: 'var(--line)' }}
        >
          {/* Driver-seen errors — the UX truth. Headline first: this is the
              number of drivers who actually experienced a failure, not the
              number of provider attempts (a rescued attempt is not a failure). */}
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Lỗi tài xế gặp phải
              </p>
              <p className="text-[11px] tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>
                {driverFailed.toLocaleString('vi-VN')} / {uploads.toLocaleString('vi-VN')} lượt tải ảnh
              </p>
            </div>
            <p
              className="text-[11px] leading-snug"
              style={{ color: driverFailed > 0 ? 'var(--theme-status-error)' : 'var(--theme-text-muted)' }}
            >
              {driverFailed > 0
                ? `${driverFailed.toLocaleString('vi-VN')} ảnh không nhận được số cont.`
                : 'Không có tài xế nào gặp lỗi — mọi ảnh tải lên đều nhận được số cont.'}
            </p>
          </div>

          {/* Provider errors — operational detail. Each item is one provider
              attempt; a rescued attempt still shows here even though the driver
              succeeded (see the driver-seen count above for actual user impact). */}
          {topErrors.length > 0 && (
            <div className="border-t pt-3" style={{ borderColor: 'var(--line)' }}>
              <p className="mb-2 text-[12px] font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Lỗi AI
              </p>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {topErrors.map((item) => (
                  <div
                    key={item.category}
                    className="min-w-0 rounded-lg border px-3 py-2"
                    style={{
                      background: 'var(--theme-bg-secondary)',
                      borderColor: 'var(--theme-border-default)',
                    }}
                    title={item.sampleError ?? undefined}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className="truncate text-[12px] font-semibold"
                        style={{ color: item.statusCode && item.statusCode >= 500 ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}
                      >
                        {item.label}
                      </span>
                      <span
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
                        style={{
                          background: item.statusCode && item.statusCode >= 500
                            ? 'var(--theme-status-error-light)'
                            : 'var(--theme-status-warning-light)',
                          color: item.statusCode && item.statusCode >= 500
                            ? 'var(--theme-status-error)'
                            : 'var(--theme-status-warning)',
                        }}
                      >
                        {item.total.toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-snug" style={{ color: 'var(--theme-text-muted)' }}>
                      {item.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  )
}
