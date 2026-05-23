import { memo } from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui'
import { WORK_TYPE_LABELS } from '@/data/domain'
import type { WorkType } from '@/data/domain'

interface RoutePricingFiltersProps {
  clientId: number | undefined
  onClientChange: (id: number | undefined) => void
  operationType: string | undefined
  onOperationTypeChange: (t: string | undefined) => void
  clients: Array<{ id: number; name: string; code?: string | null }>
}

export const RoutePricingFilters = memo(function RoutePricingFilters({
  clientId,
  onClientChange,
  operationType,
  onOperationTypeChange,
  clients,
}: RoutePricingFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={clientId?.toString() ?? 'all'}
        onValueChange={(v) => onClientChange(v === 'all' ? undefined : Number(v))}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Tất cả chủ hàng" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả chủ hàng</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id.toString()}>
              {c.code ? `${c.code} - ${c.name}` : c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={operationType ?? 'all'}
        onValueChange={(v) => onOperationTypeChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Tất cả tác nghiệp" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả tác nghiệp</SelectItem>
          {(Object.entries(WORK_TYPE_LABELS) as [WorkType, string][]).filter(([key]) => !['E20','E40','F20','F40'].includes(key)).map(
            ([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  )
})
