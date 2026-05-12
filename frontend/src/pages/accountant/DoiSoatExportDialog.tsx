import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { useExportDoiSoatExcel } from '@/hooks/use-queries'
import type { Partner } from '@/data/domain'

interface DoiSoatExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Partner[]
}

/** Returns YYYY-MM-DD for the first day of the current month. */
function firstDayOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** Returns YYYY-MM-DD for today. */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function DoiSoatExportDialog({ open, onOpenChange, clients }: DoiSoatExportDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth)
  const [dateTo, setDateTo] = useState(todayISO)
  const mutation = useExportDoiSoatExcel()

  const clientOptions = [
    { value: '', label: '— Chọn khách hàng —' },
    ...clients
      .filter(c => c.partnerRole !== 'shipping_line')
      .map(c => ({ value: String(c.id), label: c.name })),
  ]

  const canExport = selectedClientId && dateFrom && dateTo

  const handleExport = async () => {
    if (!canExport) return
    try {
      const blob = await mutation.mutateAsync({
        partnerId: Number(selectedClientId),
        dateFrom,
        dateTo,
      })
      // Extract filename from Content-Disposition or use default
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `doi_soat_${dateFrom}_${dateTo}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      onOpenChange(false)
    } catch {
      // Error handled by mutation state
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Xuất đối soát</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Khách hàng select */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Khách hàng</label>
            <InlineSelect
              value={selectedClientId}
              options={clientOptions}
              onChange={setSelectedClientId}
              placeholder="Chọn khách hàng"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Từ ngày</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Đến ngày</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
          <Button
            size="sm"
            disabled={!canExport || mutation.isPending}
            onClick={handleExport}
            style={{ background: 'var(--theme-brand-primary)', color: '#fff' }}
          >
            {mutation.isPending ? 'Đang xuất...' : 'Xuất Excel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
