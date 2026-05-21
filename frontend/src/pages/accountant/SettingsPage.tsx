import { useState, useEffect } from 'react'
import { Calendar, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@/components/ui'
import { Panel } from '@/components/shared/Panel'
import { DayStepperInput } from '@/components/shared/DayStepperInput'
import { PulseHint } from '@/components/shared/PulseHint'
import { useSalaryConfig, useUpdateSalaryConfig } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useQueryClient } from '@tanstack/react-query'

function periodExample(fromDay: number, toDay: number) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const startMonth = fromDay > toDay ? (m === 1 ? 12 : m - 1) : m
  const startYear = fromDay > toDay && m === 1 ? y - 1 : y
  const endMonth = fromDay > toDay ? m : m
  const endYear = fromDay > toDay ? y : y
  return `${String(fromDay).padStart(2, '0')}/${String(startMonth).padStart(2, '0')}/${startYear} → ${String(toDay).padStart(2, '0')}/${String(endMonth).padStart(2, '0')}/${endYear}`
}

export function SettingsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: config, isLoading } = useSalaryConfig()
  const updateConfig = useUpdateSalaryConfig()

  const [fromDay, setFromDay] = useState(26)
  const [toDay, setToDay] = useState(25)
  const [dirty, setDirty] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (config) {
      setFromDay(config.fromDay)
      setToDay(config.toDay)
    }
  }, [config])

  useEffect(() => {
    if (config) {
      setDirty(config.fromDay !== fromDay || config.toDay !== toDay)
    }
  }, [fromDay, toDay, config])

  const handleSave = () => setShowConfirm(true)

  const handleConfirmSave = () => {
    updateConfig.mutate({ from_day: fromDay, to_day: toDay }, {
      onSuccess: () => {
        toast.success('Đã cập nhật kỳ lương')
        setShowConfirm(false)
        qc.invalidateQueries()
      },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <header>
        <h1 className="typo-display">Thiết lập</h1>
        <p className="typo-body-sm mt-1" style={{ color: 'var(--ink-3)' }}>
          Cấu hình kỳ lương và thông số hệ thống
        </p>
      </header>

      {/* ── Salary period section ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} />
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            Kỳ lương
          </h2>
        </div>

        <Panel>
          {isLoading ? (
            <div className="p-5 space-y-4">
              <div className="h-10 rounded animate-pulse" style={{ background: 'var(--surface-3)' }} />
              <div className="h-10 rounded animate-pulse" style={{ background: 'var(--surface-3)' }} />
            </div>
          ) : (
            <div className="p-5 space-y-5">
              <div className="flex items-end gap-4">
                <DayStepperInput
                  value={fromDay}
                  onChange={setFromDay}
                  label="Ngày bắt đầu"
                  hint="Ngày đầu tiên của kỳ lương"
                />
                <span className="pb-2.5 text-base" style={{ color: 'var(--ink-3)' }}>→</span>
                <DayStepperInput
                  value={toDay}
                  onChange={setToDay}
                  label="Ngày kết thúc"
                  hint="Ngày cuối cùng của kỳ lương"
                />
              </div>

              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)',
                }}
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)', opacity: 0.7 }} />
                <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
                  Ví dụ: kỳ 04/2026 = {periodExample(fromDay, toDay)}
                </span>
              </div>

              {/* Warning when dirty */}
              {dirty && (
                <div
                  className="flex items-start gap-3 rounded-lg px-4 py-3 transition-all animate-fade-in"
                  style={{
                    background: 'color-mix(in srgb, var(--warning) 8%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--warning) 20%, transparent)',
                  }}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>Thay đổi ảnh hưởng</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                      Lương tài xế · P&L Tổng quan · Bảng kê thanh toán
                    </p>
                  </div>
                </div>
              )}

              {dirty && (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setFromDay(config?.fromDay ?? 26); setToDay(config?.toDay ?? 25) }}
                    className="text-sm"
                  >
                    Huỷ
                  </Button>
                  <PulseHint hintKey="settings-save">
                    <Button variant="default" onClick={handleSave} className="text-sm">
                      Lưu thay đổi
                    </Button>
                  </PulseHint>
                </div>
              )}
            </div>
          )}
        </Panel>
      </section>

      {/* Confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xác nhận thay đổi kỳ lương?</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
            Kỳ lương mới: ngày {fromDay} → ngày {toDay} hàng tháng. Tất cả dữ liệu tổng quan sẽ được tính lại theo kỳ mới.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">Huỷ</Button>
            <Button variant="default" onClick={handleConfirmSave} className="flex-1">
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
