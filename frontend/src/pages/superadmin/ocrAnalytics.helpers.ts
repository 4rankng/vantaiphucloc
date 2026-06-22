import type { ChartData } from 'chart.js'
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
export function buildMonthlyBarData(monthly: OcrMonthlyPoint[]): ChartData<'bar'> {
  return {
    labels: monthly.map((m) => m.month),
    datasets: [
      {
        label: PROVIDER_LABEL.minimax,
        data: monthly.map((m) => m.minimax),
        backgroundColor: OCR_COLORS.minimax,
        borderRadius: 4,
      },
      {
        label: PROVIDER_LABEL.gemini,
        data: monthly.map((m) => m.gemini),
        backgroundColor: OCR_COLORS.gemini,
        borderRadius: 4,
      },
    ],
  }
}

export function buildDailyLineData(daily: OcrDailyPoint[]): ChartData<'line'> {
  return {
    labels: daily.map((d) => d.date.slice(5)), // MM-DD
    datasets: [
      {
        label: PROVIDER_LABEL.minimax,
        data: daily.map((d) => d.minimax),
        borderColor: OCR_COLORS.minimax,
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return `${OCR_COLORS.minimax}1A`
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, `${OCR_COLORS.minimax}33`) // 20% opacity
          gradient.addColorStop(1, `${OCR_COLORS.minimax}00`) // 0% opacity
          return gradient
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_COLORS.minimax,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_COLORS.minimax,
      },
      {
        label: PROVIDER_LABEL.gemini,
        data: daily.map((d) => d.gemini),
        borderColor: OCR_COLORS.gemini,
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return `${OCR_COLORS.gemini}1A`
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, `${OCR_COLORS.gemini}33`)
          gradient.addColorStop(1, `${OCR_COLORS.gemini}00`)
          return gradient
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_COLORS.gemini,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_COLORS.gemini,
      },
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
