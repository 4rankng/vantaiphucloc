import { useState, useRef } from 'react'
import { Key } from 'lucide-react'
import type { Driver } from '@/data/domain'
import { Plate } from '@/components/shared/Plate'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { FieldActions } from '@/components/shared/ListUtils'
import { useInlineEditForm } from '@/components/shared/useInlineEditForm'
import { useActiveField } from '@/components/shared/useActiveField'
import { tdActive, tdHidden } from '@/components/shared/editCellStyles'

type FocusableField = 'fullName' | 'phone' | 'plate'

export type DriverFocusableField = FocusableField | null

export type DriverRowFormData = {
  fullName: string
  phone: string
  plate: string
}

interface DriverEditRowProps {
  driver: Driver
  onSave: (data: DriverRowFormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: DriverFocusableField
  vehicles: { id: number; plate: string }[]
}

export function DriverEditRow({
  driver,
  onSave,
  onCancel,
  saving,
  initialFocus,
  vehicles,
}: DriverEditRowProps) {
  const initial: DriverRowFormData = {
    fullName: driver.fullName ?? '',
    phone: driver.phone ?? '',
    plate: driver.vehiclePlate ?? '',
  }
  const [plateInput, setPlateInput] = useState('')
  const fullNameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  const { activeField, setActiveField } = useActiveField<FocusableField>(
    initialFocus ?? 'fullName',
    { fullName: fullNameRef, phone: phoneRef },
  )

  const { form, set, handleSave } = useInlineEditForm<DriverRowFormData>({
    initial,
    onSave,
    onCancel,
  })

  const showCreatePlate =
    plateInput.trim() &&
    !vehicles.some(v => v.plate.toLowerCase() === plateInput.toLowerCase().trim())

  const isLastColumn = activeField === 'plate'
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
      {/* Họ tên */}
      {activeField === 'fullName' ? (
        <td style={tdActive}>
          <input
            ref={fullNameRef}
            className="nepo-input text-[12px]"
            style={{ minWidth: 80, flex: 1 }}
            value={form.fullName}
            onChange={e => set('fullName', e.target.value)}
            placeholder="Họ tên"
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdHidden} onClick={() => setActiveField('fullName')}>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
            {form.fullName || driver.username}
          </span>
        </td>
      )}

      {/* Tài khoản */}
      <td style={{ padding: '5px 8px' }}>
        <span className="text-[12px] font-mono" style={{ color: 'var(--ink-3)' }}>
          {driver.username}
        </span>
      </td>

      {/* SĐT */}
      {activeField === 'phone' ? (
        <td style={tdActive}>
          <input
            ref={phoneRef}
            className="nepo-input text-[12px]"
            style={{ minWidth: 90, flex: 1 }}
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
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

      {/* Biển số */}
      {activeField === 'plate' ? (
        <td style={tdActive}>
          <div style={{ minWidth: 100 }}>
            <InlineSelect
              placeholder="Chọn hoặc nhập"
              value={form.plate}
              options={vehicles.map(v => ({ value: v.plate, label: v.plate }))}
              onChange={v => set('plate', v)}
              onInputChange={v => setPlateInput(v)}
              onCreateNew={showCreatePlate ? () => set('plate', plateInput.trim()) : undefined}
              createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined}
            />
          </div>
          {floatingActions}
        </td>
      ) : (
        <td style={tdHidden} onClick={() => setActiveField('plate')}>
          {form.plate ? (
            <Plate>{form.plate}</Plate>
          ) : (
            <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>—</span>
          )}
        </td>
      )}
    </tr>
  )
}

interface DriverRowProps {
  driver: Driver
  onEdit: (field: DriverFocusableField) => void
  onResetPassword?: () => void
}

export function DriverRow({ driver, onEdit, onResetPassword }: DriverRowProps) {
  return (
    <tr className="cursor-pointer group">
      <td onClick={() => onEdit('fullName')}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
          {driver.fullName || driver.username}
        </span>
      </td>
      <td>
        <span className="text-[12px] font-mono" style={{ color: 'var(--ink-3)' }}>
          {driver.username}
        </span>
      </td>
      <td onClick={() => onEdit('phone')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
          {driver.phone || '—'}
        </span>
      </td>
      <td onClick={() => onEdit('plate')}>
        {driver.vehiclePlate ? (
          <Plate>{driver.vehiclePlate}</Plate>
        ) : (
          <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
            —
          </span>
        )}
      </td>
      {onResetPassword && (
        <td>
          <button
            onClick={(e) => { e.stopPropagation(); onResetPassword() }}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title="Đổi mật khẩu"
          >
            <Key className="h-3.5 w-3.5" style={{ color: 'var(--ink-3)' }} />
          </button>
        </td>
      )}
    </tr>
  )
}
