import { useRef, useState, useMemo, useCallback } from 'react'
import { useTripOrders, useImportTripOrders, useExportTripOrdersExcel } from '@/hooks/use-queries'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { ImportResultDialog } from '@/components/shared/ImportResultDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { FilterToolbar } from '@/components/shared/FilterToolbar'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { StatsGrid } from '@/components/shared/StatsGrid'
import {
  Plus, Upload, Download, FileSpreadsheet, Calendar,
  DollarSign, Clock, CheckCircle2, XCircle, Hash,
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { downloadTripOrderTemplate } from '@/services/api/tripOrders.api'
import { useMonthParams } from './use-month-params'
import { useIsMobile } from '@/hooks/use-mobile'
import type { TripOrder, TripOrderStatus } from '@/data/domain'
import { formatCurrencyFull as fmt } from '@/data/domain'

const STATUS_FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DRAFT', label: 'Nháp', color: 'var(--theme-text-muted)' },
  { key: 'PENDING', label: 'Chờ đối soát', color: 'var(--theme-status-warning)' },
  { key: 'COMPLETED', label: 'Hoàn thành', color: 'var(--theme-status-success)' },
  { key: 'CANCELLED', label: 'Đã huỷ', color: 'var(--theme-status-error)' },
]

function getStatusVariant(status: TripOrderStatus, isConfirmed?: boolean): 'draft' | 'pending' | 'completed' | 'cancelled' | 'success' {
  if (isConfirmed) return 'success'
  switch (status) {
    case 'DRAFT': return 'draft'
    case 'PENDING': return 'pending'
    case 'COMPLETED': return 'completed'
    case 'CANCELLED': return 'cancelled'
    default: return 'pending'
  }
}

function getStatusLabel(status: TripOrderStatus, isConfirmed?: boolean): string {
  if (isConfirmed) return 'Đã xác nhận'
  switch (status) {
    case 'DRAFT': return 'Nháp'
    case 'PENDING': return 'Chờ đối soát'
    case 'COMPLETED': return 'Hoàn thành'
    case 'CANCELLED': return 'Đã huỷ'
    default: return status
  }
}

