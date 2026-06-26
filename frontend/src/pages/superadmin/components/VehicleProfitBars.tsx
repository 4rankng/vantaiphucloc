import { useMemo, useState } from 'react'
import type { VehiclePnLRow } from '@/services/api/pnl.api'

const fmtFull = (n: number): string => n.toLocaleString('vi-VN')

type NoiBoSortCol = 'plate' | 'revenue' | 'totalCp' | 'profit' | 'margin'
type NgoaiSortCol = 'plate' | 'vendorName' | 'revenue' | 'cpVendor' | 'profit' | 'margin'

function SortPill({
  label,
  active,
  descending,
  onClick,
}: {
  label: string
  active: boolean
  descending: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer"
      style={{
        background: active
          ? 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)'
          : 'transparent',
        color: active ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)',
        border: active
          ? '1px solid color-mix(in srgb, var(--theme-brand-primary) 20%, transparent)'
          : '1px solid transparent',
      }}
    >
      {label}
      {active && <span className="text-[9px]">{descending ? ' ↓' : ' ↑'}</span>}
    </button>
  )
}

/** Internal-fleet (xe nội bộ) profit bar list — no vendor name column. */
export function NoiBoBarList({ rows }: { rows: VehiclePnLRow[] }) {
  const [sort, setSort] = useState<{ col: NoiBoSortCol; dir: 'asc' | 'desc' }>({
    col: 'profit',
    dir: 'desc',
  })

  function toggleSort(col: NoiBoSortCol) {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col, dir: 'desc' }
    )
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aCp = (a.cpXe?.total ?? 0) + (a.cpLuongSanLuong ?? 0) + (a.cpLuongCoBan ?? 0)
      const bCp = (b.cpXe?.total ?? 0) + (b.cpLuongSanLuong ?? 0) + (b.cpLuongCoBan ?? 0)
      const aMargin = a.revenue > 0 ? a.loiNhuan / a.revenue : -Infinity
      const bMargin = b.revenue > 0 ? b.loiNhuan / b.revenue : -Infinity
      const map: Record<NoiBoSortCol, number | string> = {
        plate: a.plate, revenue: a.revenue, totalCp: aCp, profit: a.loiNhuan, margin: aMargin,
      }
      const mapB: Record<NoiBoSortCol, number | string> = {
        plate: b.plate, revenue: b.revenue, totalCp: bCp, profit: b.loiNhuan, margin: bMargin,
      }
      const av = map[sort.col], bv = mapB[sort.col]
      const cmp =
        typeof av === 'string'
          ? av.localeCompare(bv as string)
          : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  const maxAbs = useMemo(
    () => Math.max(1, ...sorted.map(r => Math.abs(r.loiNhuan))),
    [sorted]
  )

  return (
    <div>
      <div
        className="grid items-center gap-x-3 px-2 pb-2 mb-1"
        style={{ gridTemplateColumns: '76px 1fr 68px 38px', borderBottom: '1px solid var(--theme-border-light)' }}
      >
        <SortPill label="Biển số" active={sort.col === 'plate'} descending={sort.dir === 'desc'} onClick={() => toggleSort('plate')} />
        <span />
        <SortPill label="Lãi" active={sort.col === 'profit'} descending={sort.dir === 'desc'} onClick={() => toggleSort('profit')} />
        <span className="type-overline text-right" style={{ color: 'var(--theme-text-muted)' }}>Biên</span>
      </div>

      <div>
        {sorted.map(row => {
          const isProfit = row.loiNhuan >= 0
          const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null
          const barWidth = row.loiNhuan !== 0
            ? Math.max(3, (Math.abs(row.loiNhuan) / maxAbs) * 100)
            : 0

          return (
            <div
              key={row.vehicleId}
              className="grid items-center gap-x-3 py-[7px] px-2 rounded-lg transition-colors duration-100"
              style={{ gridTemplateColumns: '76px 1fr 68px 38px' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span
                className="font-mono text-[12px] font-semibold truncate"
                style={{ color: 'var(--theme-text-primary)' }}
              >
                {row.plate}
              </span>
              <div
                className="h-[6px] rounded-full overflow-hidden"
                style={{ background: 'var(--theme-bg-tertiary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    background: isProfit
                      ? 'linear-gradient(90deg, #005A2D, #00B14F)'
                      : 'linear-gradient(90deg, #DC2626, #EF4444)',
                  }}
                />
              </div>
              <span
                className="font-mono text-[12px] font-bold tabular-nums text-right whitespace-nowrap"
                style={{ color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}
              >
                {row.loiNhuan === 0 ? '0' : `${isProfit ? '+' : ''}${fmtFull(row.loiNhuan)}`}
              </span>
              <span
                className="font-mono text-[11px] tabular-nums text-right"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {marginPct != null ? `${marginPct.toFixed(0)}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Vendor (xe ngoài) profit bar list — shows vendor name under the plate. */
export function NgoaiBarList({ rows }: { rows: VehiclePnLRow[] }) {
  const [sort, setSort] = useState<{ col: NgoaiSortCol; dir: 'asc' | 'desc' }>({
    col: 'profit',
    dir: 'desc',
  })

  function toggleSort(col: NgoaiSortCol) {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col, dir: 'desc' }
    )
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aMargin = a.revenue > 0 ? a.loiNhuan / a.revenue : -Infinity
      const bMargin = b.revenue > 0 ? b.loiNhuan / b.revenue : -Infinity
      const map: Record<NgoaiSortCol, number | string> = {
        plate: a.plate, vendorName: a.vendorName ?? '', revenue: a.revenue,
        cpVendor: a.cpVendor ?? 0, profit: a.loiNhuan, margin: aMargin,
      }
      const mapB: Record<NgoaiSortCol, number | string> = {
        plate: b.plate, vendorName: b.vendorName ?? '', revenue: b.revenue,
        cpVendor: b.cpVendor ?? 0, profit: b.loiNhuan, margin: bMargin,
      }
      const av = map[sort.col], bv = mapB[sort.col]
      const cmp =
        typeof av === 'string'
          ? av.localeCompare(bv as string)
          : (av as number) - (bv as number)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  const maxAbs = useMemo(
    () => Math.max(1, ...sorted.map(r => Math.abs(r.loiNhuan))),
    [sorted]
  )

  return (
    <div>
      <div
        className="grid items-center gap-x-3 px-2 pb-2 mb-1"
        style={{ gridTemplateColumns: '76px 1fr 68px 38px', borderBottom: '1px solid var(--theme-border-light)' }}
      >
        <SortPill label="Biển số" active={sort.col === 'plate'} descending={sort.dir === 'desc'} onClick={() => toggleSort('plate')} />
        <span />
        <SortPill label="Lãi" active={sort.col === 'profit'} descending={sort.dir === 'desc'} onClick={() => toggleSort('profit')} />
        <span className="type-overline text-right" style={{ color: 'var(--theme-text-muted)' }}>Biên</span>
      </div>

      <div>
        {sorted.map(row => {
          const isProfit = row.loiNhuan >= 0
          const marginPct = row.revenue > 0 ? (row.loiNhuan / row.revenue) * 100 : null
          const barWidth = row.loiNhuan !== 0
            ? Math.max(3, (Math.abs(row.loiNhuan) / maxAbs) * 100)
            : 0

          return (
            <div
              key={row.vehicleId}
              className="grid items-center gap-x-3 py-[7px] px-2 rounded-lg transition-colors duration-100"
              style={{ gridTemplateColumns: '76px 1fr 68px 38px' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="min-w-0">
                <span
                  className="font-mono text-[12px] font-semibold block truncate"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  {row.plate}
                </span>
                {row.vendorName && (
                  <span className="block text-[10px] truncate mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                    {row.vendorName}
                  </span>
                )}
              </div>
              <div
                className="h-[6px] rounded-full overflow-hidden"
                style={{ background: 'var(--theme-bg-tertiary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    background: isProfit
                      ? 'linear-gradient(90deg, #005A2D, #00B14F)'
                      : 'linear-gradient(90deg, #DC2626, #EF4444)',
                  }}
                />
              </div>
              <span
                className="font-mono text-[12px] font-bold tabular-nums text-right whitespace-nowrap"
                style={{ color: isProfit ? 'var(--theme-status-success)' : 'var(--theme-status-error)' }}
              >
                {row.loiNhuan === 0 ? '0' : `${isProfit ? '+' : ''}${fmtFull(row.loiNhuan)}`}
              </span>
              <span
                className="font-mono text-[11px] tabular-nums text-right"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {marginPct != null ? `${marginPct.toFixed(0)}%` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
