import { useState, useMemo, useCallback } from 'react'
import { useTripOrders, useClients } from '@/hooks/use-queries'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { fuzzyMatch } from '@/lib/search-utils'
import { RouteDisplay } from '@/components/shared/RouteDisplay'
import { formatDate } from '@/lib/format'
import {
  Upload, Download, Calendar,
  Clock, CheckCircle2, Hash, Search, X,
} from 'lucide-react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useMonthParams } from './use-month-params'
import { useIsMobile } from '@/hooks/use-mobile'
import { DoiSoatExportDialog } from './DoiSoatExportDialog'
import type { TripOrder } from '@/data/domain'
import { formatCurrencyFull as fmt } from '@/data/domain'
import { TripDetailContent } from './TripDetail'

// ─── Status config ─────────────────────────────────────────────────────────────

type SimpleStatus = 'ALL' | 'PENDING' | 'MATCHED'

const STATUS_OPTIONS: { key: SimpleStatus; label: string; color?: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ ghép', color: 'var(--theme-status-warning)' },
  { key: 'MATCHED', label: 'Đã khớp', color: 'var(--theme-status-success)' },
]

function isPending(t: TripOrder) {
  return t.status === 'PENDING' || t.status === 'DRAFT'
}
function isMatched(t: TripOrder) {
  return t.status === 'COMPLETED' || t.status === 'MATCHED'
}

