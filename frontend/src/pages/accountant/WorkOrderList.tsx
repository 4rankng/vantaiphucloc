import { useMemo, useState, useRef, useCallback } from 'react'
import { Search, Upload, Download, Eye, Truck, Calendar, Package, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui'
import { WorkOrderJobCard } from '@/components/shared/WorkOrderJobCard'
import { FilterToolbar } from '@/components/shared/FilterToolbar'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { PageContainer } from '@/components/shared/PageContainer'
import { useWorkOrders, useUploadCustomerExcel, useExportReconciliationExcel, useClients } from '@/hooks/use-queries'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import type { WorkOrder } from '@/data/domain'
import { formatCurrencyFull as fmt } from '@/data/domain'

type StatusFilter = 'all' | 'PENDING' | 'MATCHED' | 'COMPLETED'

const STATUS_OPTIONS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ khớp', color: 'var(--theme-status-warning)' },
  { key: 'MATCHED', label: 'Đã khớp', color: 'var(--theme-brand-primary)' },
  { key: 'COMPLETED', label: 'Hoàn thành', color: 'var(--theme-status-success)' },
]

function getStatusVariant(status: string): 'pending' | 'matched' | 'completed' | 'neutral' {
  switch (status) {
    case 'PENDING': return 'pending'
    case 'MATCHED': return 'matched'
    case 'COMPLETED': return 'completed'
    default: return 'neutral'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Chờ khớp'
    case 'MATCHED': return 'Đã khớp'
    case 'COMPLETED': return 'Hoàn thành'
    default: return status
  }
}

