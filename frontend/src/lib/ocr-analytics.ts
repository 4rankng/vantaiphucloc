import type { ChartData, ChartDataset } from 'chart.js'
import type {
  OcrDailyPoint,
  OcrMonthlyPoint,
  OcrStats,
} from '@/services/api/ocrStats.api'

/**
 * Total-only OCR chart helpers. The OCR analytics count a SINGLE series —
 * every OCR request across ALL providers (Gemini, MiniMax, OpenRouter, …) —
 * so there is no per-provider split here. A future provider needs no change
 * in this module.
 */

/** Brand accent (primary green) for the single total series. */
export const OCR_COLOR = '#00B14F'

/** Accent for the latency p95 series — distinct from the avg + count colors. */
export const OCR_LATENCY_P95_COLOR = '#F59E0B'

/** Accent for the latency average series. */
export const OCR_LATENCY_AVG_COLOR = '#0EA5E9'

const TOTAL_LABEL = 'Tổng số lượt OCR'
const LATENCY_AVG_LABEL = 'Trung bình'
const LATENCY_P95_LABEL = 'p95'

/** One filled line dataset sharing the OCR chart's gradient + point styling. */
function lineDataset(data: number[]): ChartDataset<'line'> {
  const color = OCR_COLOR
  return {
    label: TOTAL_LABEL,
    data,
    borderColor: color,
    backgroundColor: (context) => {
      const { ctx, chartArea } = context.chart
      if (!chartArea) return `${color}1A`
      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
      gradient.addColorStop(0, `${color}33`) // 20% opacity
      gradient.addColorStop(1, `${color}00`) // 0% opacity
      return gradient
    },
    fill: true,
    tension: 0.4,
    borderWidth: 2.5,
    pointRadius: 3,
    pointBackgroundColor: '#ffffff',
    pointBorderColor: color,
    pointBorderWidth: 2,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: color,
  }
}

/** Daily OCR request count as a single total line across all providers. */
export function buildDailyLineData(daily: OcrDailyPoint[]): ChartData<'line'> {
  return {
    labels: daily.map((d) => d.date.slice(5)), // MM-DD
    datasets: [lineDataset(daily.map((d) => d.total))],
  }
}

/** Monthly OCR request count as a single total bar series. */
export function buildMonthlyBarData(monthly: OcrMonthlyPoint[]): ChartData<'bar'> {
  return {
    labels: monthly.map((m) => m.month),
    datasets: [
      {
        label: TOTAL_LABEL,
        data: monthly.map((m) => m.total),
        backgroundColor: OCR_COLOR,
        borderRadius: 4,
      },
    ],
  }
}

/** Success rate as a rounded percentage; 0 when there are no requests. */
export function successRate(total: number, success: number): number {
  if (!total) return 0
  return Math.round((success / total) * 100)
}

/** Total OCR requests across all providers over the selected window. */
export function grandTotal(stats: OcrStats | null | undefined): number {
  if (!stats) return 0
  return stats.totals.total
}

/** True when there is any OCR data to chart (at least one daily point or a non-zero total). */
export function hasOcrData(stats: OcrStats | null | undefined): boolean {
  if (!stats) return false
  return stats.daily.length > 0 || grandTotal(stats) > 0
}

// ---------------------------------------------------------------------------
// Latency chart helpers
// ---------------------------------------------------------------------------

/** True when at least one daily bucket has a latency sample. */
export function hasLatencyData(stats: OcrStats | null | undefined): boolean {
  if (!stats) return false
  return stats.daily.some((d) => d.latencyAvgMs !== null)
}

/**
 * Vietnamese-friendly latency formatter.
 * - ≥1000ms → "X.XXs" (two decimals, trimmed trailing zero)
 * - <1000ms → "Xms"
 * - null → "—" (em dash, distinct from "0 ms" which would be misleading)
 */
export function formatLatencyMs(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return '—'
  if (ms >= 1000) {
    const s = ms / 1000
    const fixed = s.toFixed(2)
    return `${parseFloat(fixed)}s`
  }
  return `${Math.round(ms)}ms`
}

/**
 * Two-series line chart for daily latency (avg + p95). Days without enough
 * samples render as gaps (null) so a quiet day does not produce a fake
 * "0 ms" point. Values are returned in seconds (ms / 1000) so chart axes
 * read naturally — a 1450ms p95 is 1.45s, not a four-digit tick mark.
 */
export function buildDailyLatencyLineData(
  daily: OcrDailyPoint[],
): ChartData<'line'> {
  return {
    labels: daily.map((d) => d.date.slice(5)),
    datasets: [
      {
        label: LATENCY_AVG_LABEL,
        data: daily.map((d) =>
          d.latencyAvgMs === null ? null : Number((d.latencyAvgMs / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_AVG_COLOR,
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart
          if (!chartArea) return `${OCR_LATENCY_AVG_COLOR}1A`
          const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom,
          )
          gradient.addColorStop(0, `${OCR_LATENCY_AVG_COLOR}33`)
          gradient.addColorStop(1, `${OCR_LATENCY_AVG_COLOR}00`)
          return gradient
        },
        fill: true,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_LATENCY_AVG_COLOR,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_LATENCY_AVG_COLOR,
      },
      {
        label: LATENCY_P95_LABEL,
        data: daily.map((d) =>
          d.latencyP95Ms === null ? null : Number((d.latencyP95Ms / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_P95_COLOR,
        backgroundColor: `${OCR_LATENCY_P95_COLOR}00`,
        fill: false,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2.5,
        borderDash: [6, 4],
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_LATENCY_P95_COLOR,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_LATENCY_P95_COLOR,
      },
    ],
  }
}

/**
 * Single-series bar chart for monthly average latency. Same units as the
 * daily line (seconds). Months without enough qualifying days render as a
 * gap.
 */
export function buildMonthlyLatencyBarData(
  monthly: OcrMonthlyPoint[],
): ChartData<'bar'> {
  return {
    labels: monthly.map((m) => m.month),
    datasets: [
      {
        label: LATENCY_AVG_LABEL,
        data: monthly.map((m) =>
          m.latencyAvgMs === null ? null : Number((m.latencyAvgMs / 1000).toFixed(3)),
        ),
        backgroundColor: OCR_LATENCY_AVG_COLOR,
        borderRadius: 4,
      },
    ],
  }
}