function getStatusVariant(t: TripOrder): 'pending' | 'success' | 'neutral' {
  if (isMatched(t)) return 'success'
  if (isPending(t)) return 'pending'
  return 'neutral'
}
function getStatusLabel(t: TripOrder): string {
  if (isMatched(t)) return 'Đã khớp'
  if (isPending(t)) return 'Chờ ghép'
  return t.status
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TripList() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const { data: trips = [], isLoading: loading } = useTripOrders({ dateFrom, dateTo })
  const { data: clients = [] } = useClients()
  const [doiSoatOpen, setDoiSoatOpen] = useState(false)
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isMobile = useIsMobile(1024)

  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState<SimpleStatus>(() => (searchParams.get('status') as SimpleStatus) || 'ALL')
  const [clientFilter, setClientFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

  const isDirector = location.pathname.startsWith('/director')

  const clientOptions = useMemo(() => [
    { value: 'ALL', label: 'Tất cả khách hàng' },
    ...clients.map(c => ({ value: String(c.id), label: c.name })),
  ], [clients])

  const filtered = useMemo(() => {
    let list = trips
    if (statusFilter === 'PENDING') list = list.filter(isPending)
    else if (statusFilter === 'MATCHED') list = list.filter(isMatched)
    if (clientFilter !== 'ALL') list = list.filter(t => String(t.partner.id) === clientFilter)
    if (search.trim()) {
      const q = search
      list = list.filter(t =>
        fuzzyMatch(t.partner.name, q) ||
        fuzzyMatch(`${t.pickupLocation?.name ?? ''} → ${t.dropoffLocation?.name ?? ''}`, q) ||
        fuzzyMatch(t.code ?? '', q) ||
        t.containers.some(c => fuzzyMatch(c.containerNumber ?? '', q))
      )
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [trips, statusFilter, clientFilter, search])

  const stats = useMemo(() => ({
    pending: trips.filter(isPending).length,
    matched: trips.filter(isMatched).length,
    total: trips.length,
  }), [trips])

  const handleExport = () => {
    setDoiSoatOpen(true)
  }

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('ALL')
    setClientFilter('ALL')
  }, [])

  const hasFilters = !!(search || statusFilter !== 'ALL' || clientFilter !== 'ALL')

  const detailDialog = selectedTripId !== null ? (
    <Dialog open={selectedTripId !== null} onOpenChange={(open) => { if (!open) setSelectedTripId(null) }}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto" hideCloseButton>
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Chi tiết chuyến</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        <TripDetailContent tripId={selectedTripId} onClose={() => setSelectedTripId(null)} />
      </DialogContent>
    </Dialog>
  ) : null

  // Director uses direct navigation (no view toggle, no import dialog)
  if (isDirector) {
    return (
      <>
        <DirectorTripView
          year={year} month={month} onPrev={onPrev} onNext={onNext}
          trips={trips} loading={loading} filtered={filtered}
          stats={stats} clientOptions={clientOptions}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          clientFilter={clientFilter} setClientFilter={setClientFilter}
          search={search} setSearch={setSearch}
          hasFilters={hasFilters} clearFilters={clearFilters}
          handleExport={handleExport}
          isMobile={isMobile}
          onSelectTrip={setSelectedTripId}
        />
        {detailDialog}
      </>
    )
  }

  // ─── Desktop ───────────────────────────────────────────────────────────────

  if (!isMobile) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="typo-display">Đơn hàng</h1>
            <p className="typo-body-sm mt-0.5">Tháng {month}/{year}</p>
          </div>
          <div className="flex items-center gap-3">
            <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
          </div>
        </div>

        {/* KPI + import button row */}
        <div className="flex items-center gap-3">
          <div className="flex gap-3">
            <button
              onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
              className="card p-4 flex items-center gap-3 text-left transition hover:shadow-md active:scale-[0.98]"
              style={{
                borderWidth: statusFilter === 'PENDING' ? 2 : 1,
                borderColor: statusFilter === 'PENDING' ? 'var(--theme-status-warning)' : 'var(--theme-border-default)',
              }}
            >
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)' }}>
                <Clock className="h-5 w-5" style={{ color: 'var(--theme-status-warning)' }} />
              </div>
              <div>
                <p className="text-xl font-bold leading-none" style={{ color: 'var(--theme-status-warning)' }}>{stats.pending}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Chờ ghép</p>
              </div>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'MATCHED' ? 'ALL' : 'MATCHED')}
              className="card p-4 flex items-center gap-3 text-left transition hover:shadow-md active:scale-[0.98]"
              style={{
                borderWidth: statusFilter === 'MATCHED' ? 2 : 1,
                borderColor: statusFilter === 'MATCHED' ? 'var(--theme-status-success)' : 'var(--theme-border-default)',
              }}
            >
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)' }}>
                <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--theme-status-success)' }} />
              </div>
              <div>
                <p className="text-xl font-bold leading-none" style={{ color: 'var(--theme-status-success)' }}>{stats.matched}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Đã khớp</p>
              </div>
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={handleExport} className="btn-ghost h-9 px-3 text-xs font-semibold">
              <Download className="w-3.5 h-3.5 mr-1" /> Xuất đối soát
            </Button>
            <button
              onClick={() => navigate('/accountant/import-orders')}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold transition hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'var(--theme-brand-primary)', color: '#fff' }}
            >
              <Upload className="w-4 h-4" />
              Nhập đơn
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 p-3 flex-wrap" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm khách hàng, container..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border"
                style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
              />
            </div>
            <div className="min-w-[180px] max-w-[280px] shrink-0">
              <InlineSelect
                value={clientFilter}
                options={clientOptions}
                onChange={setClientFilter}
                placeholder="Tất cả khách hàng"
              />
            </div>
            <div className="flex gap-1">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className="px-3 py-1 rounded-full text-xs font-semibold border transition"
                  style={{
                    background: statusFilter === s.key ? (s.color ?? 'var(--theme-brand-primary)') : 'transparent',
                    borderColor: statusFilter === s.key ? (s.color ?? 'var(--theme-brand-primary)') : 'var(--theme-border-default)',
                    color: statusFilter === s.key ? '#fff' : 'var(--theme-text-secondary)',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-medium transition hover:opacity-70" style={{ color: 'var(--theme-text-muted)' }}>
                <X className="h-3 w-3" /> Xoá lọc
              </button>
            )}
            <p className="ml-auto text-xs" style={{ color: 'var(--theme-text-muted)' }}>{filtered.length} đơn hàng</p>
          </div>
          <DataTablePro
            data={filtered}
            columns={buildColumns()}
            rowKey={(row) => row.id}
            onRowClick={(row) => setSelectedTripId(row.id)}
            loading={loading}
            stickyHeader
            striped
            emptyState={
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--theme-bg-tertiary)' }}>
                  <Hash className="h-6 w-6" style={{ color: 'var(--theme-text-muted)' }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                  {hasFilters ? 'Không tìm thấy đơn hàng nào' : 'Chưa có đơn hàng'}
                </p>
                {!hasFilters && (
                  <button
                    onClick={() => navigate('/accountant/import-orders')}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90"
                    style={{ background: 'var(--theme-brand-primary)', color: '#fff' }}
                  >
                    <Upload className="w-4 h-4" /> Nhập đơn từ khách hàng
                  </button>
                )}
              </div>
            }
          />
        </div>

        {detailDialog}
      </div>
    )
  }

  // ─── Mobile ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="typo-h1">Đơn hàng</h1>
        <button
          onClick={() => navigate('/accountant/import-orders')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--theme-brand-primary)', color: '#fff' }}
        >
          <Upload className="w-4 h-4" />
          Nhập đơn
        </button>
      </div>

      <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          className="card p-3 flex flex-col gap-0.5 text-left transition active:scale-[0.98]"
          style={{ borderColor: statusFilter === 'PENDING' ? 'var(--theme-status-warning)' : undefined, borderWidth: statusFilter === 'PENDING' ? 2 : 1 }}
        >
          <p className="typo-label flex items-center gap-1"><Clock className="h-3 w-3" style={{ color: 'var(--theme-status-warning)' }} />Chờ ghép</p>
          <p className="text-lg font-bold" style={{ color: 'var(--theme-status-warning)' }}>{stats.pending}</p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'MATCHED' ? 'ALL' : 'MATCHED')}
          className="card p-3 flex flex-col gap-0.5 text-left transition active:scale-[0.98]"
          style={{ borderColor: statusFilter === 'MATCHED' ? 'var(--theme-status-success)' : undefined, borderWidth: statusFilter === 'MATCHED' ? 2 : 1 }}
        >
          <p className="typo-label flex items-center gap-1"><CheckCircle2 className="h-3 w-3" style={{ color: 'var(--theme-status-success)' }} />Đã khớp</p>
          <p className="text-lg font-bold" style={{ color: 'var(--theme-status-success)' }}>{stats.matched}</p>
        </button>
      </div>
      <div className="flex gap-1">
        {STATUS_OPTIONS.map(s => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)}
            className="px-3 py-1 rounded-full text-xs font-semibold border transition"
            style={{
              background: statusFilter === s.key ? (s.color ?? 'var(--theme-brand-primary)') : 'var(--theme-bg-secondary)',
              borderColor: statusFilter === s.key ? (s.color ?? 'var(--theme-brand-primary)') : 'var(--theme-border-default)',
              color: statusFilter === s.key ? '#fff' : 'var(--theme-text-secondary)',
            }}
          >{s.label}</button>
        ))}
      </div>
      <p className="typo-caption">{filtered.length} đơn hàng</p>
      <div className="space-y-2">
        {filtered.map(trip => (
          <TripOrderCard key={trip.id} trip={trip} onClick={() => setSelectedTripId(trip.id)} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm py-12" style={{ color: 'var(--theme-text-muted)' }}>
            {hasFilters ? 'Không tìm thấy đơn hàng nào' : 'Chưa có đơn hàng'}
          </p>
        )}
      </div>

      {detailDialog}
    </div>
  )
}

