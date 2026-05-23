import { memo, useCallback } from 'react'
import { Pencil, Trash2, ArrowRight, MapPin } from 'lucide-react'
import { compactCurrency, WORK_TYPE_LABELS } from '@/data/domain'
import type { RoutePricing, WorkType } from '@/data/domain'

interface RoutePricingTableProps {
  data: RoutePricing[]
  isLoading: boolean
  onEdit: (rp: RoutePricing) => void
  onDelete: (id: number) => void
}

// ─── Color map for operation type badges ─────────────────────────────────────
const OP_BADGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'NHẬP HÀNG':        { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'XUẤT HÀNG':        { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  'CHẠY SÀ LAN':      { bg: '#faf5ff', text: '#7e22ce', dot: '#a855f7' },
  'CHUYỂN BÃI':       { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  'ĐÓNG KHO':         { bg: '#fefce8', text: '#a16207', dot: '#eab308' },
  'LẤY VỎ HẠ HÀNG':  { bg: '#f0fdfa', text: '#0f766e', dot: '#14b8a6' },
  'XUẤT/NHẬP TÀU':    { bg: '#eef2ff', text: '#4338ca', dot: '#6366f1' },
}
const DEFAULT_BADGE = { bg: '#f4f4f5', text: '#52525b', dot: '#a1a1aa' }

function OpBadge({ type }: { type: string }) {
  const label = WORK_TYPE_LABELS[type as WorkType] ?? type
  const colors = OP_BADGE_COLORS[type] ?? DEFAULT_BADGE
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: colors.bg, color: colors.text }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 6, height: 6, background: colors.dot, flexShrink: 0 }}
      />
      {label}
    </span>
  )
}

function PriceCell({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span
        className="font-mono-num text-xs"
        style={{ color: 'var(--ink-4)', letterSpacing: '0.05em' }}
      >
        —
      </span>
    )
  }
  return (
    <span className="font-mono-num text-xs tabular-nums" style={{ color: 'var(--ink-1)' }}>
      {compactCurrency(value)}
    </span>
  )
}

// ─── Empty state SVG ─────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <svg
        width="140"
        height="100"
        viewBox="0 0 140 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-5 opacity-60"
        aria-hidden="true"
      >
        {/* Road */}
        <rect x="10" y="52" width="120" height="22" rx="4" fill="#e4e4e7" />
        {/* Dashed centre line */}
        <rect x="20" y="62" width="14" height="3" rx="1.5" fill="#a1a1aa" />
        <rect x="44" y="62" width="14" height="3" rx="1.5" fill="#a1a1aa" />
        <rect x="68" y="62" width="14" height="3" rx="1.5" fill="#a1a1aa" />
        <rect x="92" y="62" width="14" height="3" rx="1.5" fill="#a1a1aa" />
        <rect x="116" y="62" width="10" height="3" rx="1.5" fill="#a1a1aa" />
        {/* Truck silhouette */}
        <rect x="22" y="34" width="38" height="20" rx="4" fill="#d1d5db" />
        <rect x="54" y="39" width="12" height="15" rx="3" fill="#e4e4e7" />
        <circle cx="32" cy="55" r="6" fill="#9ca3af" />
        <circle cx="32" cy="55" r="3" fill="#d1d5db" />
        <circle cx="50" cy="55" r="6" fill="#9ca3af" />
        <circle cx="50" cy="55" r="3" fill="#d1d5db" />
        <circle cx="60" cy="55" r="6" fill="#9ca3af" />
        <circle cx="60" cy="55" r="3" fill="#d1d5db" />
        {/* Pin A */}
        <circle cx="16" cy="36" r="8" fill="#bbf7d0" />
        <circle cx="16" cy="36" r="4" fill="#16a34a" />
        <line x1="16" y1="44" x2="16" y2="52" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
        {/* Pin B */}
        <circle cx="124" cy="36" r="8" fill="#fed7aa" />
        <circle cx="124" cy="36" r="4" fill="#ea580c" />
        <line x1="124" y1="44" x2="124" y2="52" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
        {/* Arrow */}
        <path d="M82 35 L96 35" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
        <path d="M92 31 L96 35 L92 39" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Question marks */}
        <text x="74" y="21" fontFamily="system-ui" fontSize="12" fill="#d1d5db" textAnchor="middle">?</text>
        <text x="86" y="15" fontFamily="system-ui" fontSize="9" fill="#e4e4e7" textAnchor="middle">?</text>
      </svg>

      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>
        Chưa có cước tuyến nào
      </p>
      <p className="text-xs text-center max-w-xs" style={{ color: 'var(--ink-4)' }}>
        Thêm cước tuyến mới hoặc nhập từ file Excel để bắt đầu quản lý bảng giá.
      </p>
    </div>
  )
}

