import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
    suggestion: 'Kiểm tra alias địa điểm',
    suggestionDetail: 'HAIAN, HPH, Hai Phong...',
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

function severityColor(pct: number): { text: string; bg: string } {
  if (pct > 50) return { text: '#dc2626', bg: 'color-mix(in srgb, #dc2626 10%, transparent)' }
  if (pct > 10) return { text: '#d97706', bg: 'color-mix(in srgb, #d97706 10%, transparent)' }
  return { text: 'var(--theme-text-muted)', bg: 'var(--theme-bg-tertiary)' }
}

export function NoMatchEmptyState({ scanned, reasons, onClose }: NoMatchEmptyStateProps) {
  const navigate = useNavigate()

  const topReason = reasons[0]?.code

  const isLocationTop = topReason === 'location_mismatch'
  const isDateTop = topReason === 'date_mismatch'

  const enrichedReasons = useMemo(() => {
    if (scanned === 0) return []
    return reasons
      .map(r => ({ ...r, pct: Math.round((r.count / scanned) * 100) }))
      .sort((a, b) => b.count - a.count)
  }, [reasons, scanned])

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
        { icon: MapPin, text: 'Kiểm tra alias địa điểm' },
        { icon: Calendar, text: 'Bổ sung ngày đi cho phiếu thiếu thông tin' },
      )
    }
    return result
  }, [enrichedReasons])

  const primaryLabel = isDateTop ? 'Kiểm tra ngày đi' : 'Quản lý địa điểm'
  const primaryAction = isDateTop
    ? () => onClose()
    : () => { onClose(); navigate('/accountant/settings/locations') }

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
        <img
          src="/src/assets/illustrations/no-match-empty-state.svg"
          alt=""
          width={120}
          height={120}
          className="pointer-events-none"
        />
      </div>

      {/* Title + subtitle */}
      <div className="text-center space-y-1">
        <p className="text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          Không tìm thấy cặp ghép phù hợp
        </p>
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Hệ thống đã quét {scanned} phiếu chờ ghép nhưng chưa tìm được cặp khớp.
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
            const sev = severityColor(r.pct)
            return (
              <div key={r.code} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: sev.text }} />
                <span className="text-xs font-semibold tabular-nums" style={{ color: sev.text }}>
                  {r.count}
                </span>
                <span className="text-xs flex-1" style={{ color: 'var(--theme-text-primary)' }}>
                  {r.label}
                </span>
                <span
                  className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
                  style={{ background: sev.bg, color: sev.text }}
                >
                  {r.pct}%
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
