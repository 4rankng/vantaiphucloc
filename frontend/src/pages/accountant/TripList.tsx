import { useRef, useState, useMemo, useCallback } from 'react'
import { useTripOrders, useImportTripOrders, useExportTripOrdersExcel } from '@/hooks/use-queries'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { ImportResultDialog } from '@/components/shared/ImportResultDialog'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { FilterToolbar } from '@/components/shared/FilterToolbar'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { PageContainer } from '@/components/shared/PageContainer'
import { Plus, Upload, Download, FileSpreadsheet, Eye, Truck, Calendar } from 'lucide-react'
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
  const isMobile = useIsMobile()
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
        (t.clientName ?? '').toLowerCase().includes(q) ||
        (t.tractorPlate ?? '').toLowerCase().includes(q) ||
        (t.route ?? '').toLowerCase().includes(q) ||
        (t.driverName ?? '').toLowerCase().includes(q) ||
        (t.code ?? '').toLowerCase().includes(q) ||
        t.containers.some(c => (c.containerNumber ?? '').toLowerCase().includes(q))
      )
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [trips, statusFilter, search])

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: trips.length }
    trips.forEach(t => { map[t.status] = (map[t.status] ?? 0) + 1 })
    return map
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

  // Table columns for desktop
  const columns: Column<TripOrder>[] = [
    {
      key: 'code',
      header: 'Mã lệnh',
      accessor: (row) => (
        <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          {row.code}
        </span>
      ),
      sortable: true,
      sortKey: (row) => row.code,
      width: '120px',
    },
    {
      key: 'date',
      header: 'Ngày',
      accessor: (row) => (
        <span className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
          {row.tripDate ? new Date(row.tripDate).toLocaleDateString('vi-VN') : '-'}
        </span>
      ),
      sortable: true,
      sortKey: (row) => row.tripDate ?? '',
      width: '110px',
    },
    {
      key: 'client',
      header: 'Khách hàng',
      accessor: (row) => (
        <div className="min-w-0">
          <p className="font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
            {row.clientName}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
            {row.route}
          </p>
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.clientName ?? '',
    },
    {
      key: 'vehicle',
      header: 'Phương tiện',
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
          <span>{row.tractorPlate || '-'}</span>
        </div>
      ),
      width: '130px',
      hideOnMobile: true,
    },
    {
      key: 'driver',
      header: 'Tài xế',
      accessor: (row) => row.driverName || '-',
      sortable: true,
      sortKey: (row) => row.driverName ?? '',
      hideOnMobile: true,
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      accessor: (row) => (
        <span className="font-mono font-semibold tabular-nums">
          {fmt(row.revenue ?? 0)}
        </span>
      ),
      sortable: true,
      sortKey: (row) => row.revenue ?? 0,
      align: 'right',
      width: '130px',
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
        />
      ),
      width: '130px',
    },
  ]

  const rowActions = [
    {
      label: 'Xem chi tiết',
      icon: <Eye className="h-4 w-4" />,
      onClick: (row: TripOrder) => navigate(tripDetailPath(row.id)),
    },
  ]

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => navigate(createTripPath)}
        className="flex items-center gap-1.5 h-9 px-4 text-sm font-bold rounded-xl"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
      >
        <Plus className="w-4 h-4" /> Tạo lệnh
      </Button>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="hidden sm:flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl"
        style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
      >
        <Upload className="w-3.5 h-3.5" /> {importing ? 'Đang nhập...' : 'Nhập'}
      </Button>
      <Button
        onClick={handleExport}
        className="hidden sm:flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl"
        style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
      >
        <Download className="w-3.5 h-3.5" /> Xuất
      </Button>
      <Button
        onClick={handleDownloadTemplate}
        className="hidden lg:flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl"
        style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
      >
        <FileSpreadsheet className="w-3.5 h-3.5" /> Tải mẫu
      </Button>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    )
  }

  // Mobile view with cards
  if (isMobile) {
    return (
      <div className="space-y-3">
        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />

        {/* Header actions mobile */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate(createTripPath)}
            className="flex items-center gap-1.5 h-9 px-4 text-sm font-bold rounded-xl"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            <Plus className="w-4 h-4" /> Tạo lệnh
          </Button>
          <div className="flex-1" />
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
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

        {/* Count */}
        <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
          {filtered.length} lệnh
        </p>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {search || statusFilter !== 'ALL' ? 'Không tìm thấy lệnh nào' : 'Chưa có đơn hàng'}
            </p>
            {!search && statusFilter === 'ALL' && (
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Nhấn "Tạo lệnh" để bắt đầu</p>
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

  // Desktop view with DataTablePro
  return (
    <PageContainer
      title="Lệnh điều phối"
      subtitle={`${filtered.length} lệnh trong tháng ${month}/${year}`}
      actions={headerActions}
    >
      <div className="space-y-4">
        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
        </div>

        {/* Filters */}
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mã lệnh, khách hàng, tài xế, container, biển số..."
          statusOptions={STATUS_FILTERS.map(s => ({ ...s, key: s.key }))}
          selectedStatus={statusFilter}
          onStatusChange={(s) => setStatusFilter(s as TripOrderStatus | 'ALL')}
          onClearFilters={handleClearFilters}
        />

        {/* Data table */}
        <DataTablePro
          data={filtered}
          columns={columns}
          rowKey={(row) => row.id}
          onRowClick={(row) => navigate(tripDetailPath(row.id))}
          rowActions={rowActions}
          loading={loading}
          stickyHeader
          striped
          emptyState={
            <div className="py-8 text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                {search || statusFilter !== 'ALL' ? 'Không tìm thấy lệnh nào' : 'Chưa có đơn hàng'}
              </p>
              {!search && statusFilter === 'ALL' && (
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  Nhấn "Tạo lệnh" để bắt đầu
                </p>
              )}
            </div>
          }
        />
      </div>

      {importResult && (
        <ImportResultDialog
          open={!!importResult}
          onClose={() => setImportResult(null)}
          result={importResult}
          onCreateManual={() => navigate(createTripPath)}
        />
      )}
    </PageContainer>
  )
}