// ─── Loading skeleton ────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
    >
      {/* Fake header */}
      <div
        className="px-4 py-3 flex gap-4 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
      >
        {[28, 100, 80, 80, 60, 60, 60, 60, 80, 50].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded animate-pulse"
            style={{ width: w, background: 'var(--surface-3)', flexShrink: 0 }}
          />
        ))}
      </div>
      <div className="p-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-11 rounded-lg animate-pulse"
            style={{
              background: 'var(--surface-3)',
              opacity: 1 - i * 0.12,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export const RoutePricingTable = memo(function RoutePricingTable({
  data,
  isLoading,
  onEdit,
  onDelete,
}: RoutePricingTableProps) {
  const handleEdit = useCallback((rp: RoutePricing) => () => onEdit(rp), [onEdit])
  const handleDelete = useCallback((id: number) => () => onDelete(id), [onDelete])

  if (isLoading) return <LoadingSkeleton />
  if (!data.length) return <EmptyState />

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
    >
      {/* Count strip */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
          {data.length} tuyến
        </span>
        <div className="flex gap-3 text-xs" style={{ color: 'var(--ink-4)' }}>
          <span>F = Full cont</span>
          <span>E = Empty cont</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-xs font-semibold uppercase tracking-wider select-none"
              style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--border)' }}
            >
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3 min-w-[120px]">Chủ hàng</th>
              <th className="px-4 py-3 min-w-[220px]">Tuyến đường</th>
              {/* Grouped container price headers */}
              <th
                colSpan={2}
                className="px-4 py-2 text-center text-xs"
                style={{
                  borderLeft: '1px solid var(--border)',
                  background: 'color-mix(in srgb, #3b82f6 6%, transparent)',
                  color: '#1d4ed8',
                }}
              >
                Full cont
              </th>
              <th
                colSpan={2}
                className="px-4 py-2 text-center text-xs"
                style={{
                  borderLeft: '1px solid var(--border)',
                  background: 'color-mix(in srgb, #6366f1 6%, transparent)',
                  color: '#4338ca',
                }}
              >
                Empty cont
              </th>
              <th className="px-4 py-3 min-w-[130px]">Tác nghiệp</th>
              <th className="px-4 py-3 w-[80px] text-right">Thao tác</th>
            </tr>
            {/* Sub-header row for F20 / F40 / E20 / E40 */}
            <tr
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--ink-4)', borderBottom: '2px solid var(--border)' }}
            >
              <th className="px-4 pb-2" />
              <th className="px-4 pb-2" />
              <th className="px-4 pb-2" />
              <th
                className="px-4 pb-2 text-right"
                style={{
                  borderLeft: '1px solid var(--border)',
                  background: 'color-mix(in srgb, #3b82f6 4%, transparent)',
                  color: '#3b82f6',
                }}
              >
                20'
              </th>
              <th
                className="px-4 pb-2 text-right"
                style={{
                  background: 'color-mix(in srgb, #3b82f6 4%, transparent)',
                  color: '#3b82f6',
                }}
              >
                40'
              </th>
              <th
                className="px-4 pb-2 text-right"
                style={{
                  borderLeft: '1px solid var(--border)',
                  background: 'color-mix(in srgb, #6366f1 4%, transparent)',
                  color: '#6366f1',
                }}
              >
                20'
              </th>
              <th
                className="px-4 pb-2 text-right"
                style={{
                  background: 'color-mix(in srgb, #6366f1 4%, transparent)',
                  color: '#6366f1',
                }}
              >
                40'
              </th>
              <th className="px-4 pb-2" />
              <th className="px-4 pb-2" />
            </tr>
          </thead>

          <tbody>
            {data.map((rp, idx) => (
              <tr
                key={rp.id}
                className="group transition-colors"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: idx % 2 === 1
                    ? 'color-mix(in srgb, var(--surface-3) 40%, transparent)'
                    : 'transparent',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLTableRowElement).style.background =
                    'color-mix(in srgb, var(--theme-brand-primary) 5%, transparent)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLTableRowElement).style.background =
                    idx % 2 === 1
                      ? 'color-mix(in srgb, var(--surface-3) 40%, transparent)'
                      : 'transparent'
                }}
              >
                {/* # */}
                <td
                  className="px-4 py-3 text-xs tabular-nums font-mono-num"
                  style={{ color: 'var(--ink-4)' }}
                >
                  {idx + 1}
                </td>

                {/* Chủ hàng */}
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
                      color: 'var(--theme-brand-primary)',
                    }}
                  >
                    {rp.client.name}
                  </span>
                </td>

                {/* Tuyến đường — combined pickup → dropoff */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium truncate max-w-[90px]"
                      style={{ color: 'var(--ink-1)' }}
                    >
                      <MapPin className="h-3 w-3 shrink-0" style={{ color: '#16a34a' }} />
                      {rp.pickupLocation.name}
                    </span>
                    <ArrowRight
                      className="h-3 w-3 shrink-0"
                      style={{ color: 'var(--ink-4)' }}
                    />
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium truncate max-w-[90px]"
                      style={{ color: 'var(--ink-1)' }}
                    >
                      <MapPin className="h-3 w-3 shrink-0" style={{ color: '#ea580c' }} />
                      {rp.dropoffLocation.name}
                    </span>
                  </div>
                </td>

                {/* F20 */}
                <td
                  className="px-4 py-3 text-right"
                  style={{ borderLeft: '1px solid var(--border)' }}
                >
                  <PriceCell value={rp.f20Price} />
                </td>
                {/* F40 */}
                <td className="px-4 py-3 text-right">
                  <PriceCell value={rp.f40Price} />
                </td>

                {/* E20 */}
                <td
                  className="px-4 py-3 text-right"
                  style={{ borderLeft: '1px solid var(--border)' }}
                >
                  <PriceCell value={rp.e20Price} />
                </td>
                {/* E40 */}
                <td className="px-4 py-3 text-right">
                  <PriceCell value={rp.e40Price} />
                </td>

                {/* Tác nghiệp */}
                <td className="px-4 py-3">
                  <OpBadge type={rp.workType} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={handleEdit(rp)}
                      title="Sửa"
                      className="p-1.5 rounded-md transition-colors"
                      style={{ color: 'var(--ink-3)' }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.background =
                          'color-mix(in srgb, #3b82f6 12%, transparent)'
                        ;(e.currentTarget as HTMLButtonElement).style.color = '#1d4ed8'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)'
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleDelete(rp.id)}
                      title="Xoá"
                      className="p-1.5 rounded-md transition-colors"
                      style={{ color: 'var(--ink-3)' }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.background =
                          'color-mix(in srgb, #ef4444 12%, transparent)'
                        ;(e.currentTarget as HTMLButtonElement).style.color = '#dc2626'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)'
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})
