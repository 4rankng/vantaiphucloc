import { useState } from 'react'
import { Wallet, Download, Settings2, Coins, BadgePercent } from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { Drawer, DrawerHero } from '@/components/shared/Drawer'
import { Button } from '@/components/ui'
import { NepoTable } from '@/components/shared/NepoTable'
import type { NepoColumn, NepoFooterCell } from '@/components/shared/NepoTable'
import {
  useSalaryDashboard,
  useExportSalaryExcel,
  useDrivers,
  useDriverBaseSalaryHistory,
  useSetDriverBaseSalary,
} from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'
import { formatCurrency } from '@/data/domain'
import { AnimatedNumber } from '@/components/shared'

interface SalaryRow {
  driverId: number
  driverName: string
  matchedOrderCount: number
  baseSalary: number
  totalEarnings: number
  totalAllowance: number
}

const monoStyle = { fontFamily: 'var(--theme-font-mono)' } as React.CSSProperties

export function SalaryPage() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null)

  const { data: drivers = [] } = useDrivers()
  const { data: dashboardRaw = [], isLoading } = useSalaryDashboard(dateFrom, dateTo)
  const exportMutation = useExportSalaryExcel()

  const dashboard = dashboardRaw as unknown as SalaryRow[]

  const totalEarnings = dashboard.reduce((s, d) => s + (d.totalEarnings ?? 0), 0)
  const totalBaseSalary = dashboard.reduce((s, d) => s + (d.baseSalary ?? 0), 0)
  const totalAllowance = dashboard.reduce((s, d) => s + (d.totalAllowance ?? 0), 0)
  const totalProductivity = totalEarnings - totalBaseSalary - totalAllowance
  const driverCount = dashboard.length

  function handleExport() {
    exportMutation.mutate(
      { startDate: dateFrom, endDate: dateTo },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `Luong_${month}_${year}.xlsx`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        },
      },
    )
  }

  const columns: NepoColumn<SalaryRow>[] = [
    {
      key: 'driver',
      header: 'Tài xế',
      render: (d) => (
        <span className="font-semibold" style={{ color: 'var(--ink)' }}>
          {d.driverName ?? '—'}
        </span>
      ),
    },
    {
      key: 'trips',
      header: 'Chuyến',
      align: 'right',
      width: 80,
      render: (d) => (
        <span
          className="tabular-nums inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', minWidth: 32 }}
        >
          {d.matchedOrderCount ?? 0}
        </span>
      ),
    },
    {
      key: 'base',
      header: 'Lương CB',
      align: 'right',
      width: 145,
      render: (d) => (
        <span className="tabular-nums" style={monoStyle}>{formatCurrency(d.baseSalary ?? 0)}</span>
      ),
    },
    {
      key: 'productivity',
      header: 'Lương SL',
      align: 'right',
      width: 145,
      render: (d) => (
        <span className="tabular-nums" style={monoStyle}>
          {formatCurrency((d.totalEarnings ?? 0) - (d.baseSalary ?? 0) - (d.totalAllowance ?? 0))}
        </span>
      ),
    },
    {
      key: 'allowance',
      header: 'Phụ cấp',
      align: 'right',
      width: 130,
      render: (d) => (
        <span className="tabular-nums" style={monoStyle}>{formatCurrency(d.totalAllowance ?? 0)}</span>
      ),
    },
    {
      key: 'net',
      header: 'Thực lĩnh',
      align: 'right',
      width: 155,
      headerClass: 'nepo-col-net',
      cellClass: 'nepo-col-net',
      render: (d) => (
        <span
          className="tabular-nums font-bold"
          style={{ color: 'var(--accent-2)', fontFamily: 'var(--theme-font-mono)' }}
        >
          {formatCurrency(d.totalEarnings ?? 0)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 52,
      render: (d) => (
        <button
          type="button"
          onClick={() => setSelectedDriver(d.driverId)}
          className="nepo-row-action"
          aria-label="Cấu hình lương cơ bản"
          title="Cấu hình lương cơ bản"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      ),
    },
  ]

  const totalTrips = dashboard.reduce((s, d) => s + (d.matchedOrderCount ?? 0), 0)

  const footerCells: NepoFooterCell[] = [
    { content: 'Tổng' },
    { content: <span className="tabular-nums font-bold">{totalTrips}</span>, align: 'right' },
    { content: <span className="tabular-nums" style={monoStyle}>{formatCurrency(totalBaseSalary)}</span>, align: 'right' },
    { content: <span className="tabular-nums" style={monoStyle}>{formatCurrency(totalProductivity)}</span>, align: 'right' },
    { content: <span className="tabular-nums" style={monoStyle}>{formatCurrency(totalAllowance)}</span>, align: 'right' },
    {
      content: (
        <span className="tabular-nums font-bold" style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--accent-2)' }}>
          {formatCurrency(totalEarnings)}
        </span>
      ),
      align: 'right',
      className: 'nepo-col-net',
    },
    { content: null },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-start justify-between gap-5 flex-wrap">
        <div className="min-w-0">
          <h1 className="typo-display">Lương</h1>
          <p className="typo-body-sm mt-1.5">
            Bảng lương tài xế theo kỳ với chi tiết chuyến, lương cơ bản, năng suất và phụ cấp
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-50"
            style={{ color: 'var(--ink-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
          >
            <Download className="h-3.5 w-3.5" />
            {exportMutation.isPending ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <KpiHeroCard
          label="Tổng thực lĩnh"
          formattedValue={<AnimatedNumber value={totalEarnings} format="currency" />}
          value={totalEarnings}
          icon={Wallet}
          color="amber"
          sublabel={`${driverCount} tài xế`}
          className="card-hover-lift"
        />
        <KpiHeroCard
          label="Lương cơ bản"
          formattedValue={<AnimatedNumber value={totalBaseSalary} format="currency" />}
          value={totalBaseSalary}
          icon={Coins}
          color="blue"
          sublabel="Kỳ hiện tại"
          className="card-hover-lift"
        />
        <KpiHeroCard
          label="Năng suất + phụ cấp"
          formattedValue={<AnimatedNumber value={totalProductivity + totalAllowance} format="currency" />}
          value={totalProductivity + totalAllowance}
          icon={BadgePercent}
          color="emerald"
          sublabel={`Năng suất ${formatCurrency(totalProductivity)}`}
          className="card-hover-lift"
        />
      </div>

      <NepoTable
        columns={columns}
        data={dashboard}
        rowKey={(d) => d.driverId}
        isLoading={isLoading}
        emptyText="Chưa có dữ liệu lương cho kỳ này"
        minWidth={700}
        footerCells={footerCells}
      />

      {selectedDriver !== null && (
        <BaseSalaryDrawer
          driverId={selectedDriver}
          drivers={drivers}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  )
}

// ─── Base Salary Drawer ───────────────────────────────────────────────────────

interface DriverShape {
  id: number
  fullName: string | null
  username: string
}

function BaseSalaryDrawer({
  driverId,
  drivers,
  onClose,
}: {
  driverId: number
  drivers: DriverShape[]
  onClose: () => void
}) {
  const [baseSalary, setBaseSalary] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const { data: history = [] } = useDriverBaseSalaryHistory(driverId)
  const setMutation = useSetDriverBaseSalary()

  const driver = drivers.find(d => d.id === driverId)
  const currentBase = history[0]?.baseSalary ?? 0

  return (
    <Drawer
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Cấu hình"
      title={`Lương cơ bản — ${driver?.fullName ?? driver?.username ?? `ID ${driverId}`}`}
      meta={driver?.username ? `@${driver.username}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button
            variant="default"
            onClick={() => {
              setMutation.mutate(
                { driverId, baseSalary: Number(baseSalary), effectiveFrom, note: note || null },
                { onSuccess: onClose },
              )
            }}
            disabled={!baseSalary || setMutation.isPending}
          >
            {setMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <DrawerHero
        label="Lương cơ bản hiện tại"
        value={formatCurrency(currentBase)}
        meta={history[0]?.effectiveFrom ? `Áp dụng từ ${history[0].effectiveFrom}` : 'Chưa thiết lập'}
      />

      <div className="space-y-4">
        <div>
          <label className="nepo-field-label" htmlFor="new-base-salary">Lương cơ bản mới</label>
          <input
            id="new-base-salary"
            type="number"
            value={baseSalary}
            onChange={e => setBaseSalary(e.target.value)}
            className="nepo-input tabular-nums"
            placeholder="0"
          />
        </div>
        <div>
          <label className="nepo-field-label" htmlFor="effective-from">Áp dụng từ</label>
          <input
            id="effective-from"
            type="date"
            value={effectiveFrom}
            onChange={e => setEffectiveFrom(e.target.value)}
            className="nepo-input"
          />
        </div>
        <div>
          <label className="nepo-field-label" htmlFor="note">Ghi chú</label>
          <input
            id="note"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="nepo-input"
            placeholder="Tùy chọn..."
          />
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-6">
          <p
            className="m-0 mb-2 uppercase font-semibold"
            style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--ink-3)' }}
          >
            Lịch sử thay đổi
          </p>
          <div className="space-y-1.5">
            {history.map(h => (
              <div
                key={h.id}
                className="flex items-center justify-between px-3.5 py-2.5"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-sm)',
                }}
              >
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)' }}>
                  {h.effectiveFrom}
                </span>
                <span className="tabular-nums font-semibold" style={{ fontSize: 13, color: 'var(--ink)' }}>
                  {formatCurrency(h.baseSalary)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  )
}
