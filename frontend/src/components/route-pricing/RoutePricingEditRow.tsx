import { useState, useRef, useEffect } from 'react'
import { MapPin, Flag } from 'lucide-react'
import { formatCurrency, WORK_TYPE_LABELS } from '@/data/domain'

/** Format raw digits as X.XXX while typing (e.g. "12345" → "12.345") */
function formatTypingNumber(raw: string): string {
  if (!raw) return ''
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
import type { WorkType } from '@/data/domain'
import { useInlineEditForm } from '@/components/shared/forms/useInlineEditForm'
import { tdActive, tdDimmed } from '@/components/shared/forms/editCellStyles'
import { InlineSelect } from '@/components/shared/forms/InlineSelect/InlineSelect'
import { FieldActions } from '@/components/shared/data-display/ListUtils'
import { OpBadge } from './RoutePricingCells'
import type { FocusableField, RoutePricingFormData } from './RoutePricingTable.types'
import type { PriceField } from './RoutePricingTable.constants'
import {
  SALARY_TINT,
  SALARY_BORDER,
  SALARY_FIELDS,
} from './RoutePricingTable.constants'

export function RoutePricingEditRow({
  initial,
  onSave,
  onCancel,
  saving,
  clients,
  locations,
  initialFocus = 'f20Price',
  hideClient,
}: {
  initial: RoutePricingFormData
  onSave: (data: RoutePricingFormData) => void
  onCancel: () => void
  saving?: boolean
  clients: Array<{ id: number; name: string; code?: string | null }>
  locations: Array<{ id: number; name: string }>
  initialFocus?: FocusableField
  hideClient?: boolean
}) {
  const [activeField, setActiveField] = useState<FocusableField>(initialFocus)
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const { form, errors, set, handleSave } = useInlineEditForm<RoutePricingFormData>({
    initial,
    validate: (f) => {
      const errs: Record<string, string> = {}
      if (!f.clientId) errs.clientId = 'Chọn chủ hàng'
      if (!f.pickupLocationId) errs.pickupLocationId = 'Chọn nơi lấy'
      if (!f.dropoffLocationId) errs.dropoffLocationId = 'Chọn nơi hạ'
      if (!f.f20Price && !f.f40Price && !f.e20Price && !f.e40Price)
        errs.f20Price = 'Nhập ít nhất 1 giá'
      return errs
    },
    onSave,
    onCancel,
  })

  useEffect(() => {
    fieldRefs.current[activeField]?.focus()
  }, [activeField])

  const isLastCol = activeField === 'e40DriverSalary' || activeField === 'workType'

  const floatingActions = (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 20,
      ...(isLastCol
        ? { right: '100%', paddingRight: 4 }
        : { left: '100%', paddingLeft: 4 }),
    }}>
      <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} hintAlign={isLastCol ? 'right' : 'left'} />
    </div>
  )

  const clientOptions = [
    { value: '', label: '— Chủ hàng —' },
    ...clients.map(c => ({ value: String(c.id), label: c.code ? `${c.code} – ${c.name}` : c.name })),
  ]
  const locationOptions = [
    { value: '', label: '— Địa điểm —' },
    ...locations.map(l => ({ value: String(l.id), label: l.name })),
  ]
  const workTypeOptions = (Object.entries(WORK_TYPE_LABELS) as [WorkType, string][])
    .filter(([key]) => !['E20', 'E40', 'F20', 'F40'].includes(key))
    .map(([key, label]) => ({ value: key, label }))

  const priceInput = (field: PriceField, color: string) => {
    const isSalary = SALARY_FIELDS.includes(field)
    const isFirstSalary = field === 'f20DriverSalary'
    const salaryBg = isSalary ? { background: SALARY_TINT } : null
    const salaryLeft = isFirstSalary ? { borderLeft: SALARY_BORDER } : null
    if (activeField === field) {
      return (
        <td style={{ ...tdActive, textAlign: 'right', ...salaryBg, ...salaryLeft }}>
          {/* Dimmed display value for visual continuity */}
          <span className="tabular-nums text-xs" style={{ color: 'var(--theme-text-muted)', fontFamily: 'var(--theme-font-mono)', opacity: 0.4 }}>
            {form[field] ? formatCurrency(Number(form[field])) : '—'}
          </span>
          {/* Floating input overlay — not constrained by column width */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <input
              ref={(el) => { fieldRefs.current[field] = el }}
              type="text"
              inputMode="numeric"
              className="nepo-input text-[12px] tabular-nums"
              style={{
                width: 130,
                textAlign: 'right',
                borderColor: errors[field] ? 'var(--theme-status-error)' : 'var(--theme-status-info)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
                background: 'var(--theme-bg-primary)',
              }}
              value={formatTypingNumber(form[field])}
              onChange={e => set(field, e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="—"
            />
            {floatingActions}
          </div>
        </td>
      )
    }
    return (
      <td style={{ ...tdDimmed, textAlign: 'right', ...salaryBg, ...salaryLeft }} onClick={() => setActiveField(field)}>
        <span className="tabular-nums text-xs" style={{ color: form[field] ? color : 'var(--theme-text-muted)', fontFamily: 'var(--theme-font-mono)' }}>
          {form[field] ? formatCurrency(Number(form[field])) : '—'}
        </span>
      </td>
    )
  }

  return (
    <tr style={{ background: 'var(--theme-status-warning-light)' }}>
      <td style={{ ...tdDimmed, color: 'var(--theme-text-muted)', fontSize: 12 }} />

      {!hideClient && (activeField === 'clientId' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="— Chủ hàng —"
            value={form.clientId ? String(form.clientId) : ''}
            options={clientOptions}
            onChange={v => set('clientId', Number(v) || 0)}
            compact
          />
          {errors.clientId && <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-status-error)' }}>{errors.clientId}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('clientId')}>
          {clients.find(c => c.id === form.clientId)
            ? <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: 'color-mix(in srgb, var(--theme-text-primary) 7%, transparent)', color: 'var(--theme-text-primary)' }}>
                {clients.find(c => c.id === form.clientId)?.name}
              </span>
            : <span className="text-[12px]" style={{ color: 'var(--theme-text-muted)' }}>— Chủ hàng —</span>}
        </td>
      ))}

      {activeField === 'pickupLocationId' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="— Điểm đi —"
            value={form.pickupLocationId ? String(form.pickupLocationId) : ''}
            options={locationOptions}
            onChange={v => { set('pickupLocationId', Number(v) || 0); setActiveField('dropoffLocationId') }}
            compact
          />
          {errors.pickupLocationId && <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-status-error)' }}>{errors.pickupLocationId}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('pickupLocationId')}>
          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>
            <MapPin className="h-3 w-3 shrink-0" style={{ color: 'var(--theme-status-info)' }} />
            {locations.find(l => l.id === form.pickupLocationId)?.name ?? '—'}
          </span>
        </td>
      )}

      {activeField === 'dropoffLocationId' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="— Điểm đến —"
            value={form.dropoffLocationId ? String(form.dropoffLocationId) : ''}
            options={locationOptions}
            onChange={v => set('dropoffLocationId', Number(v) || 0)}
            compact
          />
          {errors.dropoffLocationId && <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-status-error)' }}>{errors.dropoffLocationId}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('dropoffLocationId')}>
          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>
            <Flag className="h-3 w-3 shrink-0" style={{ color: 'var(--theme-status-warning)' }} />
            {locations.find(l => l.id === form.dropoffLocationId)?.name ?? '—'}
          </span>
        </td>
      )}

      {priceInput('f20Price', 'var(--theme-status-info)')}
      {priceInput('f40Price', 'var(--theme-status-info)')}
      {priceInput('e20Price', 'var(--theme-express-color)')}
      {priceInput('e40Price', 'var(--theme-express-color)')}

      {priceInput('f20DriverSalary', 'var(--theme-status-warning)')}
      {priceInput('f40DriverSalary', 'var(--theme-status-warning)')}
      {priceInput('e20DriverSalary', 'var(--theme-status-warning)')}
      {priceInput('e40DriverSalary', 'var(--theme-status-warning)')}

      {activeField === 'workType' ? (
        <td
          style={{
            ...tdActive,
            position: 'sticky',
            right: 0,
            background: 'var(--theme-status-warning-light)',
            zIndex: 1,
            borderLeft: '1px solid var(--theme-border-light)',
          }}
        >
          <InlineSelect
            placeholder="Tác nghiệp"
            value={form.workType}
            options={workTypeOptions}
            onChange={v => set('workType', v as WorkType)}
            compact
          />
          {floatingActions}
        </td>
      ) : (
        <td
          style={{
            ...tdDimmed,
            position: 'sticky',
            right: 0,
            background: 'var(--theme-status-warning-light)',
            zIndex: 1,
            borderLeft: '1px solid var(--theme-border-light)',
          }}
          onClick={() => setActiveField('workType')}
        >
          <OpBadge type={form.workType} />
        </td>
      )}
    </tr>
  )
}
