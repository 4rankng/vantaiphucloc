import { Key, Trash2 } from 'lucide-react'
import { Plate } from '@/components/shared/Plate'
import type { Driver } from '@/data/domain'
import type { FocusState } from '@/hooks/use-fleet-manager'

export interface DriverRowProps {
  driver: Driver
  onEdit: (field: FocusState) => void
  onResetPassword?: () => void
  onDelete?: () => void
}

export function DriverRow({
  driver,
  onEdit,
  onResetPassword,
  onDelete,
}: DriverRowProps) {
  return (
    <tr className="cursor-pointer group">
      <td onClick={() => onEdit('fullName')}>
        <span
          className="text-[13px] font-semibold"
          style={{ color: 'var(--ink)' }}
        >
          {driver.fullName || '—'}
        </span>
      </td>
      <td onClick={() => onEdit('username')}>
        <span className="text-[12px] font-mono" style={{ color: 'var(--ink-2)' }}>
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
      {(onResetPassword || onDelete) && (
        <td>
          <div className="flex items-center gap-0.5">
            {onResetPassword && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onResetPassword()
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Đổi mật khẩu"
              >
                <Key className="h-3.5 w-3.5" style={{ color: 'var(--ink-3)' }} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="p-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Vô hiệu hoá"
              >
                <Trash2
                  className="h-3.5 w-3.5"
                  style={{ color: 'var(--theme-status-error, var(--status-error, #e53))' }}
                />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}