// ─── Director-only view (no view toggle, no import) ───────────────────────────

function DirectorTripView({
  year, month, onPrev, onNext,
  trips, loading, filtered, stats, clientOptions,
  statusFilter, setStatusFilter, clientFilter, setClientFilter,
  search, setSearch, hasFilters, clearFilters, handleExport,
  isMobile, onSelectTrip,
}: {
  year: number; month: number; onPrev: () => void; onNext: () => void
  trips: TripOrder[]; loading: boolean; filtered: TripOrder[]
  stats: { pending: number; matched: number; total: number }
  clientOptions: { value: string; label: string }[]
  statusFilter: SimpleStatus; setStatusFilter: (s: SimpleStatus) => void
  clientFilter: string; setClientFilter: (s: string) => void
  search: string; setSearch: (s: string) => void
  hasFilters: boolean; clearFilters: () => void; handleExport: () => void
  isMobile: boolean
  onSelectTrip: (id: number) => void
}) {
  if (isMobile) {
    return (
      <div className="space-y-3 pb-8">
        <h1 className="typo-h1">Đơn hàng</h1>
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className="card p-3 flex flex-col gap-0.5 text-left"
            style={{ borderColor: statusFilter === 'PENDING' ? 'var(--theme-status-warning)' : undefined, borderWidth: statusFilter === 'PENDING' ? 2 : 1 }}
          >
            <p className="typo-label flex items-center gap-1"><Clock className="h-3 w-3" style={{ color: 'var(--theme-status-warning)' }} />Chờ ghép</p>
            <p className="text-lg font-bold" style={{ color: 'var(--theme-status-warning)' }}>{stats.pending}</p>
          </button>
          <button onClick={() => setStatusFilter(statusFilter === 'MATCHED' ? 'ALL' : 'MATCHED')}
            className="card p-3 flex flex-col gap-0.5 text-left"
            style={{ borderColor: statusFilter === 'MATCHED' ? 'var(--theme-status-success)' : undefined, borderWidth: statusFilter === 'MATCHED' ? 2 : 1 }}
          >
            <p className="typo-label flex items-center gap-1"><CheckCircle2 className="h-3 w-3" style={{ color: 'var(--theme-status-success)' }} />Đã khớp</p>
            <p className="text-lg font-bold" style={{ color: 'var(--theme-status-success)' }}>{stats.matched}</p>
          </button>
        </div>
        <div className="space-y-2">
          {filtered.map(trip => (
            <TripOrderCard key={trip.id} trip={trip} onClick={() => onSelectTrip(trip.id)} />
          ))}
        </div>
      </div>
      <DoiSoatExportDialog open={doiSoatOpen} onOpenChange={setDoiSoatOpen} clients={clients} />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typo-display">Đơn hàng</h1>
          <p className="typo-body-sm mt-0.5">Tháng {month}/{year} · {stats.total} đơn hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
          <Button onClick={handleExport} className="btn-ghost h-9 px-3 text-xs font-semibold">
            <Download className="w-3.5 h-3.5 mr-1" /> Xuất đối soát
          </Button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 p-3 flex-wrap" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm khách hàng, container..."
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border"
              style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
            />
          </div>
          <div className="w-44 shrink-0">
            <InlineSelect value={clientFilter} options={clientOptions} onChange={setClientFilter} placeholder="Tất cả khách hàng" />
          </div>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map(s => (
              <button key={s.key} onClick={() => setStatusFilter(s.key)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition"
                style={{
                  background: statusFilter === s.key ? (s.color ?? 'var(--theme-brand-primary)') : 'transparent',
                  borderColor: statusFilter === s.key ? (s.color ?? 'var(--theme-brand-primary)') : 'var(--theme-border-default)',
                  color: statusFilter === s.key ? '#fff' : 'var(--theme-text-secondary)',
                }}
              >{s.label}</button>
            ))}
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
              <X className="h-3 w-3" /> Xoá lọc
            </button>
          )}
          <p className="ml-auto text-xs" style={{ color: 'var(--theme-text-muted)' }}>{filtered.length} đơn hàng</p>
        </div>
        <DataTablePro
          data={filtered}
          columns={buildColumns()}
          rowKey={(row) => row.id}
          onRowClick={(row) => onSelectTrip(row.id)}
          loading={loading}
          stickyHeader
          striped
          emptyState={
            <div className="py-16 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chưa có đơn hàng</p>
            </div>
          }
        />
      </div>
      <DoiSoatExportDialog open={doiSoatOpen} onOpenChange={setDoiSoatOpen} clients={clients} />
    </div>
  )
}

