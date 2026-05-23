import { memo, useMemo } from 'react'
import { Users, Briefcase, SlidersHorizontal } from 'lucide-react'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { WORK_TYPE_LABELS } from '@/data/domain'
import type { WorkType } from '@/data/domain'

interface RoutePricingFiltersProps {
  clientId: number | undefined
  onClientChange: (id: number | undefined) => void
  workType: string | undefined
  onWorkTypeChange: (t: string | undefined) => void
  clients: Array<{ id: number; name: string; code?: string | null }>
}

export const RoutePricingFilters = memo(function RoutePricingFilters({
  clientId,
  onClientChange,
  workType,
  onWorkTypeChange,
  clients,
}: RoutePricingFiltersProps) {
  const activeCount = [clientId, workType].filter(Boolean).length

  const clientOptions = useMemo(
    () => [
      { value: 'all', label: 'Tất cả chủ hàng' },
      ...clients.map((c) => ({ value: c.id.toString(), label: c.code ? `${c.code} – ${c.name}` : c.name })),
    ],
    [clients],
  )

  const workTypeOptions = useMemo(
    () => [
      { value: 'all', label: 'Tất cả tác nghiệp' },
      ...(Object.entries(WORK_TYPE_LABELS) as [WorkType, string][])
        .filter(([key]) => !['E20', 'E40', 'F20', 'F40'].includes(key))
        .map(([key, label]) => ({ value: key, label })),
    ],
    [],
  )

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 mr-1" style={{ color: 'var(--ink-3)' }}>
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wider">Lọc</span>
        {activeCount > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full text-xs font-bold tabular-nums"
            style={{
              width: 18,
              height: 18,
              background: 'var(--theme-brand-primary)',
              color: '#fff',
              fontSize: 10,
            }}
          >
            {activeCount}
          </span>
        )}
      </div>

      {/* Chủ hàng filter */}
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--ink-4)' }} />
        <InlineSelect
          placeholder="Tất cả chủ hàng"
          value={clientId?.toString() ?? 'all'}
          options={clientOptions}
          onChange={(v) => onClientChange(v === 'all' ? undefined : Number(v))}
          style={{
            width: 200,
            height: 32,
            fontSize: 12,
            borderColor: clientId ? 'var(--theme-brand-primary)' : undefined,
            boxShadow: clientId
              ? '0 0 0 2px color-mix(in srgb, var(--theme-brand-primary) 20%, transparent)'
              : undefined,
          }}
        />
      </div>

      {/* Tác nghiệp filter */}
      <div className="flex items-center gap-1.5">
        <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--ink-4)' }} />
        <InlineSelect
          placeholder="Tất cả tác nghiệp"
          value={workType ?? 'all'}
          options={workTypeOptions}
          onChange={(v) => onWorkTypeChange(v === 'all' ? undefined : v)}
          style={{
            width: 200,
            height: 32,
            fontSize: 12,
            borderColor: workType ? 'var(--theme-brand-primary)' : undefined,
            boxShadow: workType
              ? '0 0 0 2px color-mix(in srgb, var(--theme-brand-primary) 20%, transparent)'
              : undefined,
          }}
        />
      </div>

      {/* Clear button */}
      {activeCount > 0 && (
        <button
          className="ml-auto text-xs font-medium transition-colors"
          style={{ color: 'var(--ink-3)' }}
          onClick={() => {
            onClientChange(undefined)
            onWorkTypeChange(undefined)
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-1)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)')}
        >
          Xoá lọc
        </button>
      )}
    </div>
  )
})
