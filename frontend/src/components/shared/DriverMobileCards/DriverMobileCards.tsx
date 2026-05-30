import { useState } from 'react'
import { User, Pencil, Key, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { Plate } from '@/components/shared/Plate'
import type { Driver } from '@/data/domain'
import type { DriverRowFormData } from '@/hooks/use-fleet-manager'

export interface DriverMobileCardProps {
  driver: Driver
  onEdit: () => void
  onResetPassword?: () => void
  onDelete?: () => void
}

export function DriverMobileCard({
  driver,
  onEdit,
  onResetPassword,
  onDelete,
}: DriverMobileCardProps) {
  return (
    <div
      onClick={onEdit}
      className="p-4 rounded-xl border flex flex-col gap-3 transition-colors active:scale-[0.99] touch-manipulation cursor-pointer"
      style={{
        background: 'var(--theme-bg-secondary, #ffffff)',
        borderColor: 'var(--theme-border-default, #e4e4e7)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--ink-2)',
            }}
          >
            <User className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1 leading-normal">
            <span
              className="text-sm font-bold block"
              style={{ color: 'var(--ink)' }}
            >
              {driver.fullName || driver.username}
            </span>
            <span
              className="block text-[11px] font-mono mt-0.5"
              style={{ color: 'var(--ink-3)' }}
            >
              {driver.username}
            </span>
            {driver.phone && (
              <a
                href={`tel:${driver.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium block mt-1 hover:underline tabular-nums"
                style={{ color: 'var(--accent)' }}
              >
                {driver.phone}
              </a>
            )}
            {driver.vehiclePlate && (
              <div className="mt-1.5">
                <Plate>{driver.vehiclePlate}</Plate>
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="w-9 h-9 flex items-center justify-center rounded-lg border touch-target"
            style={{
              borderColor: 'var(--theme-border-default)',
              color: 'var(--ink-2)',
            }}
            title="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {onResetPassword && (
            <button
              onClick={onResetPassword}
              className="w-9 h-9 flex items-center justify-center rounded-lg border touch-target"
              style={{
                borderColor: 'var(--theme-border-default)',
                color: 'var(--ink-3)',
              }}
              title="Đổi mật khẩu"
            >
              <Key className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-9 h-9 flex items-center justify-center rounded-lg border touch-target"
              style={{
                borderColor: 'var(--theme-border-default)',
                color: 'var(--theme-status-error, var(--status-error, #e53))',
              }}
              title="Vô hiệu hoá"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export interface DriverMobileEditCardProps {
  driver: Driver
  onSave: (data: DriverRowFormData) => void
  onCancel: () => void
  saving?: boolean
  vehicles: { id: number; plate: string }[]
}

export function DriverMobileEditCard({
  driver,
  onSave,
  onCancel,
  saving = false,
  vehicles,
}: DriverMobileEditCardProps) {
  const [fullName, setFullName] = useState(driver.fullName ?? '')
  const [username, setUsername] = useState(driver.username ?? '')
  const [phone, setPhone] = useState(driver.phone ?? '')
  const [plate, setPlate] = useState(driver.vehiclePlate ?? '')

  const handleSave = () => {
    onSave({ fullName, username, phone, plate })
  }

  return (
    <div
      className="p-4 rounded-xl border flex flex-col gap-4 animate-scale-pop text-left"
      style={{
        background: 'var(--accent-soft)',
        borderColor: 'var(--accent)',
      }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: 'var(--accent-ink)' }}
      >
        Chỉnh sửa thông tin tài xế
      </h3>

      <div className="space-y-3">
        <div className="space-y-1">
          <label
            className="text-[11px] font-semibold uppercase"
            style={{ color: 'var(--ink-2)' }}
          >
            Họ tên
          </label>
          <input
            className="nepo-input text-xs w-full"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Họ tên"
          />
        </div>

        <div className="space-y-1">
          <label
            className="text-[11px] font-semibold uppercase"
            style={{ color: 'var(--ink-2)' }}
          >
            Tài khoản *
          </label>
          <input
            className="nepo-input text-xs w-full font-mono"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tên đăng nhập"
          />
        </div>

        <div className="space-y-1">
          <label
            className="text-[11px] font-semibold uppercase"
            style={{ color: 'var(--ink-2)' }}
          >
            Số điện thoại
          </label>
          <input
            className="nepo-input text-xs w-full"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Số điện thoại"
          />
        </div>

        <div className="space-y-1">
          <label
            className="text-[11px] font-semibold uppercase"
            style={{ color: 'var(--ink-2)' }}
          >
            Biển số xe
          </label>
          <select
            className="nepo-input text-xs w-full"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            style={{ background: 'var(--surface)' }}
          >
            <option value="">—</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.plate}>
                {v.plate}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="flex gap-2 justify-end mt-1 pt-3 border-t"
        style={{ borderColor: 'var(--theme-border-default)' }}
      >
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Hủy
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Xác nhận'}
        </Button>
      </div>
    </div>
  )
}
