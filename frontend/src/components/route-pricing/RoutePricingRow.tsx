import { Trash2 } from 'lucide-react'
import type { RoutePricing } from '@/data/domain'
import { OpBadge, PriceCell } from './RoutePricingCells'
import { COL, FARE_TINT, FARE_BORDER, PRICE_FIELDS, SALARY_TINT, SALARY_BORDER } from './RoutePricingTable.constants'
import type { FocusableField } from './RoutePricingTable.types'
import type { PriceField } from './RoutePricingTable.constants'

export function RoutePricingRow({ rp, idx, onEdit, onDelete, hideClient, priceFields }: {
  rp: RoutePricing
  idx: number
  onEdit: (field: FocusableField) => void
  onDelete: () => void
  hideClient?: boolean
  priceFields?: PriceField[]
}) {
  const cell = (field: FocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }
  const visiblePriceFields = priceFields ?? PRICE_FIELDS
  const isSalaryField = (field: PriceField) => field.endsWith('DriverSalary')
  const isFareField = (field: PriceField) => !isSalaryField(field)

  return (
    <tr className="cursor-pointer group">
      <td className="relative" style={{ width: COL.index }}>
        <span className="group-hover:opacity-0 transition-opacity duration-100 flex items-center justify-center font-mono text-[12px]" style={{ color: 'var(--theme-text-muted)' }}>
          {idx + 1}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-100 text-red-500 hover:text-red-700"
          title="Xoá"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>

      {!hideClient && (
        <td onClick={cell('clientId')} style={{ overflow: 'hidden' }}>
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--theme-text-primary) 7%, transparent)',
              color: 'var(--theme-text-primary)',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
            }}
            title={rp.client.name}
          >
            {rp.client.name}
          </span>
        </td>
      )}

      <td onClick={cell('pickupLocationId')} style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>
          {rp.pickupLocation.name}
        </span>
      </td>
      <td onClick={cell('dropoffLocationId')} style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.3' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>
          {rp.dropoffLocation.name}
        </span>
      </td>

      {visiblePriceFields.map((field, fieldIdx) => {
        const isSalary = isSalaryField(field)
        const isFare = isFareField(field)
        return (
          <td
            key={field}
            style={{
              textAlign: 'right',
              background: isSalary ? SALARY_TINT : FARE_TINT,
              borderLeft: fieldIdx === 0 ? (isSalary ? SALARY_BORDER : isFare ? FARE_BORDER : undefined) : undefined,
            }}
            onClick={cell(field)}
          >
            <PriceCell value={rp[field]} />
          </td>
        )
      })}

      <td
        onClick={cell('workType')}
        style={{
          position: 'sticky',
          right: 0,
          background: 'var(--theme-bg-secondary)',
          zIndex: 1,
          borderLeft: '1px solid var(--theme-border-light)',
        }}
      >
        <OpBadge type={rp.workType} />
      </td>
    </tr>
  )
}
