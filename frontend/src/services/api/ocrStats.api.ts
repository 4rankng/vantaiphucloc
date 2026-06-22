import { api } from './client'
import { safeRequest, toCamel } from '@/lib/safe-request'
import type { ApiResponse } from '@/data/domain'

export interface OcrDailyPoint {
  date: string // YYYY-MM-DD
  minimax: number
  gemini: number
}

export interface OcrMonthlyPoint {
  month: string // YYYY-MM
  minimax: number
  gemini: number
}

export interface OcrProviderTotal {
  total: number
  success: number
}

export interface OcrStats {
  days: number
  endDate: string
  daily: OcrDailyPoint[]
  monthly: OcrMonthlyPoint[]
  totals: {
    minimax: OcrProviderTotal
    gemini: OcrProviderTotal
  }
}

export function getOcrStats(days = 30): Promise<ApiResponse<OcrStats>> {
  return safeRequest(
    () => api.get('/dashboard/ocr-stats', { params: { days } }),
    (res) => toCamel<OcrStats>(res.data),
  )
}