export function WorkOrderList() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const toast = useToast()
  const { data: workOrders = [], isLoading: loading } = useWorkOrders()
  const { data: clients = [] } = useClients()
  const { mutate: uploadExcel, isPending: uploading } = useUploadCustomerExcel()
  const { mutate: exportExcel, isPending: exporting } = useExportReconciliationExcel()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Excel state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [excelPanelOpen, setExcelPanelOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<number | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    let result = workOrders
    if (statusFilter !== 'all') result = result.filter(w => w.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(w =>
        (w.tractorPlate ?? '').toLowerCase().includes(q) ||
        (w.driverName ?? '').toLowerCase().includes(q) ||
        (w.clientName ?? '').toLowerCase().includes(q) ||
        (w.code ?? '').toLowerCase().includes(q) ||
        w.containers.some(c => (c.containerNumber ?? '').toLowerCase().includes(q))
      )
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [workOrders, statusFilter, search])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('all')
  }, [])

  const handleUpload = () => {
    if (!file || !selectedClient) {
      toast.error('Lỗi', 'Vui lòng chọn file và khách hàng')
      return
    }
    uploadExcel(
      { file, clientId: Number(selectedClient), dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      {
        onSuccess: () => {
          toast.success('Thành công', 'Đã tải lên file Excel')
          setUploadOpen(false)
          setFile(null)
        },
        onError: () => toast.error('Lỗi', 'Không thể tải lên file Excel'),
      }
    )
  }

  const handleExport = () => {
    if (!selectedClient) {
      toast.error('Lỗi', 'Vui lòng chọn khách hàng')
      return
    }
    exportExcel(
      { clientId: Number(selectedClient), dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      {
        onSuccess: (blob) => {
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `doi_soat_kh_${selectedClient}_${new Date().toISOString().split('T')[0]}.xlsx`
          a.click()
          window.URL.revokeObjectURL(url)
          toast.success('Đã xuất file Excel')
        },
        onError: () => toast.error('Lỗi', 'Không thể xuất file Excel'),
      }
    )
  }

  // Table columns for desktop
  const columns: Column<WorkOrder>[] = [
    {
      key: 'code',
      header: 'Mã phiếu',
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
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '-'}
        </span>
      ),
      sortable: true,
      sortKey: (row) => row.createdAt ?? '',
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
      key: 'driver',
      header: 'Tài xế',
      accessor: (row) => (
        <div className="min-w-0">
          <p className="font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
            {row.driverName || '-'}
          </p>
          {row.tractorPlate && (
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--theme-text-muted)' }}>
              <Truck className="h-3 w-3" />
              {row.tractorPlate}
            </p>
          )}
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.driverName ?? '',
      hideOnMobile: true,
    },
    {
      key: 'container',
      header: 'Container',
      accessor: (row) => {
        const containerCount = row.containers.length
        const firstContainer = row.containers[0]?.containerNumber
        return (
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
            <span>
              {firstContainer || '-'}
              {containerCount > 1 && (
                <span className="ml-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  +{containerCount - 1}
                </span>
              )}
            </span>
          </div>
        )
      },
      width: '150px',
      hideOnMobile: true,
    },
    {
      key: 'earning',
      header: 'Thu nhập TX',
      accessor: (row) => (
        <span className="font-mono font-semibold tabular-nums">
          {fmt(row.earning ?? 0)}
        </span>
      ),
      sortable: true,
      sortKey: (row) => row.earning ?? 0,
      align: 'right',
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      accessor: (row) => (
        <StatusBadgePro
          variant={getStatusVariant(row.status)}
          label={getStatusLabel(row.status)}
          size="sm"
        />
      ),
      width: '120px',
    },
  ]

  const rowActions = [
    {
      label: 'Ghép / Xem chi tiết',
      icon: <Eye className="h-4 w-4" />,
      onClick: (row: WorkOrder) => navigate(`/accountant/match/${row.id}`),
    },
  ]

  // Excel panel component
  const ExcelPanel = () => (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          Nhập / Xuất Excel
        </p>
        <button
          onClick={() => setExcelPanelOpen(!excelPanelOpen)}
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--theme-brand-primary)' }}
        >
          {excelPanelOpen ? 'Thu gọn' : 'Mở rộng'}
          <ChevronDown className={`h-4 w-4 transition-transform ${excelPanelOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {excelPanelOpen && (
        <>
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value ? Number(e.target.value) : '')}
            className="w-full h-10 rounded-xl px-3 text-sm"
            style={{
              background: 'var(--theme-bg-tertiary)',
              border: '1px solid var(--theme-border-default)',
              color: 'var(--theme-text-primary)',
            }}
          >
            <option value="">Chọn khách hàng</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.code ? `[${c.code}] ` : ''}{c.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--theme-text-muted)' }}>
                Từ ngày
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full h-10 rounded-xl px-3 text-sm"
                style={{
                  background: 'var(--theme-bg-tertiary)',
                  border: '1px solid var(--theme-border-default)',
                  color: 'var(--theme-text-primary)',
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--theme-text-muted)' }}>
                Đến ngày
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full h-10 rounded-xl px-3 text-sm"
                style={{
                  background: 'var(--theme-bg-tertiary)',
                  border: '1px solid var(--theme-border-default)',
                  color: 'var(--theme-text-primary)',
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setUploadOpen(true)}
              className="flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-semibold rounded-xl flex-1"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              <Upload className="w-4 h-4" /> Nhập Excel
            </Button>
            <Button
              onClick={handleExport}
              disabled={exporting || !selectedClient}
              className="flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-semibold rounded-xl flex-1"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
            >
              <Download className="w-4 h-4" /> Xuất Excel
            </Button>
          </div>
        </>
      )}
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
        {/* Filters */}
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm biển số, tài xế, container..."
          statusOptions={STATUS_OPTIONS}
          selectedStatus={statusFilter}
          onStatusChange={(s) => setStatusFilter(s as StatusFilter)}
          onClearFilters={handleClearFilters}
        />

        {/* Excel panel */}
        <ExcelPanel />

        {/* Count */}
        <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
          {filtered.length} phiếu
        </p>

        {/* List */}
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--theme-bg-secondary)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {search || statusFilter !== 'all' ? 'Không tìm thấy phiếu nào' : 'Chưa có phiếu nào'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(job => (
              <WorkOrderJobCard
                key={job.id}
                job={job}
                status={job.status === 'PENDING' ? 'unmatched' : job.status === 'MATCHED' ? 'matched' : 'completed'}
                onClick={() => navigate(`/accountant/match/${job.id}`)}
              />
            ))}
          </div>
        )}

        {/* Upload modal */}
        {uploadOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <div
              className="rounded-2xl p-5 w-full max-w-md space-y-3"
              style={{ background: 'var(--theme-bg-primary)' }}
            >
              <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Tải lên Excel đối soát
              </p>
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value ? Number(e.target.value) : '')}
                className="w-full h-10 rounded-xl px-3 text-sm"
                style={{
                  background: 'var(--theme-bg-tertiary)',
                  border: '1px solid var(--theme-border-default)',
                  color: 'var(--theme-text-primary)',
                }}
              >
                <option value="">Chọn khách hàng</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ''}{c.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-10 rounded-xl px-3 text-sm"
                  style={{
                    background: 'var(--theme-bg-tertiary)',
                    border: '1px solid var(--theme-border-default)',
                    color: 'var(--theme-text-primary)',
                  }}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-10 rounded-xl px-3 text-sm"
                  style={{
                    background: 'var(--theme-bg-tertiary)',
                    border: '1px solid var(--theme-border-default)',
                    color: 'var(--theme-text-primary)',
                  }}
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-10 rounded-xl text-sm font-medium border-2 border-dashed transition-colors"
                style={{
                  borderColor: file ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                  color: file ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)',
                }}
              >
                {file ? file.name : 'Chọn file Excel (.xlsx)'}
              </button>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => setUploadOpen(false)}
                  disabled={uploading}
                  className="flex-1 h-10 text-sm font-semibold"
                  style={{
                    background: 'var(--theme-bg-secondary)',
                    color: 'var(--theme-text-primary)',
                    border: '1px solid var(--theme-border-default)',
                  }}
                >
                  Huỷ
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !file || !selectedClient}
                  className="flex-1 h-10 text-sm font-semibold"
                  style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                >
                  {uploading ? 'Đang tải...' : 'Tải lên'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop view with DataTablePro
  return (
    <PageContainer>
      <div className="space-y-4">
        {/* Filters */}
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mã phiếu, biển số, tài xế, khách hàng, container..."
          statusOptions={STATUS_OPTIONS}
          selectedStatus={statusFilter}
          onStatusChange={(s) => setStatusFilter(s as StatusFilter)}
          onClearFilters={handleClearFilters}
        />

        {/* Excel panel */}
        <ExcelPanel />

        {/* Data table */}
        <DataTablePro
          data={filtered}
          columns={columns}
          rowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/accountant/match/${row.id}`)}
          rowActions={rowActions}
          loading={loading}
          stickyHeader
          striped
          emptyState={
            <div className="py-8 text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                {search || statusFilter !== 'all' ? 'Không tìm thấy phiếu nào' : 'Chưa có phiếu nào'}
              </p>
            </div>
          }
        />
      </div>

      {/* Upload modal */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-md space-y-4"
            style={{ background: 'var(--theme-bg-primary)' }}
          >
            <p className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              Tải lên Excel đối soát
            </p>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 rounded-xl px-3 text-sm"
              style={{
                background: 'var(--theme-bg-tertiary)',
                border: '1px solid var(--theme-border-default)',
                color: 'var(--theme-text-primary)',
              }}
            >
              <option value="">Chọn khách hàng</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code ? `[${c.code}] ` : ''}{c.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--theme-text-muted)' }}>
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm"
                  style={{
                    background: 'var(--theme-bg-tertiary)',
                    border: '1px solid var(--theme-border-default)',
                    color: 'var(--theme-text-primary)',
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--theme-text-muted)' }}>
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm"
                  style={{
                    background: 'var(--theme-bg-tertiary)',
                    border: '1px solid var(--theme-border-default)',
                    color: 'var(--theme-text-primary)',
                  }}
                />
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-12 rounded-xl text-sm font-medium border-2 border-dashed transition-colors"
              style={{
                borderColor: file ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                color: file ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)',
              }}
            >
              {file ? file.name : 'Chọn file Excel (.xlsx)'}
            </button>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
                className="flex-1 h-11 text-sm font-semibold rounded-xl"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  color: 'var(--theme-text-primary)',
                  border: '1px solid var(--theme-border-default)',
                }}
              >
                Huỷ
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !file || !selectedClient}
                className="flex-1 h-11 text-sm font-semibold rounded-xl"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
              >
                {uploading ? 'Đang tải...' : 'Tải lên'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
