import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { useClients } from '@/hooks/use-queries'
import { apiClient } from '@/services/api'
import { useToast } from '@/components/atoms/Toast'

const MONTHS = [
  { value: '1', label: 'Tháng 1' },
  { value: '2', label: 'Tháng 2' },
  { value: '3', label: 'Tháng 3' },
  { value: '4', label: 'Tháng 4' },
  { value: '5', label: 'Tháng 5' },
  { value: '6', label: 'Tháng 6' },
  { value: '7', label: 'Tháng 7' },
  { value: '8', label: 'Tháng 8' },
  { value: '9', label: 'Tháng 9' },
  { value: '10', label: 'Tháng 10' },
  { value: '11', label: 'Tháng 11' },
  { value: '12', label: 'Tháng 12' },
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function periodPreview(year: number, month: number): { start: string; end: string } {
  const end = new Date(year, month - 1, 25)
  const start = new Date(year, month - 2, 26)
  const fmt = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
  return { start: fmt(start), end: fmt(end) }
}

export function CustomerSettlementReport() {
  const toast = useToast()
  const { data: clients = [], isLoading: loadingClients } = useClients()

  const now = new Date()
  const [clientId, setClientId] = useState('')
  const [year, setYear] = useState(String(now.getFullYear()))
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [downloading, setDownloading] = useState(false)

  const clientOptions = useMemo(
    () =>
      clients.map(c => ({
        value: String(c.id),
        label: c.name,
        sublabel: c.code ? `Mã: ${c.code}` : undefined,
      })),
    [clients],
  )

  const yearNum = Number(year)
  const monthNum = Number(month)
  const periodValid =
    Number.isFinite(yearNum) && yearNum >= 2020 && yearNum <= 2100 &&
    Number.isFinite(monthNum) && monthNum >= 1 && monthNum <= 12

  const period = periodValid ? periodPreview(yearNum, monthNum) : null

  const canExport = !!clientId && periodValid && !downloading

  const handleExport = async () => {
    if (!canExport) return
    setDownloading(true)
    try {
      const { blob, filename } = await apiClient.exportCustomerSettlement({
        clientId: Number(clientId),
        year: yearNum,
        month: monthNum,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Đã xuất báo cáo', filename)
    } catch (err) {
      const detail =
        (err as { message?: string })?.message ?? 'Không thể xuất báo cáo, vui lòng thử lại.'
      toast.error('Lỗi xuất báo cáo', detail)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Xuất bảng kê thanh toán + sản lượng theo kỳ (kỳ 26 tháng trước → 25 tháng này).
        </p>
        <Button
          onClick={handleExport}
          disabled={!canExport}
          className="btn-primary h-9 px-4 text-sm"
        >
          <Download className="w-4 h-4 mr-1.5" />
          {downloading ? 'Đang xuất...' : 'Xuất Excel'}
        </Button>
      </div>

      <div className="card p-5 max-w-3xl">
        <div className="flex items-center gap-2 mb-5">
          <div
            className="h-9 w-9 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'var(--theme-brand-primary-light)' }}
          >
            <FileSpreadsheet
              className="w-4 h-4"
              style={{ color: 'var(--theme-brand-primary)' }}
            />
          </div>
          <div>
            <h3 className="typo-h2">Bảng kê thanh toán &amp; Sản lượng</h3>
            <p className="typo-caption">
              Tệp Excel gồm 2 sheet: <strong>BKTT</strong> (tổng hợp theo tuyến) và{' '}
              <strong>SL</strong> (chi tiết từng cont).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="space-y-1.5 sm:col-span-1">
            <label className="typo-form-label" htmlFor="kh-year">
              Năm
            </label>
            <Input
              id="kh-year"
              type="number"
              min={2020}
              max={2100}
              value={year}
              onChange={e => setYear(e.target.value)}
              className="h-9 text-sm font-mono text-center"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <label className="typo-form-label">Tháng</label>
            <InlineSelect
              placeholder="Chọn tháng"
              value={month}
              options={MONTHS}
              onChange={setMonth}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <label className="typo-form-label">Khách hàng</label>
            <InlineSelect
              placeholder={loadingClients ? 'Đang tải...' : 'Chọn khách hàng'}
              value={clientId}
              options={clientOptions}
              onChange={setClientId}
            />
          </div>
        </div>

        {period && (
          <div
            className="rounded-md px-3 py-2.5 text-sm flex items-center justify-between"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            <span className="typo-caption">Kỳ báo cáo</span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
              {period.start} → {period.end}
            </span>
          </div>
        )}

        {!clientId && (
          <p className="typo-caption mt-3" style={{ color: 'var(--theme-status-warning)' }}>
            Vui lòng chọn khách hàng để bật nút xuất.
          </p>
        )}
      </div>
    </div>
  )
}
