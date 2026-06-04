import { useState, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Loader2, RefreshCw } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  isPending: boolean
  onConfirm: (dateFrom: string, dateTo: string) => void
}

const getPastDateString = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export function SyncPricingDialog({ open, onClose, isPending, onConfirm }: Props) {
  const [dateFrom, setDateFrom] = useState(() => getPastDateString(30))
  const [dateTo, setDateTo] = useState(() => getPastDateString(0))

  useEffect(() => {
    if (open) {
      setDateFrom(getPastDateString(30))
      setDateTo(getPastDateString(0))
    }
  }, [open])

  const handleOpen = useCallback((isOpen: boolean) => {
    if (!isOpen) onClose()
  }, [onClose])

  const handleConfirm = useCallback(() => {
    if (!dateFrom || !dateTo || isPending) return
    onConfirm(dateFrom, dateTo)
  }, [dateFrom, dateTo, isPending, onConfirm])

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : handleOpen}>
      <DialogContent
        className="max-w-sm overflow-hidden p-0 border-0 gap-0"
        style={{ borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}
      >
        <DialogTitle style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
          Đồng bộ cước/lương
        </DialogTitle>

        {/* Header */}
        <div
          className="px-6 pt-5 pb-4"
          style={{ background: 'linear-gradient(135deg, var(--theme-brand-primary, #059669) 0%, var(--theme-brand-primary-dark, #047857) 100%)' }}
        >
          <h3 className="text-white text-base font-semibold" style={{ letterSpacing: '-0.01em' }}>
            Đồng bộ cước/lương chuyến đã ghép
          </h3>
          <p className="text-white/80 text-[13px] mt-1">
            Cập nhật lại giá cước và lương lái xe cho các chuyến đã ghép theo bảng giá mới nhất
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4" style={{ background: 'var(--theme-bg-secondary)' }}>
          <div className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Hệ thống sẽ quét các chuyến <strong>đã ghép</strong> trong khoảng thời gian được chọn và ghi đè cước/lương của chúng bằng cấu hình hiện tại trong bảng giá.
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-[var(--ink-2)]">Từ ngày</p>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ backgroundColor: 'white', color: 'var(--theme-text-primary)' }}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-[var(--ink-2)]">Đến ngày</p>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ backgroundColor: 'white', color: 'var(--theme-text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'var(--theme-bg-secondary)', borderTop: '1px solid var(--theme-border-default)' }}
        >
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            size="sm"
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!dateFrom || !dateTo || isPending}
            size="sm"
            className="rounded-full gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang đồng bộ...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Đồng bộ ngay
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
