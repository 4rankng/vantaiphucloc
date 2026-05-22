import { useState, useCallback } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { Pill } from '@/components/shared/Pill'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { InfoBanner } from '@/components/shared/InfoBanner'
import { Button } from '@/components/ui'
import { useClients, useExportDoiSoatExcel } from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'

export function SettlementPage() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const { data: clients = [] } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const exportMutation = useExportDoiSoatExcel()

  const handleExport = useCallback(() => {
    if (!selectedClientId) return
    exportMutation.mutate(
      { clientId: Number(selectedClientId), dateFrom, dateTo },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `DoiSoat_Client${selectedClientId}_${dateFrom}.xlsx`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        },
      },
    )
  }, [selectedClientId, dateFrom, dateTo, exportMutation])

  const selectedClient = clients.find(c => String(c.id) === selectedClientId)
  const periodLabel = `Tháng ${String(month).padStart(2, '0')}/${year}`

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="typo-display">Xuất đối soát</h1>
          <p className="typo-body-sm mt-1.5">
            Xuất Excel bảng đối soát chuyến vận chuyển theo chủ hàng và kỳ
          </p>
        </div>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
        <Panel
          title="Điều kiện xuất"
          subtitle="Chọn chủ hàng để tạo bảng đối soát cho kỳ hiện tại"
        >
          <div className="space-y-5">
            <div>
              <label className="nepo-field-label">
                Chủ hàng
              </label>
              <InlineSelect
                placeholder="— Chọn chủ hàng —"
                value={selectedClientId}
                options={[
                  { value: '', label: '— Chọn chủ hàng —' },
                  ...clients.map(c => ({ value: String(c.id), label: c.name })),
                ]}
                onChange={setSelectedClientId}
              />
            </div>

            <div>
              <span className="nepo-field-label">Kỳ đối soát</span>
              <div
                className="flex items-center gap-2.5 px-3.5 py-2.5"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-sm)',
                  minHeight: 40,
                }}
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: 'var(--theme-font-mono)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  {periodLabel}
                </span>
                <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                  ({dateFrom} → {dateTo})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="default"
                onClick={handleExport}
                disabled={!selectedClientId || exportMutation.isPending}
              >
                <Download className="h-4 w-4" />
                {exportMutation.isPending ? 'Đang xuất...' : 'Tải Excel'}
              </Button>
            </div>
          </div>
        </Panel>

        <aside className="space-y-4">
          <Panel title="Tóm tắt">
            <dl className="space-y-3.5">
              <div>
                <dt className="text-[11px] uppercase font-semibold mb-1" style={{ color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                  Chủ hàng
                </dt>
                <dd className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
                  {selectedClient?.name ?? <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>Chưa chọn</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase font-semibold mb-1" style={{ color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                  Khoảng thời gian
                </dt>
                <dd
                  className="text-[13px] tabular-nums"
                  style={{ color: 'var(--ink)', fontFamily: 'var(--theme-font-mono)' }}
                >
                  {dateFrom} → {dateTo}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase font-semibold mb-1" style={{ color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                  Định dạng
                </dt>
                <dd>
                  <Pill variant="accent" dot={false}>.xlsx</Pill>
                </dd>
              </div>
            </dl>
          </Panel>

          <InfoBanner variant="info">
            Bảng đối soát bao gồm toàn bộ chuyến đã ghép với chủ hàng đã chọn trong khoảng thời gian.
          </InfoBanner>
        </aside>
      </div>
    </div>
  )
}
