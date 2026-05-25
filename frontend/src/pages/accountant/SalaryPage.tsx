import { useState, useRef, useEffect } from 'react'
import { Wallet, Download, Coins, BadgePercent } from 'lucide-react'
import { Button } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { KpiHeroCard } from '@/components/shared/KpiHeroCard'
import { NepoTable } from '@/components/shared/NepoTable'
import type { NepoColumn, NepoFooterCell } from '@/components/shared/NepoTable'
import { DriverBaseSalaryDialog } from '@/components/payroll/DriverBaseSalaryDialog'
import {
  useSalaryPeriod,
  useUpsertDriverSalary,
  useInitializeSalaryPeriod,
  useExportSalaryExcel,
  useSalaryDashboard,
} from '@/hooks/use-queries'
import { useMonthParams } from './use-month-params'
import { formatCurrency } from '@/data/domain'
import { AnimatedNumber } from '@/components/shared'
import { FieldActions } from '@/components/shared/ListUtils'
import type { DriverEarnings, DriverSalaryRecord } from '@/services/api/salary.api'

const monoStyle = { fontFamily: 'var(--theme-font-mono)' } as React.CSSProperties

// ─── Inline Edit Cell ────────────────────────────────────────────────────────

function InlineEditCell({
  value,
  onSave,
}: {
  value: number
  onSave: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const save = () => {
    setEditing(false)
    const parsed = parseInt(draft.replace(/\D/g, ''), 10)
    if (!isNaN(parsed) && parsed !== value) onSave(parsed)
  }

  const cancel = () => {
    setDraft(String(value))
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') cancel()
          }}
          inputMode="numeric"
          className="nepo-input text-[12px] tabular-nums"
          style={{ width: '100%', textAlign: 'right', ...monoStyle }}
        />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '100%',
          transform: 'translateY(-50%)',
          paddingLeft: 6,
          zIndex: 20,
        }}>
          <FieldActions onSave={save} onCancel={cancel} />
        </div>
      </div>
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="block w-full text-right tabular-nums transition-colors"
      style={{ cursor: 'text', color: 'var(--ink)', ...monoStyle, borderRadius: 4, padding: '2px 4px', margin: '-2px -4px' }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-3)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      {formatCurrency(value)}
    </span>
  )
}

// ─── Salary Page ─────────────────────────────────────────────────────────────

export function SalaryPage() {
  const { year, month, dateFrom, dateTo, periodStart, periodEnd, onPrev, onNext } = useMonthParams()
  const [dialogDriver, setDialogDriver] = useState<{ id: number; name: string } | null>(null)

  const { data: salaryRecords = [], isLoading: periodLoading } = useSalaryPeriod(dateFrom, dateTo)
  const { data: dashboardRaw = [] } = useSalaryDashboard(dateFrom, dateTo)
  const exportMutation = useExportSalaryExcel()
  const upsertMutation = useUpsertDriverSalary()
  const initializeMutation = useInitializeSalaryPeriod()

  // Merge salary period records with dashboard trip counts.
  // When the period has been initialized, salary records are the source of truth
  // (manual overrides preserved). When not yet initialized, fall back to the
  // on-the-fly dashboard data so drivers always appear even before initialization.
  const dashboard = dashboardRaw as unknown as DriverEarnings[]

  type SalaryRow = DriverSalaryRecord & { matchedOrderCount: number; totalEarnings: number }

  const rows: SalaryRow[] = salaryRecords.length > 0
    ? salaryRecords.map((sr) => {
        const dash = dashboard.find((d) => d.driverId === sr.driverId)
        const matchedOrderCount = dash?.matchedOrderCount ?? 0
        const totalEarnings = sr.basicSalary + sr.bonusSalary + sr.allowance
        return { ...sr, matchedOrderCount, totalEarnings }
      })
    : dashboard.map((d) => ({
        id: 0,
        driverId: d.driverId,
        driverName: d.driverName ?? null,
        driverUsername: null,
        fromDate: dateFrom,
        toDate: dateTo,
        basicSalary: d.baseSalary,
        bonusSalary: d.totalSalary,
        bonusSalaryAuto: null,
        allowance: d.totalAllowance,
        note: null,
        matchedOrderCount: d.matchedOrderCount,
        totalEarnings: d.totalEarnings,
      }))

  const totalEarnings = rows.reduce((s, d) => s + d.totalEarnings, 0)
  const totalBaseSalary = rows.reduce((s, d) => s + d.basicSalary, 0)
  const totalAllowance = rows.reduce((s, d) => s + d.allowance, 0)
  const totalProductivity = rows.reduce((s, d) => s + d.bonusSalary, 0)
  const driverCount = rows.length
  const totalTrips = rows.reduce((s, d) => s + d.matchedOrderCount, 0)

  const notInitialized = salaryRecords.length === 0 && !periodLoading

  function handleUpsert(driverId: number, data: { basicSalary?: number; allowance?: number }) {
    upsertMutation.mutate({ driverId, fromDate: dateFrom, toDate: dateTo, data })
  }

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
      header: 'Lái xe',
      render: (d) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
            {d.driverName ?? d.driverUsername ?? '—'}
          </span>
          {d.driverUsername && (
            <span className="text-xs leading-tight" style={{ color: 'var(--ink-3)' }}>
              {d.driverUsername}
            </span>
          )}
        </div>
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
          {d.matchedOrderCount}
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
          onClick={() => setDialogDriver({ id: d.driverId, name: d.driverName ?? null })}
          className="tabular-nums cursor-pointer transition-colors hover:underline underline-offset-2"
          style={{ ...monoStyle, color: 'var(--accent)' }}
        >
          {formatCurrency(d.basicSalary)}
        </button>
      ),
    },
    {
      key: 'productivity',
      header: 'Lương SL',
      align: 'right',
      width: 145,
      render: (d) => (
        <span
          className="tabular-nums text-sm"
          style={{ color: 'var(--ink-2)', ...monoStyle }}
        >
          {formatCurrency(d.bonusSalary)}
        </span>
      ),
    },
    {
      key: 'allowance',
      header: 'Phụ cấp',
      align: 'right',
      width: 130,
      render: (d) => (
        <InlineEditCell
          value={d.allowance}
          onSave={(v) => handleUpsert(d.driverId, { allowance: v })}
        />
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
          {formatCurrency(d.totalEarnings)}
        </span>
      ),
    },
  ]

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

      <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-2">
        {notInitialized && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => initializeMutation.mutate({ fromDate: dateFrom, toDate: dateTo })}
            disabled={initializeMutation.isPending}
          >
            {initializeMutation.isPending ? 'Đang khởi tạo...' : 'Khởi tạo kỳ lương'}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exportMutation.isPending}
        >
          <Download className="h-3.5 w-3.5" />
          {exportMutation.isPending ? 'Đang xuất...' : 'Xuất Excel'}
        </Button>
      </div>

      <NepoTable
        columns={columns}
        data={rows}
        rowKey={(d) => d.driverId}
        isLoading={periodLoading}
        emptyText={notInitialized ? 'Chưa khởi tạo kỳ lương' : 'Chưa có dữ liệu lương cho kỳ này'}
        minWidth={700}
        footerCells={rows.length > 0 ? footerCells : undefined}
      />
      </div>{/* end controls+table group */}

      <DriverBaseSalaryDialog
        open={dialogDriver !== null}
        onOpenChange={(open) => { if (!open) setDialogDriver(null) }}
        driverId={dialogDriver?.id ?? null}
        driverName={dialogDriver?.name}
      />
    </div>
  )
}
