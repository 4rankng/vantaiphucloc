import { api } from './client'
import { safeRequest, toCamel } from '@/lib/safe-request'
import type { ApiResponse } from '@/data/domain'

/**
 * OCR analytics is model-agnostic: a single "total" series counts every OCR
 * request regardless of which provider (Gemini, MiniMax, OpenRouter, …)
 * served it. There is no per-provider split.
 *
 * Latency fields are populated only for buckets with enough samples to be
 * meaningful; otherwise they are null. The backend hides sub-min-sample
 * buckets so a single slow request does not skew an otherwise quiet day.
 */
export interface OcrDailyPoint {
  date: string // YYYY-MM-DD
  total: number
  /** Average latency in milliseconds; null when no samples in this day. */
  latencyAvgMs: number | null
  /** 95th-percentile latency in milliseconds; null when no samples. */
  latencyP95Ms: number | null
}

export interface OcrMonthlyPoint {
  month: string // YYYY-MM
  total: number
  /** Weighted average latency in milliseconds; null when no qualifying days. */
  latencyAvgMs: number | null
}

export interface OcrStats {
  days: number
  endDate: string
  daily: OcrDailyPoint[]
  monthly: OcrMonthlyPoint[]
  totals: {
    total: number
    success: number
    latencyAvgMs: number | null
    latencyP95Ms: number | null
  }
}

export function getOcrStats(days = 30): Promise<ApiResponse<OcrStats>> {
  return safeRequest(
    () => api.get('/dashboard/ocr-stats', { params: { days } }),
    (res) => toCamel<OcrStats>(res.data),
  )
}
