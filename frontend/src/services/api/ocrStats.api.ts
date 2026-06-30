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
  success: number
  failed: number
  /** Average latency in milliseconds; null when no samples in this day. */
  latencyAvgMs: number | null
  /** 95th-percentile latency in milliseconds; null when no samples. */
  latencyP95Ms: number | null
}

export interface OcrMonthlyPoint {
  month: string // YYYY-MM
  total: number
  success: number
  failed: number
  /** Weighted average latency in milliseconds; null when no qualifying days. */
  latencyAvgMs: number | null
}

export interface OcrErrorBucket {
  category: string
  label: string
  statusCode: number | null
  total: number
  action: string
  sampleError: string | null
}

/**
 * Driver-experience grain: ONE data point per photo upload (the human OCR
 * action), distinct from the per-provider-call `daily`/`monthly` series above.
 * `requests` is the number of times a driver uploaded a photo (not the number
 * of provider LLM calls); `latencyAvgMs`/`latencyP95Ms` are the end-to-end
 * time the driver perceived (upload → numbers returned). Latency fields are
 * superadmin-only — null for other roles; counts are returned to every role.
 */
export interface OcrDriverDailyPoint {
  date: string // YYYY-MM-DD
  requests: number
  success: number
  failed: number
  latencyAvgMs: number | null
  latencyP95Ms: number | null
}

export interface OcrDriverMonthlyPoint {
  month: string // YYYY-MM
  requests: number
  success: number
  failed: number
  latencyAvgMs: number | null
}

export interface OcrDriverExperience {
  daily: OcrDriverDailyPoint[]
  monthly: OcrDriverMonthlyPoint[]
  totals: {
    requests: number
    success: number
    latencyAvgMs: number | null
    latencyP95Ms: number | null
  }
}

export interface OcrAccuracyDailyPoint {
  date: string
  evaluated: number
  exact: number
  near: number
  partial: number
  mismatch: number
  /** Accuracy percentage (exact / evaluated); null when evaluated == 0. */
  accuracyPct: number | null
  /** Accuracy over the latest 500 evaluated OCR trip snapshots up to this day. */
  rollingAccuracyPct: number | null
}

export interface OcrAccuracy {
  totals: {
    evaluated: number
    exact: number
    near: number
    partial: number
    mismatch: number
    /** exact / evaluated × 100; null when no data. */
    accuracyPct: number | null
    /** (exact + near + partial) / evaluated × 100; null when no data. */
    acceptedPct: number | null
  }
  daily: OcrAccuracyDailyPoint[]
}

export interface OcrStats {
  days: number
  endDate: string
  daily: OcrDailyPoint[]
  monthly: OcrMonthlyPoint[]
  providerErrors: OcrErrorBucket[]
  /** Per-provider-call analytics (volume, provider latency, error/429 breakdown). */
  totals: {
    total: number
    success: number
    latencyAvgMs: number | null
    latencyP95Ms: number | null
  }
  /** Per-photo-upload analytics (upload count + driver-perceived e2e latency). */
  driverExperience: OcrDriverExperience
  /** OCR accuracy — compares driver-submitted container number vs matched ground truth. */
  accuracy: OcrAccuracy
}

export function getOcrStats(days = 30): Promise<ApiResponse<OcrStats>> {
  return safeRequest(
    () => api.get('/dashboard/ocr-stats', { params: { days } }),
    (res) => toCamel<OcrStats>(res.data),
  )
}
