import type { ChartData, ChartDataset } from 'chart.js'
import type { OcrDailyPoint, OcrMonthlyPoint, OcrStats } from '@/services/api/ocrStats.api'

/** Provider → chart color. MiniMax is the brand accent (primary provider). */
export const OCR_COLORS = {
  minimax: '#00B14F', // --accent (brand green) — primary provider
  gemini: '#3B82F6', // blue — fallback provider
} as const

export const PROVIDER_LABEL = {
  minimax: 'MiniMax',
  gemini: 'Gemini',
} as const

/** Monthly request counts as a grouped bar chart (one bar per provider per month). */
export function buildMonthlyBarData(
  monthly: OcrMonthlyPoint[],
  minimaxEnable = true,
  geminiEnable = true
): ChartData<'bar'> {
  const datasets: ChartDataset<'bar'>[] = []
  if (minimaxEnable) {
    datasets.push({
      label: PROVIDER_LABEL.minimax,
      data: monthly.map((m) => m.minimax),
      backgroundColor: OCR_COLORS.minimax,
      borderRadius: 4,
    })
  }
  if (geminiEnable) {
    datasets.push({
      label: PROVIDER_LABEL.gemini,
      data: monthly.map((m) => m.gemini),
      backgroundColor: OCR_COLORS.gemini,
      borderRadius: 4,
    })
  }
  return {
    labels: monthly.map((m) => m.month),
    datasets,
  }
}

/** One filled line dataset sharing the OCR chart's gradient + point styling. */
function lineDataset(label: string, data: number[], color: string): ChartDataset<'line'> {
  return {
    label,
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

/**
 * Per-provider daily OCR counts as two lines (MiniMax + Gemini). Used on the
 * OCR analytics detail page where the provider split matters.
 */
export function buildDailyLineData(
  daily: OcrDailyPoint[],
  minimaxEnable = true,
  geminiEnable = true
): ChartData<'line'> {
  const datasets: ChartDataset<'line'>[] = []
  if (minimaxEnable) {
    datasets.push(
      lineDataset(PROVIDER_LABEL.minimax, daily.map((d) => d.minimax), OCR_COLORS.minimax)
    )
  }
  if (geminiEnable) {
    datasets.push(
      lineDataset(PROVIDER_LABEL.gemini, daily.map((d) => d.gemini), OCR_COLORS.gemini)
    )
  }
  return {
    labels: daily.map((d) => d.date.slice(5)), // MM-DD
    datasets,
  }
}

/**
 * Daily OCR request count as a SINGLE total line — minimax + gemini combined
 * per day, regardless of which provider handled the request. Used on the admin
 * dashboard where only overall volume matters.
 */
export function buildDailyTotalLineData(daily: OcrDailyPoint[]): ChartData<'line'> {
  return {
    labels: daily.map((d) => d.date.slice(5)), // MM-DD
    datasets: [
      lineDataset('Tổng số lượt OCR', daily.map((d) => d.minimax + d.gemini), OCR_COLORS.minimax),
    ],
  }
}

/** Success rate as a rounded percentage; 0 when there are no requests. */
export function successRate(total: number, success: number): number {
  if (!total) return 0
  return Math.round((success / total) * 100)
}

/** Total OCR requests across both providers over the selected window. */
export function grandTotal(stats: OcrStats | null | undefined): number {
  if (!stats) return 0
  return stats.totals.minimax.total + stats.totals.gemini.total
}

/** True when there is any OCR data to chart (at least one daily point or a non-zero total). */
export function hasOcrData(stats: OcrStats | null | undefined): boolean {
  if (!stats) return false
  return stats.daily.length > 0 || grandTotal(stats) > 0
}