export function TripList() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const { data: trips = [], isLoading: loading } = useTripOrders({ dateFrom, dateTo })
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const isMobile = useIsMobile(1024)
  const importMutation = useImportTripOrders()
  const exportMutation = useExportTripOrdersExcel()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<TripOrderStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null)

  const basePath = location.pathname.startsWith('/director') ? '/director' : '/accountant'
  const createTripPath = `${basePath}/create-trip`
  const tripDetailPath = (id: number) => `${basePath}/trip/${id}`

  const filtered = useMemo(() => {
    let list = trips
    if (statusFilter !== 'ALL') list = list.filter(t => t.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.client.name.toLowerCase().includes(q) ||
        (t.route ?? '').toLowerCase().includes(q) ||
        (t.code ?? '').toLowerCase().includes(q) ||
        t.containers.some(c => (c.containerNumber ?? '').toLowerCase().includes(q))
      )
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [trips, statusFilter, search])

  // KPI stats derived from the full (unfiltered) trip list
  const stats = useMemo(() => {
    const totalRevenue = trips.reduce((s, t) => s + (t.revenue ?? 0), 0)
    const pending = trips.filter(t => t.status === 'PENDING' || t.status === 'DRAFT').length
    const completed = trips.filter(t => t.status === 'COMPLETED').length
    const cancelled = trips.filter(t => t.status === 'CANCELLED').length
    return { totalRevenue, pending, completed, cancelled }
  }, [trips])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const res = await importMutation.mutateAsync(file)
    if (res.success) {
      if (res.data.errors.length > 0) {
        setImportResult(res.data)
      } else {
        toast.success(`Nhập thành công ${res.data.created} lệnh`)
      }
    } else {
      toast.error('Nhập thất bại')
    }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownloadTemplate = useCallback(async () => {
    const blob = await downloadTripOrderTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mau_nhap_lenh.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExport = async () => {
    const blob = await exportMutation.mutateAsync()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lenh_dieu_hanh.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('ALL')
  }, [])

  // ─── Desktop table columns ────────────────────────────────────────────────

  const columns: Column<TripOrder>[] = [
    {
      key: 'trip',
      header: 'Ngày',
      accessor: (row) => (
        <p className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: 'var(--theme-text-secondary)' }}>
          <Calendar className="h-3 w-3 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
          {row.tripDate ? new Date(row.tripDate).toLocaleDateString('vi-VN') : '—'}
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
            {row.client.name}
          </p>
          <p className="text-xs whitespace-nowrap mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            {row.route}
          </p>
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.client.name,
    },
    {
      key: 'containers',
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
      width: '200px',
      hideOnMobile: true,
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      accessor: (row) => (
        <span className="typo-mono text-sm whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
          {fmt(row.revenue ?? 0)}
        </span>
      ),
      sortable: true,
      sortKey: (row) => row.revenue ?? 0,
      align: 'right',
      width: '140px',
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      accessor: (row) => (
        <StatusBadgePro
          variant={getStatusVariant(row.status, row.isConfirmed)}
          label={getStatusLabel(row.status, row.isConfirmed)}
          size="sm"
          showIcon
        />
      ),
      width: '150px',
    },
  ]

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-lg skeleton-shimmer" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  // ─── Mobile view ──────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div className="space-y-3">
        <PageHeader
          title="Đơn hàng"
          icon="document"
          onAdd={() => navigate(createTripPath)}
          addLabel="Tạo"
        />

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-2">
          <div className="card p-3 flex flex-col gap-0.5">
            <p className="typo-label">
              Doanh thu
            </p>
            <p className="font-mono text-sm" style={{ color: 'var(--theme-text-primary)' }}>
              {fmt(stats.totalRevenue)}
            </p>
          </div>
          <div className="card p-3 flex flex-col gap-0.5">
            <p className="typo-label">
              Tổng lệnh
            </p>
            <p className="font-mono text-sm" style={{ color: 'var(--theme-text-primary)' }}>
              {trips.length} lệnh
            </p>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg flex-1"
            style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>
        </div>

        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mã lệnh, khách hàng, container..."
          statusOptions={STATUS_FILTERS.map(s => ({ ...s, key: s.key }))}
          selectedStatus={statusFilter}
          onStatusChange={(s) => setStatusFilter(s as TripOrderStatus | 'ALL')}
          onClearFilters={handleClearFilters}
        />

        <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
          {filtered.length} lệnh
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {search || statusFilter !== 'ALL' ? 'Không tìm thấy lệnh nào' : 'Chưa có đơn hàng'}
            </p>
            {!search && statusFilter === 'ALL' && (
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Nhấn "Tạo" để bắt đầu</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(trip => (
              <TripOrderCard
                key={trip.id}
                trip={trip}
                onClick={() => navigate(tripDetailPath(trip.id))}
              />
            ))}
          </div>
        )}

        {importResult && (
          <ImportResultDialog
            open={!!importResult}
            onClose={() => setImportResult(null)}
            result={importResult}
            onCreateManual={() => navigate(createTripPath)}
          />
        )}
      </div>
    )
  }

  // ─── Desktop view ─────────────────────────────────────────────────────────

  // Action buttons
  const actionButtons = (
    <div className="flex items-center gap-2 shrink-0">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
      <Button
        onClick={handleDownloadTemplate}
        className="btn-ghost h-9 px-3 text-xs font-semibold"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" /> Tải mẫu
      </Button>
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="btn-ghost h-9 px-3 text-xs font-semibold"
      >
        <Upload className="w-3.5 h-3.5" /> {importing ? 'Đang nhập...' : 'Nhập'}
      </Button>
      <Button
        onClick={handleExport}
        className="btn-ghost h-9 px-3 text-xs font-semibold"
      >
        <Download className="w-3.5 h-3.5" /> Xuất
      </Button>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Page header with actions */}
      <PageHeader
        title="Đơn hàng"
        icon="document"
        onAdd={() => navigate(createTripPath)}
        addLabel="Tạo đơn"
        actions={actionButtons}
      />

      {/* KPI stats */}
      <StatsGrid
        columns={4}
        stats={[
          {
            label: 'Doanh thu tháng',
            value: fmt(stats.totalRevenue),
            icon: <DollarSign className="h-5 w-5" />,
            onClick: () => setStatusFilter('ALL'),
          },
          {
            label: 'Chờ đối soát',
            value: String(stats.pending),
            valueColor: stats.pending > 0 ? 'var(--theme-status-warning)' : undefined,
            icon: <Clock className="h-5 w-5" />,
            onClick: () => setStatusFilter('PENDING'),
          },
          {
            label: 'Hoàn thành',
            value: String(stats.completed),
            valueColor: stats.completed > 0 ? 'var(--theme-status-success)' : undefined,
            icon: <CheckCircle2 className="h-5 w-5" />,
            onClick: () => setStatusFilter('COMPLETED'),
          },
          {
            label: 'Đã huỷ',
            value: String(stats.cancelled),
            valueColor: stats.cancelled > 0 ? 'var(--theme-status-error)' : undefined,
            icon: <XCircle className="h-5 w-5" />,
            onClick: () => setStatusFilter('CANCELLED'),
          },
        ]}
      />

      {/* Table card */}
      <div className="card overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center gap-3 p-3 border-b" style={{ borderColor: 'var(--theme-border-default)' }}>
          <FilterToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm mã lệnh, khách hàng, container..."
            statusOptions={STATUS_FILTERS.map(s => ({ ...s, key: s.key }))}
            selectedStatus={statusFilter}
            onStatusChange={(s) => setStatusFilter(s as TripOrderStatus | 'ALL')}
            onClearFilters={handleClearFilters}
            compact
          />
        </div>

        {/* Data table — no outer border since we're already inside the card */}
        <div className="hidden lg:block overflow-x-auto">
          <DataTablePro
            data={filtered}
            columns={columns}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(tripDetailPath(row.id))}
            loading={loading}
            stickyHeader
            striped
            emptyState={
              <div className="py-12 text-center">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'var(--theme-bg-tertiary)' }}
                >
                  <Hash className="h-6 w-6" style={{ color: 'var(--theme-text-muted)' }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                  {search || statusFilter !== 'ALL' ? 'Không tìm thấy lệnh nào' : 'Chưa có đơn hàng'}
                </p>
                {!search && statusFilter === 'ALL' && (
                  <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    Nhấn "Tạo đơn" để bắt đầu
                  </p>
                )}
              </div>
            }
          />
        </div>

        {/* Mobile: card list */}
        <div className="lg:hidden divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {search || statusFilter !== 'ALL' ? 'Không tìm thấy lệnh nào' : 'Chưa có đơn hàng'}
              </p>
            </div>
          ) : (
            filtered.map(trip => (
              <TripOrderCard
                key={trip.id}
                trip={trip}
                onClick={() => navigate(tripDetailPath(trip.id))}
              />
            ))
          )}
        </div>
      </div>

      {importResult && (
        <ImportResultDialog
          open={!!importResult}
          onClose={() => setImportResult(null)}
          result={importResult}
          onCreateManual={() => navigate(createTripPath)}
        />
      )}
    </div>
  )
}
