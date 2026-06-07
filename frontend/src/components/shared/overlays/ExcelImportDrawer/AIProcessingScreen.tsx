import { Loader2 } from 'lucide-react'
import { AgentAudioVisualizerAura } from '@/components/agents-ui/agent-audio-visualizer-aura'

interface AIProcessingScreenProps {
  fileName?: string
}

export function AIProcessingScreen({ fileName }: AIProcessingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Aura Visualizer */}
      <div className="w-40 h-40 mb-8">
        <AgentAudioVisualizerAura
          size="lg"
          state="thinking"
          color="#1FD5F9"
          colorShift={0.15}
          themeMode="dark"
          className="w-full h-full"
        />
      </div>

      <h3 className="type-h2 mb-3" style={{ color: 'var(--ink)' }}>
        Hệ thống AI đang đọc và trích xuất dữ liệu
      </h3>
      <p className="type-body-sm max-w-md text-center" style={{ color: 'var(--ink-3)' }}>
        Antigravity đang phân tích hàng ngàn dòng dữ liệu từ file <strong style={{ color: 'var(--ink)' }}>{fileName}</strong>. Quá trình này được tối ưu hoá cực kỳ nhanh và chuẩn xác.
      </p>

      <div className="mt-8 flex items-center gap-3 px-5 py-2.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Đang quét cấu trúc cột...</span>
      </div>
    </div>
  )
}
