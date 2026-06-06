import { Trash2 } from 'lucide-react'
import type { RoutePricing } from '@/data/domain'
import { OpBadge, PriceCell } from './RoutePricingCells'
import { COL, SALARY_TINT, SALARY_BORDER } from './RoutePricingTable.constants'
import type { FocusableField } from './RoutePricingTable.types'

export function RoutePricingRow({ rp, idx, onEdit, onDelete, hideClient }: {
  rp: RoutePricing
  idx: number
  onEdit: (field: FocusableField) => void
  onDelete: () => void
  hideClient?: boolean
}) {
  const cell = (field: FocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }

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

      <td style={{ textAlign: 'right' }} onClick={cell('f20Price')}><PriceCell value={rp.f20Price} /></td>
      <td style={{ textAlign: 'right' }} onClick={cell('f40Price')}><PriceCell value={rp.f40Price} /></td>
      <td style={{ textAlign: 'right' }} onClick={cell('e20Price')}><PriceCell value={rp.e20Price} /></td>
      <td style={{ textAlign: 'right' }} onClick={cell('e40Price')}><PriceCell value={rp.e40Price} /></td>

      <td style={{ textAlign: 'right', background: SALARY_TINT, borderLeft: SALARY_BORDER }} onClick={cell('f20DriverSalary')}><PriceCell value={rp.f20DriverSalary} /></td>
      <td style={{ textAlign: 'right', background: SALARY_TINT }} onClick={cell('f40DriverSalary')}><PriceCell value={rp.f40DriverSalary} /></td>
      <td style={{ textAlign: 'right', background: SALARY_TINT }} onClick={cell('e20DriverSalary')}><PriceCell value={rp.e20DriverSalary} /></td>
      <td style={{ textAlign: 'right', background: SALARY_TINT }} onClick={cell('e40DriverSalary')}><PriceCell value={rp.e40DriverSalary} /></td>

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
