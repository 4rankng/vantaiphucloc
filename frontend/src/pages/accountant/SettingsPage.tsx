import { useState, useEffect } from 'react'
import { Calendar, AlertTriangle, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@/components/ui'
import { AccountantPageShell } from '@/components/shared/AccountantPageShell'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { InfoTip } from '@/components/shared/InfoTip'
import { PulseHint } from '@/components/shared/PulseHint'
import { useSalaryConfig, useUpdateSalaryConfig } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useQueryClient } from '@tanstack/react-query'

function dayOptions() {
  return Array.from({ length: 31 }, (_, i) => i + 1)
}

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
  const [sparkleDismissed, setSparkleDismissed] = useState(false)

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
        setSparkleDismissed(true)
        qc.invalidateQueries()
      },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }

  return (
    <AccountantPageShell title="Thiết lập" subtitle="Cấu hình kỳ lương và thông số hệ thống" icon={Calendar}>
      <div className="rounded-xl border overflow-hidden" style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06), 0 4px 16px -4px rgba(9,9,11,0.05)',
      }}>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader
            title="Kỳ lương"
            icon={Calendar}
            right={
              !sparkleDismissed && (
                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'var(--theme-status-warning)' }}>
                  <Sparkles className="h-3 w-3" />
                  Mới
                </span>
              )
            }
          />
        </div>

        {isLoading ? (
          <div className="p-5 space-y-4">
            <div className="h-10 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
            <div className="h-10 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                  Ngày bắt đầu <InfoTip text="Ngày đầu tiên của kỳ lương" />
                </label>
                <select
                  value={fromDay}
                  onChange={e => setFromDay(Number(e.target.value))}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold w-20"
                  style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
                >
                  {dayOptions().map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <span className="text-lg mt-5" style={{ color: 'var(--theme-text-muted)' }}>→</span>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                  Ngày kết thúc <InfoTip text="Ngày cuối cùng của kỳ lương" />
                </label>
                <select
                  value={toDay}
                  onChange={e => setToDay(Number(e.target.value))}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold w-20"
                  style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
                >
                  {dayOptions().map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              Ví dụ: kỳ 04/2026 = {periodExample(fromDay, toDay)}
            </p>

            {/* Warning when dirty */}
            {dirty && (
              <div
                className="flex items-start gap-3 rounded-lg px-4 py-3 transition-all animate-fade-in"
                style={{
                  background: 'color-mix(in srgb, var(--theme-status-warning) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--theme-status-warning) 20%, transparent)',
                }}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-warning)' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--theme-status-warning)' }}>Thay đổi ảnh hưởng</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                    Lương tài xế · P&L Tổng quan · Bảng kê thanh toán
                  </p>
                </div>
              </div>
            )}

            {dirty && (
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => { setFromDay(config?.fromDay ?? 26); setToDay(config?.toDay ?? 25) }} className="text-sm">
                  Huỷ
                </Button>
                <PulseHint hintKey="settings-save">
                  <Button onClick={handleSave} className="text-sm" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                    Lưu thay đổi
                  </Button>
                </PulseHint>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xác nhận thay đổi kỳ lương?</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Kỳ lương mới: ngày {fromDay} → ngày {toDay} hàng tháng. Tất cả dữ liệu tổng quan sẽ được tính lại theo kỳ mới.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleConfirmSave} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountantPageShell>
  )
}
