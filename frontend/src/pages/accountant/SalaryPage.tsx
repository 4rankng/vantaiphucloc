import { useState } from 'react'
import { Wallet, Download, Settings2, Coins, Users, BadgePercent } from 'lucide-react'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Panel } from '@/components/shared/Panel'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Drawer, DrawerHero } from '@/components/shared/Drawer'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui'
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

  const columns: Column<SalaryRow>[] = [
    {
      key: 'driver',
      header: 'Tài xế',
      render: (d) => <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{d.driverName ?? '—'}</span>,
    },
    {
      key: 'trips',
      header: 'Chuyến',
      align: 'right',
      width: 80,
      render: (d) => <span className="tabular-nums">{d.matchedOrderCount ?? 0}</span>,
    },
    {
      key: 'base',
      header: 'Lương CB',
      align: 'right',
      width: 130,
      render: (d) => <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>{formatCurrency(d.baseSalary ?? 0)}</span>,
    },
    {
      key: 'productivity',
      header: 'Lương SL',
      align: 'right',
      width: 130,
      render: (d) => (
        <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>
          {formatCurrency((d.totalEarnings ?? 0) - (d.baseSalary ?? 0) - (d.totalAllowance ?? 0))}
        </span>
      ),
    },
    {
      key: 'allowance',
      header: 'Phụ cấp',
      align: 'right',
      width: 120,
      render: (d) => <span className="tabular-nums" style={{ color: 'var(--ink-2)' }}>{formatCurrency(d.totalAllowance ?? 0)}</span>,
    },
    {
      key: 'net',
      header: 'Thực lĩnh',
      align: 'right',
      width: 140,
      render: (d) => <span className="tabular-nums font-bold" style={{ color: 'var(--ink)' }}>{formatCurrency(d.totalEarnings ?? 0)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 56,
      render: (d) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedDriver(d.driverId)
          }}
          className="nepo-row-action"
          aria-label="Cấu hình lương cơ bản"
          title="Cấu hình lương cơ bản"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      ),
    },
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
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
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

      <Panel
        title="Bảng lương tài xế"
        subtitle={`Kỳ ${dateFrom} → ${dateTo}`}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exportMutation.isPending}>
            <Download className="h-3.5 w-3.5" />
            {exportMutation.isPending ? 'Đang xuất...' : 'Xuất Excel'}
          </Button>
        }
        flush
      >
        <DataTable
          columns={columns}
          rows={dashboard}
          rowKey={(d) => d.driverId}
          isLoading={isLoading}
          minWidth={800}
          empty={
            <div className="py-10">
              <EmptyState
                icon={<Wallet className="h-5 w-5" />}
                title="Chưa có dữ liệu lương cho kỳ này"
                compact
              />
            </div>
          }
        />
      </Panel>

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
