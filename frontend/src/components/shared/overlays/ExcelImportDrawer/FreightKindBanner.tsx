import { AlertTriangle } from 'lucide-react'

interface FreightKindBannerProps {
  unresolvedCount: number
  onResolveAll: (kind: 'E' | 'F') => void
}

export function FreightKindBanner({ unresolvedCount, onResolveAll }: FreightKindBannerProps) {
  return (
    <div
      className="flex items-start gap-2.5 px-3.5 py-3 mb-3"
      style={{
        background: 'var(--warning-soft)',
        border: '1px solid var(--warning)',
        borderRadius: 'var(--r-sm)',
      }}
    >
      <AlertTriangle
        className="h-4 w-4 mt-0.5 flex-shrink-0"
        style={{ color: 'var(--warning)' }}
      />
      <div className="flex-1 min-w-0">
        <div style={{ color: 'var(--warning)' }} className="text-[13px]">
          <strong>{unresolvedCount}</strong> dòng cần xác định loại container (E/F) trước khi lưu. Vui lòng chọn E hoặc F trong cột &quot;Loại Cont&quot;.
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => onResolveAll('E')}
            className="px-2.5 py-1 rounded text-[12px] font-semibold transition-colors"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--warning)',
              color: 'var(--warning)',
            }}
          >
            Chọn tất cả E
          </button>
          <button
            type="button"
            onClick={() => onResolveAll('F')}
            className="px-2.5 py-1 rounded text-[12px] font-semibold transition-colors"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--warning)',
              color: 'var(--warning)',
            }}
          >
            Chọn tất cả F
          </button>
        </div>
      </div>
    </div>
  )
}
