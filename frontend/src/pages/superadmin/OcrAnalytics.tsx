import { ScanText } from 'lucide-react'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { OcrTotalChart } from '@/components/shared/data-display/OcrTotalChart/OcrTotalChart'

/**
 * OCR analytics detail page. Total-only — counts every OCR request across all
 * providers (Gemini, MiniMax, OpenRouter, …) as one model-agnostic series.
 */
export function OcrAnalytics() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Thống kê OCR"
        subtitle="Số lượt nhận dạng số cont"
        lucideIcon={ScanText}
      />
      <OcrTotalChart days={30} />
    </div>
  )
}
