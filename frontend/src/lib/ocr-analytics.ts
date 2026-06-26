import type { ChartData, ChartDataset } from 'chart.js'
import type { OcrDailyPoint, OcrMonthlyPoint, OcrStats } from '@/services/api/ocrStats.api'

/**
 * Total-only OCR chart helpers. The OCR analytics count a SINGLE series —
 * every OCR request across ALL providers (Gemini, MiniMax, OpenRouter, …) —
 * so there is no per-provider split here. A future provider needs no change
 * in this module.
 */

/** Brand accent (primary green) for the single total series. */
export const OCR_COLOR = '#00B14F'

const TOTAL_LABEL = 'Tổng số lượt OCR'

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
