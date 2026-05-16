import { useMemo } from 'react'
import { MapPin, Calendar, Users, Box, X } from 'lucide-react'
import { Button } from '@/components/ui'
import type { AutoMatchRejectionReasonFE } from '@/services/api/tripOrders.api'

interface NoMatchEmptyStateProps {
  scanned: number
  reasons: AutoMatchRejectionReasonFE[]
  onClose: () => void
}

const REASON_META: Record<string, { icon: React.ElementType; suggestion: string; suggestionDetail?: string }> = {
  location_mismatch: {
    icon: MapPin,
    suggestion: 'Kiểm tra bí danh địa điểm',
    suggestionDetail: 'HAIAN, HPH, Hải Phòng...',
  },
  date_mismatch: {
    icon: Calendar,
    suggestion: 'Bổ sung ngày đi cho phiếu thiếu thông tin',
  },
  client_mismatch: {
    icon: Users,
    suggestion: 'Kiểm tra tên khách hàng trên phiếu',
  },
  container_mismatch: {
    icon: Box,
    suggestion: 'Kiểm tra số container trên phiếu',
  },
}

export function NoMatchEmptyState({ scanned, reasons, onClose }: NoMatchEmptyStateProps) {
  const sortedReasons = useMemo(() =>
    [...reasons].sort((a, b) => b.count - a.count),
    [reasons],
  )

  const topReason = sortedReasons[0]?.code

  const isDateTop = topReason === 'date_mismatch'

  const enrichedReasons = useMemo(() => sortedReasons, [sortedReasons])

  const suggestions = useMemo(() => {
    if (enrichedReasons.length === 0) return []
    const seen = new Set<string>()
    const result: { icon: React.ElementType; text: string; detail?: string }[] = []
    for (const r of enrichedReasons) {
      const meta = REASON_META[r.code]
      if (meta && !seen.has(r.code)) {
        seen.add(r.code)
        result.push({ icon: meta.icon, text: meta.suggestion, detail: meta.suggestionDetail })
      }
    }
    if (result.length === 0) {
      result.push(
        { icon: MapPin, text: 'Kiểm tra bí danh địa điểm' },
        { icon: Calendar, text: 'Bổ sung ngày đi cho phiếu thiếu thông tin' },
      )
    }
    return result
  }, [enrichedReasons])

  const primaryLabel = isDateTop ? 'Kiểm tra ngày đi' : 'Quản lý địa điểm'
  const primaryAction = isDateTop
    ? () => onClose()
    : () => onClose()

  return (
    <div className="space-y-4">
      {/* Close button — top right */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
        aria-label="Đóng"
      >
        <X className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
      </button>

      {/* Illustration */}
      <div className="flex justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="pointer-events-none">
          {/* Background circle */}
          <circle cx="60" cy="60" r="52" fill="#F0FDF4" />
          {/* Document left */}
          <rect x="18" y="32" width="34" height="44" rx="5" fill="#FFFFFF" stroke="#D1FAE5" strokeWidth="1.5" />
          <rect x="24" y="42" width="22" height="2.5" rx="1.25" fill="#A7F3D0" />
          <rect x="24" y="49" width="16" height="2.5" rx="1.25" fill="#A7F3D0" />
          <rect x="24" y="56" width="20" height="2.5" rx="1.25" fill="#A7F3D0" />
          {/* Document right */}
          <rect x="68" y="32" width="34" height="44" rx="5" fill="#FFFFFF" stroke="#D1FAE5" strokeWidth="1.5" />
          <rect x="74" y="42" width="22" height="2.5" rx="1.25" fill="#A7F3D0" />
          <rect x="74" y="49" width="16" height="2.5" rx="1.25" fill="#A7F3D0" />
          <rect x="74" y="56" width="20" height="2.5" rx="1.25" fill="#A7F3D0" />
          {/* X / no-match indicator in center */}
          <circle cx="60" cy="54" r="12" fill="#FEE2E2" />
          <line x1="54.5" y1="48.5" x2="65.5" y2="59.5" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="65.5" y1="48.5" x2="54.5" y2="59.5" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          {/* Dashed connector lines */}
          <line x1="52" y1="54" x2="36" y2="54" stroke="#A7F3D0" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
          <line x1="68" y1="54" x2="84" y2="54" stroke="#A7F3D0" strokeWidth="1.5" strokeDasharray="3 2" strokeLinecap="round" />
          {/* Small sparkle top-right */}
          <path d="M93 28 L94.5 32 L98 33.5 L94.5 35 L93 39 L91.5 35 L88 33.5 L91.5 32 Z" fill="#6EE7B7" />
        </svg>
      </div>

      {/* Title + subtitle */}
      <div className="text-center space-y-1">
        <p className="text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          Không tìm thấy cặp ghép phù hợp
        </p>
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Không tìm thấy chuyến phù hợp với {scanned} phiếu chờ ghép.
        </p>
      </div>

      {/* Breakdown card */}
      {enrichedReasons.length > 0 && (
        <div
          className="rounded-xl border p-3 space-y-2"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg-tertiary)' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
            Lý do chính
          </p>
          {enrichedReasons.map(r => {
            const meta = REASON_META[r.code]
            const Icon = meta?.icon ?? Box
            return (
              <div key={r.code} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                  {r.count}
                </span>
                <span className="text-xs flex-1" style={{ color: 'var(--theme-text-primary)' }}>
                  {r.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Suggestion card */}
      {suggestions.length > 0 && (
        <div
          className="rounded-xl border p-3 space-y-2"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg-tertiary)' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
            Gợi ý xử lý
          </p>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <s.icon className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'var(--theme-brand-primary)' }} />
              <div className="min-w-0">
                <p className="text-xs" style={{ color: 'var(--theme-text-primary)' }}>{s.text}</p>
                {s.detail && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{s.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={primaryAction}
          className="flex-1 h-9 text-sm font-semibold rounded-xl"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-theme-on-brand, #fff)' }}
        >
          {primaryLabel}
        </Button>
        <Button
          onClick={onClose}
          className="flex-1 h-9 text-sm font-semibold rounded-xl"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
        >
          Đóng
        </Button>
      </div>
    </div>
  )
}
