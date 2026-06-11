import { useRef, memo } from 'react'
import { useActiveField } from '@/components/shared/forms/useActiveField'
import { useInlineEditForm } from '@/components/shared/forms/useInlineEditForm'
import { FieldActions } from '@/components/shared/data-display/ListUtils'
import { tdActive, tdDimmed } from '@/components/shared/forms/editCellStyles'
import type { VendorFormData, VendorFocusableField } from './types'
import { validateTaxCode } from './types'

interface VendorEditRowProps {
  initial: VendorFormData
  onSave: (data: VendorFormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: VendorFocusableField
  globalKeyboard?: boolean
}

export const VendorEditRow = memo(function VendorEditRow({
  initial,
  onSave,
  onCancel,
  saving,
  initialFocus = 'name',
  globalKeyboard = true,
}: VendorEditRowProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const taxCodeRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const contactPersonRef = useRef<HTMLInputElement>(null)

  const { activeField, setActiveField } = useActiveField<Exclude<VendorFocusableField, null>>(
    initialFocus ?? 'name',
    { name: nameRef, phone: phoneRef, taxCode: taxCodeRef, address: addressRef, contactPerson: contactPersonRef },
  )

  const { form, errors, set, handleSave } = useInlineEditForm<VendorFormData>({
    initial,
    validate: (f) => {
      const errs: Record<string, string> = {}
      if (!f.name.trim()) errs.name = 'Bắt buộc'
      const taxErr = validateTaxCode(f.taxCode)
      if (taxErr) errs.taxCode = taxErr
      return errs
    },
    onSave: (f) => onSave({ ...f, name: f.name.trim() }),
    onCancel,
    globalKeyboard,
  })

  const isLastColumn = activeField === 'taxCode'
  const floatingActions = (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 20,
      ...(isLastColumn
        ? { right: '100%', paddingRight: 6 }
        : { left: '100%', paddingLeft: 6 }),
    }}>
      <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} hintAlign={isLastColumn ? 'right' : 'left'} />
    </div>
  )

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      {/* Tên */}
      {activeField === 'name' ? (
        <td style={tdActive}>
          <input ref={nameRef}
            className="nepo-input text-[12px]"
            style={{ width: '100%', borderColor: errors.name ? 'var(--status-error, #e53)' : undefined }}
            value={form.name} onChange={e => set('name', e.target.value)} placeholder="Tên nhà thầu *"
          />
          {errors.name && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.name}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('name')}>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{form.name || '—'}</span>
        </td>
      )}

      {/* Loại */}
      {activeField === 'type' ? (
        <td style={tdActive}>
          <div className="flex gap-1" style={{ minWidth: 90 }}>
            {(['company', 'individual'] as const).map(t => (
              <button key={t} type="button" onClick={() => set('type', t)}
                className="flex-1 rounded text-[11px] font-medium transition-colors"
                style={{ padding: '3px 0', background: form.type === t ? 'var(--accent)' : 'var(--surface-3)', color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--ink-2)' }}
              >
                {t === 'company' ? 'Cty' : 'CN'}
              </button>
            ))}
          </div>
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('type')}>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
            {form.type === 'company' ? 'Công ty' : 'Cá nhân'}
          </span>
        </td>
      )}

      {/* SĐT */}
      {activeField === 'phone' ? (
        <td style={tdActive}>
          <input ref={phoneRef} className="nepo-input text-[12px]" style={{ minWidth: 90, width: '100%' }}
            type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="SĐT"
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('phone')}>
          <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{form.phone || '—'}</span>
        </td>
      )}

      {/* Địa chỉ */}
      {activeField === 'address' ? (
        <td style={tdActive}>
          <input ref={addressRef} className="nepo-input text-[12px]" style={{ minWidth: 100, width: '100%' }}
            value={form.address} onChange={e => set('address', e.target.value)} placeholder="Địa chỉ"
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('address')}>
          <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{form.address || '—'}</span>
        </td>
      )}

      {/* Liên hệ */}
      {activeField === 'contactPerson' ? (
        <td style={tdActive}>
          <input ref={contactPersonRef} className="nepo-input text-[12px]" style={{ minWidth: 80, width: '100%' }}
            value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Người liên hệ"
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('contactPerson')}>
          <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{form.contactPerson || '—'}</span>
        </td>
      )}

      {/* MST */}
      {activeField === 'taxCode' ? (
        <td style={tdActive}>
          <input ref={taxCodeRef} className="nepo-input text-[12px]"
            style={{ width: '100%', borderColor: errors.taxCode ? 'var(--status-error, #e53)' : undefined }}
            value={form.taxCode} onChange={e => set('taxCode', e.target.value)} placeholder="MST"
          />
          {errors.taxCode && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.taxCode}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('taxCode')}>
          <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{form.taxCode || '—'}</span>
        </td>
      )}

      {/* Trash placeholder */}
      <td style={{ width: 32 }} />
    </tr>
  )
})
