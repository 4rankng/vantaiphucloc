/**
 * Dialog for kế toán to set a driver's base salary (lương cơ bản).
 *
 * Pure UI: business logic lives in `useDriverBaseSalaryForm.ts`. The
 * dialog displays the append-only history of past rates plus a form
 * for adding a new effective rate.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/components/ui'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatCurrencyFull } from '@/data/domain'
import { useDriverBaseSalaryForm } from './useDriverBaseSalaryForm'

export interface DriverBaseSalaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driverId: number | null
  driverName?: string | null
}

export function DriverBaseSalaryDialog({
  open,
  onOpenChange,
  driverId,
  driverName,
}: DriverBaseSalaryDialogProps) {
  const isMobile = useIsMobile()
  const form = useDriverBaseSalaryForm({
    driverId,
    onSaved: () => onOpenChange(false),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[520px] ${isMobile ? 'flex flex-col' : ''}`}
        {...(isMobile ? { 'data-mobile-fullscreen': '' } : {})}
      >
        <DialogHeader>
          <DialogTitle>Lương cơ bản · {driverName ?? 'Tài xế'}</DialogTitle>
          <DialogDescription>
            Mức lương cơ bản cố định hàng tháng. Lịch sử lưu trữ — đổi mức sẽ
            tạo bản ghi mới, không ghi đè.
          </DialogDescription>
        </DialogHeader>

        <div className={isMobile ? 'flex-1 overflow-y-auto px-4' : ''}>
        {/* Current rate */}
        <div
          className="rounded-md px-3 py-2.5"
          style={{ background: 'var(--theme-bg-tertiary)' }}
        >
          <p className="typo-caption mb-0.5">Mức hiện tại</p>
          {form.historyLoading ? (
            <p className="text-sm">Đang tải…</p>
          ) : form.currentRate ? (
            <p
              className="text-base font-semibold tabular-nums"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              {formatCurrencyFull(form.currentRate.baseSalary)}{' '}
              <span
                className="text-xs font-normal"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                · từ {form.currentRate.effectiveFrom}
              </span>
            </p>
          ) : (
            <p
              className="text-sm"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              Chưa cấu hình
            </p>
          )}
        </div>

        {/* New rate form */}
        <div className="space-y-3 mt-3">
          <div className="space-y-1.5">
            <label className="typo-form-label" htmlFor="base-salary">
              Mức lương cơ bản (VND)
            </label>
            <Input
              id="base-salary"
              inputMode="numeric"
              value={form.fields.baseSalary}
              onChange={(e) => form.setBaseSalary(e.target.value)}
              placeholder="8.000.000"
              className="h-10 text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="typo-form-label" htmlFor="effective-from">
              Hiệu lực từ ngày
            </label>
            <Input
              id="effective-from"
              type="date"
              value={form.fields.effectiveFrom}
              onChange={(e) => form.setEffectiveFrom(e.target.value)}
              className="h-10 text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="typo-form-label" htmlFor="note">
              Ghi chú (tùy chọn)
            </label>
            <Input
              id="note"
              value={form.fields.note}
              onChange={(e) => form.setNote(e.target.value)}
              placeholder="VD: Tăng lương theo thâm niên"
              className="h-10 text-sm"
              maxLength={500}
            />
          </div>

          {form.error && (
            <p
              className="text-xs"
              style={{ color: 'var(--theme-status-error)' }}
              role="alert"
            >
              {form.error}
            </p>
          )}
        </div>

        {/* History */}
        {form.history.length > 0 && (
          <div className="mt-4">
            <p className="typo-caption mb-2">Lịch sử ({form.history.length})</p>
            <div
              className="rounded-md overflow-hidden"
              style={{ border: '1px solid var(--theme-border-default)' }}
            >
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <th
                      className="text-left px-3 py-2"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      Hiệu lực từ
                    </th>
                    <th
                      className="text-right px-3 py-2"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      Mức lương
                    </th>
                    <th
                      className="text-left px-3 py-2"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      Ghi chú
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {form.history.map((h, i) => (
                    <tr
                      key={h.id}
                      style={{
                        background:
                          i % 2 === 0
                            ? 'var(--theme-bg-primary)'
                            : 'var(--theme-bg-secondary)',
                        borderTop: '1px solid var(--theme-border-light)',
                      }}
                    >
                      <td
                        className="px-3 py-1.5 tabular-nums"
                        style={{ color: 'var(--theme-text-primary)' }}
                      >
                        {h.effectiveFrom}
                      </td>
                      <td
                        className="px-3 py-1.5 text-right tabular-nums"
                        style={{ color: 'var(--theme-text-primary)' }}
                      >
                        {formatCurrencyFull(h.baseSalary)}
                      </td>
                      <td
                        className="px-3 py-1.5 truncate"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        {h.note ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={form.submit}
            disabled={form.submitting}
          >
            {form.submitting ? 'Đang lưu…' : 'Lưu mức mới'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
