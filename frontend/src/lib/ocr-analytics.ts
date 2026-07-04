import type { ChartData, ChartDataset } from 'chart.js'
import type {
  OcrAccuracyDailyPoint,
  OcrDailyPoint,
  OcrDriverDailyPoint,
  OcrDriverHourlyPoint,
  OcrDriverMonthlyPoint,
  OcrHourlyPoint,
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

export const OCR_FAILED_COLOR = '#DC2626'

/** Accent for the latency p95 series — distinct from the avg + count colors. */
export const OCR_LATENCY_P95_COLOR = '#F59E0B'

/** Accent for the latency average series. */
export const OCR_LATENCY_AVG_COLOR = '#0EA5E9'

const TOTAL_LABEL = 'Tổng số lượt OCR'
const SUCCESS_LABEL = 'Thành công'
const FAILED_LABEL = 'Thất bại'
const LATENCY_P95_LABEL = 'p95'

function hourLabel(hour: string): string {
  return `${hour.slice(5, 10)} ${hour.slice(11, 16)}`
}

/** One filled line dataset sharing the OCR chart's gradient + point styling. */
function lineDataset(data: number[], label: string = TOTAL_LABEL): ChartDataset<'line'> {
  const color = OCR_COLOR
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

/** Hourly OCR request count for the current day. */
export function buildHourlyLineData(hourly: OcrHourlyPoint[]): ChartData<'line'> {
  return {
    labels: hourly.map((h) => hourLabel(h.hour)),
    datasets: [lineDataset(hourly.map((h) => h.total))],
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

/** Hourly version of the admin combo chart. */
export function buildHourlyOcrPerformanceData(
  hourly: OcrHourlyPoint[],
): ChartData<'bar' | 'line'> {
  return {
    labels: hourly.map((h) => hourLabel(h.hour)),
    datasets: [
      {
        type: 'bar',
        label: SUCCESS_LABEL,
        data: hourly.map((h) => h.success),
        backgroundColor: `${OCR_COLOR}B3`,
        borderColor: OCR_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'bar',
        label: FAILED_LABEL,
        data: hourly.map((h) => h.failed),
        backgroundColor: `${OCR_FAILED_COLOR}B3`,
        borderColor: OCR_FAILED_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'Độ trễ TB',
        data: hourly.map((h) =>
          h.latencyAvgMs === null ? null : Number((h.latencyAvgMs / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_AVG_COLOR,
        backgroundColor: OCR_LATENCY_AVG_COLOR,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_LATENCY_AVG_COLOR,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_LATENCY_AVG_COLOR,
        yAxisID: 'yLatency',
        order: 1,
      },
      {
        type: 'line',
        label: LATENCY_P95_LABEL,
        data: hourly.map((h) =>
          h.latencyP95Ms === null ? null : Number((h.latencyP95Ms / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_P95_COLOR,
        backgroundColor: OCR_LATENCY_P95_COLOR,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: OCR_LATENCY_P95_COLOR,
        yAxisID: 'yLatency',
        order: 0,
      },
    ],
  }
}

/**
 * Combined OCR operations chart for admin dashboards:
 * - bars: request count on the left axis
 * - line: average latency in seconds on the right axis
 */
export function buildDailyOcrPerformanceData(
  daily: OcrDailyPoint[],
): ChartData<'bar' | 'line'> {
  return {
    labels: daily.map((d) => d.date.slice(5)),
    datasets: [
      {
        type: 'bar',
        label: SUCCESS_LABEL,
        data: daily.map((d) => d.success),
        backgroundColor: `${OCR_COLOR}B3`,
        borderColor: OCR_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'bar',
        label: FAILED_LABEL,
        data: daily.map((d) => d.failed),
        backgroundColor: `${OCR_FAILED_COLOR}B3`,
        borderColor: OCR_FAILED_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'Độ trễ TB',
        data: daily.map((d) =>
          d.latencyAvgMs === null ? null : Number((d.latencyAvgMs / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_AVG_COLOR,
        backgroundColor: OCR_LATENCY_AVG_COLOR,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_LATENCY_AVG_COLOR,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_LATENCY_AVG_COLOR,
        yAxisID: 'yLatency',
        order: 1,
      },
      {
        type: 'line',
        label: LATENCY_P95_LABEL,
        data: daily.map((d) =>
          d.latencyP95Ms === null ? null : Number((d.latencyP95Ms / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_P95_COLOR,
        backgroundColor: OCR_LATENCY_P95_COLOR,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: OCR_LATENCY_P95_COLOR,
        yAxisID: 'yLatency',
        order: 0,
      },
    ],
  }
}

/** Monthly version of the admin combo chart. */
export function buildMonthlyOcrPerformanceData(
  monthly: OcrMonthlyPoint[],
): ChartData<'bar' | 'line'> {
  return {
    labels: monthly.map((m) => m.month),
    datasets: [
      {
        type: 'bar',
        label: SUCCESS_LABEL,
        data: monthly.map((m) => m.success),
        backgroundColor: `${OCR_COLOR}B3`,
        borderColor: OCR_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'bar',
        label: FAILED_LABEL,
        data: monthly.map((m) => m.failed),
        backgroundColor: `${OCR_FAILED_COLOR}B3`,
        borderColor: OCR_FAILED_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'Độ trễ TB',
        data: monthly.map((m) =>
          m.latencyAvgMs === null ? null : Number((m.latencyAvgMs / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_AVG_COLOR,
        backgroundColor: OCR_LATENCY_AVG_COLOR,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_LATENCY_AVG_COLOR,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_LATENCY_AVG_COLOR,
        yAxisID: 'yLatency',
        order: 1,
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
  return stats.hourly.length > 0 || stats.daily.length > 0 || grandTotal(stats) > 0
}

// ---------------------------------------------------------------------------
// Latency chart helpers
// ---------------------------------------------------------------------------

/** True when at least one daily bucket has a latency sample. */
export function hasLatencyData(stats: OcrStats | null | undefined): boolean {
  if (!stats) return false
  return (
    stats.hourly.some((h) => h.latencyAvgMs !== null) ||
    stats.daily.some((d) => d.latencyAvgMs !== null)
  )
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

// ---------------------------------------------------------------------------
// Driver-experience chart helpers — one data point per photo upload
// ---------------------------------------------------------------------------

const DRIVER_TOTAL_LABEL = 'Lượt tải ảnh'

/**
 * Daily driver photo-upload count as a single total line. Used by the total
 * chart so "Tổng lượt OCR" reflects how many times drivers uploaded a photo,
 * not how many provider calls those uploads triggered.
 */
export function buildDailyDriverVolumeData(
  driverDaily: OcrDriverDailyPoint[],
): ChartData<'line'> {
  return {
    labels: driverDaily.map((d) => d.date.slice(5)),
    datasets: [lineDataset(driverDaily.map((d) => d.requests), DRIVER_TOTAL_LABEL)],
  }
}

/** Hourly driver photo-upload count for the current day. */
export function buildHourlyDriverVolumeData(
  driverHourly: OcrDriverHourlyPoint[],
): ChartData<'line'> {
  return {
    labels: driverHourly.map((h) => hourLabel(h.hour)),
    datasets: [lineDataset(driverHourly.map((h) => h.requests), DRIVER_TOTAL_LABEL)],
  }
}

/** Monthly driver photo-upload count as a single total bar series. */
export function buildMonthlyDriverVolumeData(
  driverMonthly: OcrDriverMonthlyPoint[],
): ChartData<'bar'> {
  return {
    labels: driverMonthly.map((m) => m.month),
    datasets: [
      {
        label: DRIVER_TOTAL_LABEL,
        data: driverMonthly.map((m) => m.requests),
        backgroundColor: OCR_COLOR,
        borderRadius: 4,
      },
    ],
  }
}

/** Hourly version of the driver-experience combo chart. */
export function buildHourlyDriverExperienceData(
  driverHourly: OcrDriverHourlyPoint[],
): ChartData<'bar' | 'line'> {
  return {
    labels: driverHourly.map((h) => hourLabel(h.hour)),
    datasets: [
      {
        type: 'bar',
        label: SUCCESS_LABEL,
        data: driverHourly.map((h) => h.success),
        backgroundColor: `${OCR_COLOR}B3`,
        borderColor: OCR_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'bar',
        label: FAILED_LABEL,
        data: driverHourly.map((h) => h.failed),
        backgroundColor: `${OCR_FAILED_COLOR}B3`,
        borderColor: OCR_FAILED_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'Độ trễ TB',
        data: driverHourly.map((h) =>
          h.latencyAvgMs === null ? null : Number((h.latencyAvgMs / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_AVG_COLOR,
        backgroundColor: OCR_LATENCY_AVG_COLOR,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_LATENCY_AVG_COLOR,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_LATENCY_AVG_COLOR,
        yAxisID: 'yLatency',
        order: 1,
      },
      {
        type: 'line',
        label: LATENCY_P95_LABEL,
        data: driverHourly.map((h) =>
          h.latencyP95Ms === null ? null : Number((h.latencyP95Ms / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_P95_COLOR,
        backgroundColor: OCR_LATENCY_P95_COLOR,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: OCR_LATENCY_P95_COLOR,
        yAxisID: 'yLatency',
        order: 0,
      },
    ],
  }
}

/**
 * Driver-experience combo chart for the admin dashboard:
 * - bars: photo-upload count (success/failed) on the left axis
 * - line: end-to-end perceived latency (avg + p95) on the right axis
 * Distinct from buildDailyOcrPerformanceData, which plots per-provider-call
 * volume + provider-call latency.
 */
export function buildDailyDriverExperienceData(
  driverDaily: OcrDriverDailyPoint[],
): ChartData<'bar' | 'line'> {
  return {
    labels: driverDaily.map((d) => d.date.slice(5)),
    datasets: [
      {
        type: 'bar',
        label: SUCCESS_LABEL,
        data: driverDaily.map((d) => d.success),
        backgroundColor: `${OCR_COLOR}B3`,
        borderColor: OCR_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'bar',
        label: FAILED_LABEL,
        data: driverDaily.map((d) => d.failed),
        backgroundColor: `${OCR_FAILED_COLOR}B3`,
        borderColor: OCR_FAILED_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'Độ trễ TB',
        data: driverDaily.map((d) =>
          d.latencyAvgMs === null ? null : Number((d.latencyAvgMs / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_AVG_COLOR,
        backgroundColor: OCR_LATENCY_AVG_COLOR,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_LATENCY_AVG_COLOR,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_LATENCY_AVG_COLOR,
        yAxisID: 'yLatency',
        order: 1,
      },
      {
        type: 'line',
        label: LATENCY_P95_LABEL,
        data: driverDaily.map((d) =>
          d.latencyP95Ms === null ? null : Number((d.latencyP95Ms / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_P95_COLOR,
        backgroundColor: OCR_LATENCY_P95_COLOR,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: OCR_LATENCY_P95_COLOR,
        yAxisID: 'yLatency',
        order: 0,
      },
    ],
  }
}

/** Monthly version of the driver-experience combo chart (no p95 by design). */
export function buildMonthlyDriverExperienceData(
  driverMonthly: OcrDriverMonthlyPoint[],
): ChartData<'bar' | 'line'> {
  return {
    labels: driverMonthly.map((m) => m.month),
    datasets: [
      {
        type: 'bar',
        label: SUCCESS_LABEL,
        data: driverMonthly.map((m) => m.success),
        backgroundColor: `${OCR_COLOR}B3`,
        borderColor: OCR_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'bar',
        label: FAILED_LABEL,
        data: driverMonthly.map((m) => m.failed),
        backgroundColor: `${OCR_FAILED_COLOR}B3`,
        borderColor: OCR_FAILED_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'requests',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'Độ trễ TB',
        data: driverMonthly.map((m) =>
          m.latencyAvgMs === null ? null : Number((m.latencyAvgMs / 1000).toFixed(3)),
        ),
        borderColor: OCR_LATENCY_AVG_COLOR,
        backgroundColor: OCR_LATENCY_AVG_COLOR,
        tension: 0.4,
        spanGaps: true,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_LATENCY_AVG_COLOR,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_LATENCY_AVG_COLOR,
        yAxisID: 'yLatency',
        order: 1,
      },
    ],
  }
}

/** Total driver photo-uploads over the selected window. */
export function driverTotal(stats: OcrStats | null | undefined): number {
  if (!stats) return 0
  return stats.driverExperience.totals.requests
}

export function driverSuccess(stats: OcrStats | null | undefined): number {
  if (!stats) return 0
  return stats.driverExperience.totals.success
}

/**
 * Driver-seen failures: uploads where the driver actually saw an error (no
 * provider rescued the request). Distinct from `providerErrors`, which counts
 * every failed provider *attempt* — including ones a later provider rescued.
 * This is the user-impact error count; `requests - success` over the window.
 */
export function driverFailedTotal(stats: OcrStats | null | undefined): number {
  if (!stats) return 0
  const t = stats.driverExperience.totals
  return Math.max(t.requests - t.success, 0)
}

/** True when there is any driver-upload data to chart. */
export function hasDriverData(stats: OcrStats | null | undefined): boolean {
  if (!stats) return false
  return (
    stats.driverExperience.hourly.length > 0 ||
    stats.driverExperience.daily.length > 0 ||
    driverTotal(stats) > 0
  )
}

/** True when at least one driver daily bucket has an e2e latency sample. */
export function hasDriverLatencyData(stats: OcrStats | null | undefined): boolean {
  if (!stats) return false
  return (
    stats.driverExperience.hourly.some((h) => h.latencyAvgMs !== null) ||
    stats.driverExperience.daily.some((d) => d.latencyAvgMs !== null)
  )
}

// ---------------------------------------------------------------------------
// OCR accuracy chart helpers — container-number correctness vs ground truth
// ---------------------------------------------------------------------------

const EXACT_LABEL = 'Chính xác'
const NEAR_LABEL = 'Gần đúng'
const PARTIAL_LABEL = 'Sai chữ'
const MISMATCH_LABEL = 'Sai hoàn toàn'
const ROLLING_ACCURACY_LABEL = 'Độ chính xác'

/** Green for exact match (same as OCR_COLOR). */
export const OCR_ACCURACY_EXACT_COLOR = '#00B14F'
/** Amber for near match (edit distance ≤ 2). */
export const OCR_ACCURACY_NEAR_COLOR = '#F59E0B'
/** Blue for partial match (digits-only). */
export const OCR_ACCURACY_PARTIAL_COLOR = '#0EA5E9'
/** Red for complete mismatch. */
export const OCR_ACCURACY_MISMATCH_COLOR = '#DC2626'
const OCR_ACCURACY_LINE_COLOR = '#1F2937'

/**
 * OCR accuracy breakdown for the admin dashboard.
 * Stacked bars show daily result buckets; the line shows exact-match accuracy
 * over the latest 100 evaluated OCR trip snapshots up to each day.
 */
export function buildDailyOcrAccuracyData(
  daily: OcrAccuracyDailyPoint[],
): ChartData<'bar' | 'line'> {
  return {
    labels: daily.map((d) => d.date.slice(5)), // MM-DD
    datasets: [
      {
        type: 'bar',
        label: EXACT_LABEL,
        data: daily.map((d) => d.exact),
        backgroundColor: `${OCR_ACCURACY_EXACT_COLOR}B3`,
        borderColor: OCR_ACCURACY_EXACT_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'accuracy',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'bar',
        label: NEAR_LABEL,
        data: daily.map((d) => d.near),
        backgroundColor: `${OCR_ACCURACY_NEAR_COLOR}B3`,
        borderColor: OCR_ACCURACY_NEAR_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'accuracy',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'bar',
        label: PARTIAL_LABEL,
        data: daily.map((d) => d.partial),
        backgroundColor: `${OCR_ACCURACY_PARTIAL_COLOR}B3`,
        borderColor: OCR_ACCURACY_PARTIAL_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'accuracy',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'bar',
        label: MISMATCH_LABEL,
        data: daily.map((d) => d.mismatch),
        backgroundColor: `${OCR_ACCURACY_MISMATCH_COLOR}B3`,
        borderColor: OCR_ACCURACY_MISMATCH_COLOR,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'accuracy',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: ROLLING_ACCURACY_LABEL,
        data: daily.map((d) => d.rollingAccuracyPct),
        borderColor: OCR_ACCURACY_LINE_COLOR,
        backgroundColor: OCR_ACCURACY_LINE_COLOR,
        tension: 0.35,
        spanGaps: true,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHitRadius: 10,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: OCR_ACCURACY_LINE_COLOR,
        pointBorderWidth: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: OCR_ACCURACY_LINE_COLOR,
        yAxisID: 'yPct',
        order: 1,
      },
    ],
  }
}

/** True when at least one matched trip has been evaluated for accuracy. */
export function hasAccuracyData(stats: OcrStats | null | undefined): boolean {
  if (!stats) return false
  return (stats.accuracy?.totals.evaluated ?? 0) > 0
}
