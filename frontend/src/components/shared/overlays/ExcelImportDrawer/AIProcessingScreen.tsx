import { Bot, Sparkles, Loader2 } from 'lucide-react'

interface AIProcessingScreenProps {
  fileName?: string
}

export function AIProcessingScreen({ fileName }: AIProcessingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <style>{`
        @keyframes bot-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes radar-scan {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; filter: blur(20px); }
          50% { opacity: 1; filter: blur(30px); }
        }
      `}</style>

      <div className="relative w-32 h-32 flex items-center justify-center mb-8">
        {/* Glowing aura */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'var(--accent)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
        {/* Radar rings */}
        <div
          className="absolute inset-0 rounded-full border-2"
          style={{
            borderColor: 'var(--accent)',
            animation: 'radar-scan 1.5s cubic-bezier(0.0, 0.2, 0.8, 1) infinite',
          }}
        />
        <div
          className="absolute inset-0 rounded-full border-2"
          style={{
            borderColor: 'var(--accent)',
            animation: 'radar-scan 1.5s cubic-bezier(0.0, 0.2, 0.8, 1) infinite',
            animationDelay: '0.75s',
          }}
        />
        {/* Center AI Bot icon */}
        <div
          className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-xl"
          style={{
            background: 'var(--surface)',
            border: '4px solid var(--accent)',
            animation: 'bot-float 3s ease-in-out infinite',
          }}
        >
          <Bot className="h-10 w-10" style={{ color: 'var(--accent)' }} />
          <Sparkles
            className="absolute top-1 right-2 h-5 w-5 animate-pulse"
            style={{ color: '#FCD34D' }}
          />
        </div>
      </div>

      <h3 className="text-xl font-bold mb-3 tracking-tight" style={{ color: 'var(--ink)' }}>
        Hệ thống AI đang đọc và trích xuất dữ liệu
      </h3>
      <p className="text-sm max-w-md text-center" style={{ color: 'var(--ink-3)' }}>
        Antigravity đang phân tích hàng ngàn dòng dữ liệu từ file <strong style={{ color: 'var(--ink)' }}>{fileName}</strong>. Quá trình này được tối ưu hoá cực kỳ nhanh và chuẩn xác.
      </p>

      <div className="mt-8 flex items-center gap-3 px-5 py-2.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Đang quét cấu trúc cột...</span>
      </div>
    </div>
  )
}
