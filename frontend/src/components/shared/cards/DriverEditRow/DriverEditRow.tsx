import { useState, useRef } from 'react'
import { FieldActions } from '@/components/shared/data-display/ListUtils'
import { InlineSelect } from '@/components/shared/forms/InlineSelect'
import { Plate } from '@/components/shared/data-display/Plate'
import { useActiveField } from '@/components/shared/forms/useActiveField'
import { useInlineEditForm } from '@/components/shared/forms/useInlineEditForm'
import { tdActive, tdHidden } from '@/components/shared/forms/editCellStyles'
import type { Driver } from '@/data/domain'
import type { FocusableField, FocusState, DriverRowFormData } from '@/hooks/use-fleet-manager'

export interface DriverEditRowProps {
  driver: Driver
  onSave: (data: DriverRowFormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: FocusState
  vehicles: { id: number; plate: string }[]
}

export function DriverEditRow({
  driver,
  onSave,
  onCancel,
  saving = false,
  initialFocus = null,
  vehicles,
}: DriverEditRowProps) {
  const initial: DriverRowFormData = {
    fullName: driver.fullName ?? '',
    username: driver.username ?? '',
    phone: driver.phone ?? '',
    plate: driver.vehiclePlate ?? '',
  }
  const [plateInput, setPlateInput] = useState('')
  const fullNameRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const { activeField, setActiveField } = useActiveField<FocusableField>(
    initialFocus ?? 'fullName',
    { fullName: fullNameRef, username: usernameRef, phone: phoneRef }
  )

  const { form, set, handleSave } = useInlineEditForm<DriverRowFormData>({
    initial,
    onSave,
    onCancel,
  })

  const showCreatePlate =
    plateInput.trim() &&
    !vehicles.some(
      (v) => v.plate.toLowerCase() === plateInput.toLowerCase().trim()
    )

  const isLastColumn = activeField === 'plate' || activeField === 'phone'
  const floatingActions = (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 20,
        ...(isLastColumn
          ? { right: '100%', paddingRight: 6 }
          : { left: '100%', paddingLeft: 6 }),
      }}
    >
      <FieldActions
        onSave={handleSave}
        onCancel={onCancel}
        saving={saving}
        hintAlign={isLastColumn ? 'right' : 'left'}
      />
    </div>
  )

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      {activeField === 'fullName' ? (
        <td style={tdActive}>
          <input
            ref={fullNameRef}
            className="nepo-input text-[12px]"
            style={{ minWidth: 80, flex: 1 }}
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            placeholder="Họ tên"
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdHidden} onClick={() => setActiveField('fullName')}>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
            {form.fullName || '—'}
          </span>
        </td>
      )}

      {activeField === 'username' ? (
        <td style={tdActive}>
          <input
            ref={usernameRef}
            className="nepo-input text-[12px] font-mono"
            style={{ minWidth: 70, flex: 1 }}
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            placeholder="Tài khoản"
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdHidden} onClick={() => setActiveField('username')}>
          <span className="text-[12px] font-mono" style={{ color: 'var(--ink-2)' }}>
            {form.username}
          </span>
        </td>
      )}

      {activeField === 'phone' ? (
        <td style={tdActive}>
          <input
            ref={phoneRef}
            className="nepo-input text-[12px]"
            style={{ minWidth: 90, flex: 1 }}
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="SĐT"
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdHidden} onClick={() => setActiveField('phone')}>
          <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
            {form.phone || '—'}
          </span>
        </td>
      )}

      {activeField === 'plate' ? (
        <td style={tdActive}>
          <div style={{ minWidth: 100 }}>
            <InlineSelect
              placeholder="Chọn hoặc nhập"
              value={form.plate}
              options={vehicles.map((v) => ({ value: v.plate, label: v.plate }))}
              onChange={(v) => set('plate', v)}
              onInputChange={(v) => setPlateInput(v)}
              onCreateNew={
                showCreatePlate ? () => set('plate', plateInput.trim()) : undefined
              }
              createNewLabel={
                showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined
              }
            />
          </div>
          {floatingActions}
        </td>
      ) : (
        <td style={tdHidden} onClick={() => setActiveField('plate')}>
          {form.plate ? (
            <Plate>{form.plate}</Plate>
          ) : (
            <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
              —
            </span>
          )}
        </td>
      )}
    </tr>
  )
}
