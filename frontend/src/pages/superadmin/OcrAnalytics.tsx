import { ScanText } from 'lucide-react'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { OcrTotalChart } from '@/components/shared/data-display/OcrTotalChart/OcrTotalChart'
import { OcrLatencyChart } from '@/components/shared/data-display/OcrLatencyChart/OcrLatencyChart'

/**
 * OCR analytics detail page. Total-only — counts every OCR request across all
 * providers (Gemini, MiniMax, OpenRouter, …) as one model-agnostic series, with
 * a companion latency chart (avg + p95).
 */
export function OcrAnalytics() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Thống kê OCR"
        subtitle="Số lượt và độ trễ nhận dạng số cont"
        lucideIcon={ScanText}
      />
      <OcrTotalChart days={30} />
      <OcrLatencyChart days={30} />
    </div>
  )
}