// ─── Shared desktop table columns ─────────────────────────────────────────────

function buildColumns(): Column<TripOrder>[] {
  return [
    {
      key: 'date',
      header: 'Ngày',
      accessor: (row) => (
        <p className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: 'var(--theme-text-secondary)' }}>
          <Calendar className="h-3 w-3 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
          {formatDate(row.tripDate, 'compact')}
        </p>
      ),
      sortable: true,
      sortKey: (row) => row.tripDate ?? '',
      width: '100px',
    },
    {
      key: 'client',
      header: 'Khách hàng',
      accessor: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-sm whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
            {row.partner.name}
          </p>
          <RouteDisplay
            pickupLocation={row.pickupLocation?.name}
            dropoffLocation={row.dropoffLocation?.name}
            className="mt-0.5"
          />
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.partner.name,
    },
    {
      key: 'containers',
      header: 'Container',
      accessor: (row) => (
        <div className="flex gap-1 flex-nowrap">
          {row.containers.length > 0 ? (
            row.containers.slice(0, 3).map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-sm"
                style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
              >
                <span className="font-bold">{c.workType}</span>
                {c.containerNumber && (
                  <span style={{ color: 'var(--theme-text-secondary)' }}>{c.containerNumber}</span>
                )}
              </span>
            ))
          ) : (
            <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>—</span>
          )}
          {row.containers.length > 3 && (
            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--theme-text-muted)' }}>+{row.containers.length - 3}</span>
          )}
        </div>
      ),
      width: '220px',
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      accessor: (row) => (
        <span className="typo-mono text-sm whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
          {row.unitPrice > 0 ? fmt(row.unitPrice) : <span style={{ color: 'var(--theme-text-muted)' }}>—</span>}
        </span>
      ),
      sortable: true,
      sortKey: (row) => row.unitPrice ?? 0,
      align: 'right',
      width: '160px',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      accessor: (row) => (
        <StatusBadgePro
          variant={getStatusVariant(row)}
          label={getStatusLabel(row)}
          size="sm"
          showIcon
        />
      ),
      width: '140px',
    },
  ]
}
