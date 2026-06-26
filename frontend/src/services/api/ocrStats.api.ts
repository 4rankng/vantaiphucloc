import { api } from './client'
import { safeRequest, toCamel } from '@/lib/safe-request'
import type { ApiResponse } from '@/data/domain'

/**
 * OCR analytics is model-agnostic: a single "total" series counts every OCR
 * request regardless of which provider (Gemini, MiniMax, OpenRouter, …)
 * served it. There is no per-provider split.
 */
export interface OcrDailyPoint {
  date: string // YYYY-MM-DD
  total: number
}

export interface OcrMonthlyPoint {
  month: string // YYYY-MM
  total: number
}

export interface OcrStats {
  days: number
  endDate: string
  daily: OcrDailyPoint[]
  monthly: OcrMonthlyPoint[]
  totals: {
    total: number
    success: number
  }
}

export function getOcrStats(days = 30): Promise<ApiResponse<OcrStats>> {
  return safeRequest(
    () => api.get('/dashboard/ocr-stats', { params: { days } }),
    (res) => toCamel<OcrStats>(res.data),
  )
}
