import { useState } from 'react'
import { Wallet, Download, Coins, BadgePercent } from 'lucide-react'
import { LinkButton } from '@/components/shared/LinkButton'
import { PageHeader } from '@/components/shared/PageHeader'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { NepoTable } from '@/components/shared/NepoTable'
import type { NepoColumn, NepoFooterCell } from '@/components/shared/NepoTable'
import { DriverBaseSalaryDialog } from '@/components/payroll/DriverBaseSalaryDialog'
import {
  useSalaryDashboard,
  useExportSalaryExcel,
  useDrivers,
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
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const [dialogDriver, setDialogDriver] = useState<{ id: number; name: string } | null>(null)

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
        <button
          type="button"
          onClick={() => setDialogDriver({ id: d.driverId, name: d.driverName })}
          className="tabular-nums cursor-pointer transition-colors hover:underline underline-offset-2"
          style={{ ...monoStyle, color: 'var(--accent)' }}
        >
          {formatCurrency(d.baseSalary ?? 0)}
        </button>
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
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Lương"
        subtitle="Bảng lương tài xế theo kỳ với chi tiết chuyến, lương cơ bản, năng suất và phụ cấp"
        lucideIcon={Wallet}
        actions={
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} periodStart={periodStart} periodEnd={periodEnd} />
        }
      />

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

      <div className="flex justify-end">
        <LinkButton
          onClick={handleExport}
          icon={Download}
          variant="muted"
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? 'Đang xuất...' : 'Xuất Excel'}
        </LinkButton>
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

      <DriverBaseSalaryDialog
        open={dialogDriver !== null}
        onOpenChange={(open) => { if (!open) setDialogDriver(null) }}
        driverId={dialogDriver?.id ?? null}
        driverName={dialogDriver?.name}
      />
    </div>
  )
}
