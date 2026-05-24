/**
 * DriverBaseSalaryTable
 *
 * Table listing all drivers with their current base salary.
 * Used on the /accountant/settings/ky-luong page so kế toán can
 * set or update each driver's lương cơ bản without leaving settings.
 *
 * Each row fetches its own current rate independently — avoids a
 * dedicated batch endpoint and keeps the queries small.
 */

import { useState } from 'react'
import { UserCircle, Pencil } from 'lucide-react'
import { Button } from '@/components/ui'
import { Panel } from '@/components/shared/Panel'
import { DriverBaseSalaryDialog } from './DriverBaseSalaryDialog'
import { useDrivers, useDriverBaseSalaryHistory } from '@/hooks/use-queries'
import { formatCurrencyFull } from '@/data/domain'
import type { Driver } from '@/data/domain'

// ─── per-row current salary ──────────────────────────────────────────────────

function CurrentSalaryCell({ driverId }: { driverId: number }) {
  const { data: history = [], isLoading } = useDriverBaseSalaryHistory(driverId)
  const current = history[0] ?? null

  if (isLoading) {
    return (
      <span
        className="inline-block h-4 w-20 rounded animate-pulse"
        style={{ background: 'var(--surface-3)' }}
      />
    )
  }

  if (!current) {
    return (
      <span className="text-xs italic" style={{ color: 'var(--ink-3)' }}>
        Chưa cấu hình
      </span>
    )
  }

  return (
    <span className="tabular-nums font-medium text-sm" style={{ color: 'var(--ink)' }}>
      {formatCurrencyFull(current.baseSalary)}
      <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--ink-3)' }}>
        · từ {current.effectiveFrom}
      </span>
    </span>
  )
}

// ─── per-row ─────────────────────────────────────────────────────────────────

interface DriverRowProps {
  driver: Driver
  onEdit: (driver: Driver) => void
  even: boolean
}

function DriverRow({ driver, onEdit, even }: DriverRowProps) {
  return (
    <tr
      style={{
        background: even ? 'transparent' : 'color-mix(in srgb, var(--surface-2) 50%, transparent)',
        borderTop: '1px solid var(--line)',
      }}
    >
      {/* Driver name */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {driver.fullName ?? driver.username}
          </span>
          {driver.vehiclePlate && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--ink-3)',
                border: '1px solid var(--line)',
              }}
            >
              {driver.vehiclePlate}
            </span>
          )}
        </div>
      </td>

      {/* Current base salary */}
      <td className="px-4 py-2.5">
        <CurrentSalaryCell driverId={driver.id} />
      </td>

      {/* Action */}
      <td className="px-4 py-2.5 text-right">
        <Button
          variant="outline"
          className="h-7 px-2.5 text-xs gap-1.5"
          onClick={() => onEdit(driver)}
        >
          <Pencil className="h-3 w-3" />
          Cập nhật
        </Button>
      </td>
    </tr>
  )
}

// ─── main table ───────────────────────────────────────────────────────────────

export function DriverBaseSalaryTable() {
  const { data: drivers = [], isLoading } = useDrivers()
  const [selected, setSelected] = useState<Driver | null>(null)

  return (
    <>
      <Panel
        title="Lương cơ bản tài xế"
        subtitle="Mức lương cố định hàng tháng cho từng tài xế — lịch sử được lưu trữ khi thay đổi"
        flush
      >
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-9 rounded animate-pulse"
                style={{ background: 'var(--surface-3)' }}
              />
            ))}
          </div>
        ) : drivers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
              Chưa có tài xế nào trong hệ thống
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th
                  className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--ink-3)' }}
                >
                  Tài xế
                </th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--ink-3)' }}
                >
                  Lương cơ bản
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver, i) => (
                <DriverRow
                  key={driver.id}
                  driver={driver}
                  onEdit={setSelected}
                  even={i % 2 === 0}
                />
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <DriverBaseSalaryDialog
        open={selected !== null}
        onOpenChange={(open) => { if (!open) setSelected(null) }}
        driverId={selected?.id ?? null}
        driverName={selected?.fullName ?? selected?.username}
      />
    </>
  )
}
