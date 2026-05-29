import { Loader2, Unlink } from 'lucide-react'
import { type Column } from '@/components/shared/DataTable'
import { getWorkTypeLabel } from '@/data/domain'
import { formatMatchDate } from '@/lib/match-utils'
import { formatDate } from '@/lib/format'
import type { DeliveredTrip } from '@/data/domain'

function money(val: number | undefined | null): string {
  if (!val) return '—'
  return val.toLocaleString('vi-VN')
}

export interface DeliveredTripColumnsOptions {
  /**
   * Requests the unmatch of a delivered trip. The host page is responsible
   * for confirming the destructive action (e.g. via DangerConfirmDialog)
   * before actually calling the unmatch mutation. The trip object is passed
   * in full so the confirm dialog can show identifying details
   * (cont number, route, date) to the user.
   */
  onUnmatch: (trip: DeliveredTrip) => void
  isUnmatchPending: boolean
  unmatchVariables?: number
}

export function getDeliveredTripColumns(opts: DeliveredTripColumnsOptions): Column<DeliveredTrip>[] {
  return [
    {
      key: 'actions',
      header: '',
      width: 44,
      render: (t) => {
        if (!t.bookedTripId) {
          return (
            <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ml-3" style={{ background: '#f59e0b', opacity: 0.85 }} />
          )
        }
        return (
          <button
            title="Bỏ ghép chuyến này"
            onClick={(e) => {
              e.stopPropagation()
              if (opts.isUnmatchPending) return
              opts.onUnmatch(t)
            }}
            disabled={opts.isUnmatchPending}
            className="group relative flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 ease-out hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              color: 'var(--ink-4)',
              background: 'transparent',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.color = '#d97706'
              el.style.background = 'rgba(245,158,11,0.10)'
              el.style.boxShadow = '0 0 0 1.5px rgba(245,158,11,0.25), 0 2px 8px rgba(245,158,11,0.15)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.color = 'var(--ink-4)'
              el.style.background = 'transparent'
              el.style.boxShadow = 'none'
            }}
          >
            {opts.isUnmatchPending && opts.unmatchVariables === t.id
              ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#d97706' }} />
              : <Unlink className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" />}
          </button>
        )
      },
    },
    {
      key: 'date',
      header: 'Ngày đi',
      width: 64,
      sortKey: 'trip_date',
      render: (t) => (
        <span
          className="tabular-nums"
          style={{ color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)', fontSize: 12.5 }}
        >
          {formatMatchDate(t.tripDate)}
        </span>
      ),
    },
    {
      key: 'vessel',
      header: 'Số tàu',
      sortKey: 'vessel',
      render: (t) => (
        <span className="text-[13px] whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>
          {t.vessel || '—'}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Chủ hàng',
      sortKey: 'client_code',
      render: (t) => (
        <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--ink)' }}>
          {t.client?.code || '—'}
        </span>
      ),
    },
    {
      key: 'vendor',
      header: 'Nhà thầu',
      width: 90,
      render: (t) => {
        const name = t.vendor?.name || (t.vendorId ? null : 'Phúc Lộc')
        return (
          <span className="text-[13px] truncate block" style={{ color: name === 'Phúc Lộc' ? 'var(--ink-2)' : 'var(--ink)' }}>
            {name || '—'}
          </span>
        )
      },
    },
    {
      key: 'vehicle',
      header: 'Số xe chạy',
      width: 90,
      sortKey: 'vehicle_plate',
      render: (t) => (
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>
          {t.vehiclePlate || '—'}
        </span>
      ),
    },
    {
      key: 'driverName',
      header: 'Lái xe',
      width: 130,
      render: (t) => (
        <span className="text-[13px] truncate block" style={{ color: 'var(--ink-2)' }}>
          {t.driver?.name || '—'}
        </span>
      ),
    },
    {
      key: 'pickup',
      header: 'Điểm đi',
      sortKey: 'pickup_name',
      render: (t) => (
        <span className="text-[12.5px] truncate block" style={{ color: 'var(--ink-2)' }}>
          {t.pickupLocation?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'dropoff',
      header: 'Điểm đến',
      sortKey: 'dropoff_name',
      render: (t) => (
        <span className="text-[12.5px] truncate block" style={{ color: 'var(--ink-2)' }}>
          {t.dropoffLocation?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'containers',
      header: 'Số Cont',
      width: 150,
      sortKey: 'cont_number',
      render: (t) => {
        if (!t.contNumber) return <span style={{ color: 'var(--ink-4)' }}>—</span>
        return (
          <div className="flex items-center gap-1.5">
            <span
              className="tabular-nums whitespace-nowrap"
              style={{ fontFamily: 'var(--theme-font-mono)', fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}
            >
              {t.contNumber}
            </span>
          </div>
        )
      },
    },
    {
      key: 'contType',
      header: 'Loại Cont',
      width: 64,
      sortKey: 'cont_type',
      render: (t) => {
        const ct = t.contType
        return ct ? (
          <span
            className="text-[10.5px] uppercase font-semibold whitespace-nowrap"
            style={{
              color: 'var(--ink-2)',
              background: 'var(--surface-3)',
              padding: '1px 5px',
              borderRadius: 4,
              letterSpacing: '0.04em',
            }}
          >
            {ct}
          </span>
        ) : (
          <span style={{ color: 'var(--ink-4)' }}>—</span>
        )
      },
    },
    {
      key: 'workType',
      header: 'Tác nghiệp',
      width: 100,
      sortKey: 'work_type',
      render: (t) => {
        const wt = t.workType
        const label = getWorkTypeLabel(wt)
        return label ? (
          <span
            className="text-[11px] font-semibold whitespace-nowrap"
            style={{
              color: 'var(--ink-2)',
              background: 'var(--surface-3)',
              padding: '1px 5px',
              borderRadius: 4,
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </span>
        ) : (
          <span style={{ color: 'var(--ink-4)' }}>—</span>
        )
      },
    },
    {
      key: 'revenue',
      header: 'Cước',
      width: 90,
      sortKey: 'revenue',
      render: (t) => (
        <span
          className="tabular-nums whitespace-nowrap text-[13px]"
          style={{
            color: t.revenue ? 'var(--ink)' : 'var(--ink-4)',
            fontFamily: 'var(--theme-font-mono)',
          }}
        >
          {money(t.revenue)}
        </span>
      ),
    },
    {
      key: 'driverSalary',
      header: 'Lương SL',
      width: 90,
      sortKey: 'driver_salary',
      render: (t) => (
        <span
          className="tabular-nums whitespace-nowrap text-[13px]"
          style={{
            color: t.driverSalary ? 'var(--ink)' : 'var(--ink-4)',
            fontFamily: 'var(--theme-font-mono)',
          }}
        >
          {money(t.driverSalary)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      width: 80,
      sortKey: 'created_at',
      render: (t) => (
        <span
          className="tabular-nums"
          style={{ color: 'var(--ink-2)', fontFamily: 'var(--theme-font-mono)', fontSize: 12.5 }}
        >
          {formatDate(t.createdAt, 'datetime')}
        </span>
      ),
    },
  ]
}
