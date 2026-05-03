import { useMemo, useState, useRef, useCallback } from 'react'
import { Upload, Truck, Calendar, FileSpreadsheet, X, Sparkles } from 'lucide-react'
import {
  Button,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { WorkOrderJobCard } from '@/components/shared/WorkOrderJobCard'
import { ContBadge } from '@/components/shared/ContBadge'
import { FilterToolbar } from '@/components/shared/FilterToolbar'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { PageContainer } from '@/components/shared/PageContainer'
import { useWorkOrders, useUploadCustomerExcel, useClients, useTripOrders } from '@/hooks/use-queries'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMonthParams } from './use-month-params'
import type { WorkOrder } from '@/data/domain'
import { formatCurrencyFull as fmt } from '@/data/domain'

type StatusFilter = 'all' | 'PENDING' | 'COMPLETED'

const STATUS_OPTIONS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ khớp', color: 'var(--theme-status-warning)' },
  { key: 'COMPLETED', label: 'Hoàn thành', color: 'var(--theme-status-success)' },
]

function getStatusVariant(status: string): 'pending' | 'completed' | 'neutral' {
  switch (status) {
    case 'PENDING': return 'pending'
    case 'MATCHED': return 'completed'
    case 'COMPLETED': return 'completed'
    default: return 'neutral'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Chờ khớp'
    case 'MATCHED': return 'Hoàn thành'
    case 'COMPLETED': return 'Hoàn thành'
    default: return status
  }
}

/** Client-side approximation: count draft trip orders that share ≥1 field with a work order */
function usePotentialMatchCounts(workOrders: import('@/data/domain').WorkOrder[]) {
  const { data: trips = [] } = useTripOrders()
  return useMemo(() => {
    const draftTrips = trips.filter(t => t.status === 'DRAFT' || t.status === 'PENDING')
    const counts = new Map<number, number>()
    for (const wo of workOrders) {
      const woContNums = new Set(wo.containers.map(c => c.containerNumber.replace(/\s/g, '').toUpperCase()))
      let count = 0
      for (const trip of draftTrips) {
        const tripContNums = (trip.containers?.length ? trip.containers : []).map(c => c.containerNumber.replace(/\s/g, '').toUpperCase())
        const contMatch = tripContNums.some(n => woContNums.has(n))
        const clientMatch = trip.clientId === wo.clientId
        const routeMatch = trip.route === wo.route
        if (contMatch || clientMatch || routeMatch) count++
      }
      counts.set(wo.id, count)
    }
    return counts
  }, [workOrders, trips])
}

export function WorkOrderList() {
  const navigate = useNavigate()
  const isMobile = useIsMobile(1024)
  const toast = useToast()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const { data: workOrders = [], isLoading: loading } = useWorkOrders({ dateFrom, dateTo })
  const { data: clients = [] } = useClients()
  const { mutate: uploadExcel, isPending: uploading } = useUploadCustomerExcel()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')

  // Import Excel dialog state
  const [importOpen, setImportOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
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

  const matchCounts = usePotentialMatchCounts(workOrders)

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
      { file, clientId: Number(selectedClient) },
      {
        onSuccess: () => {
          toast.success('Thành công', 'Đã tải lên file Excel')
          setImportOpen(false)
          setFile(null)
          setSelectedClient('')
        },
        onError: () => toast.error('Lỗi', 'Không thể tải lên file Excel'),
      }
    )
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls'))) {
      setFile(dropped)
    } else {
      toast.error('Lỗi', 'Chỉ chấp nhận file .xlsx hoặc .xls')
    }
  }, [toast])

  // Table columns for desktop
  const columns: Column<WorkOrder>[] = [
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
        if (row.containers.length === 0) {
          return <span style={{ color: 'var(--theme-text-muted)' }}>—</span>
        }
        return (
          <div className="flex flex-col gap-0.5">
            {row.containers.slice(0, 2).map((c, i) => (
              <div key={i} className="flex items-center gap-1 flex-nowrap">
                <ContBadge type={c.workType} />
                <span className="text-xs font-mono whitespace-nowrap" style={{ color: 'var(--theme-text-primary)' }}>
                  {c.containerNumber}
                </span>
              </div>
            ))}
          </div>
        )
      },
      width: '220px',
      hideOnMobile: true,
    },
    {
      key: 'earning',
      header: 'Thu nhập TX',
      accessor: (row) => (
        <span className="typo-mono text-sm">
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
        <div className="flex items-center gap-2">
          <StatusBadgePro
            variant={getStatusVariant(row.status)}
            label={getStatusLabel(row.status)}
            size="sm"
          />
          {row.status === 'PENDING' && (() => {
            const count = matchCounts.get(row.id) ?? 0
            if (count === 0) return null
            return (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
                title={`${count} đơn hàng tiềm năng`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {count}
              </span>
            )
          })()}
        </div>
      ),
      width: '160px',
    },
  ]

  const importDialogJsx = (
    <Dialog open={importOpen} onOpenChange={(open) => {
      setImportOpen(open)
      if (!open) { setFile(null); setSelectedClient('') }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nhập Excel đối soát</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Client select */}
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn khách hàng" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.code ? `[${c.code}] ` : ''}{c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* File dropzone */}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 py-8 px-4 text-center"
            style={{
              borderColor: dragOver
                ? 'var(--theme-brand-primary)'
                : file
                  ? 'var(--theme-brand-primary)'
                  : 'var(--theme-border-default)',
              background: dragOver ? 'var(--theme-bg-tertiary)' : 'transparent',
            }}
          >
            {file ? (
              <>
                <FileSpreadsheet className="h-8 w-8" style={{ color: 'var(--theme-brand-primary)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--theme-brand-primary)' }}>
                  {file.name}
                </p>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="flex items-center gap-1 text-xs"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  <X className="h-3 w-3" /> Xoá file
                </button>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8" style={{ color: 'var(--theme-text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                  Kéo thả file vào đây
                </p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  hoặc click để chọn file .xlsx / .xls
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              onClick={() => { setImportOpen(false); setFile(null); setSelectedClient('') }}
              disabled={uploading}
              className="flex-1 h-10 text-sm font-semibold rounded-xl"
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
              className="flex-1 h-10 text-sm font-semibold rounded-xl"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              {uploading ? 'Đang tải...' : 'Tải lên'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-lg skeleton-shimmer" />
        ))}
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        <PageHeader title="Đối soát" icon="package" />

        <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />

        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm biển số, tài xế, container..."
          statusOptions={STATUS_OPTIONS}
          selectedStatus={statusFilter}
          onStatusChange={(s) => setStatusFilter(s as StatusFilter)}
          onClearFilters={handleClearFilters}
          extraAction={
            <Button
              onClick={() => setImportOpen(true)}
              className="h-8 gap-1.5 text-xs font-semibold rounded-lg"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Nhập Excel
            </Button>
          }
        />

        <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
          {filtered.length} phiếu
        </p>

        {filtered.length === 0 ? (
          <div
            className="rounded-lg p-10 text-center card"
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
                status={job.status === 'PENDING' ? 'unmatched' : 'completed'}
                matchCount={matchCounts.get(job.id)}
                onClick={() => navigate(`/accountant/match/${job.id}`)}
              />
            ))}
          </div>
        )}

        {importDialogJsx}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Đối soát"
        actions={
          <Button
            onClick={() => setImportOpen(true)}
            className="btn-primary h-9 gap-1.5 text-xs font-semibold"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Nhập Excel
          </Button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 p-3 border-b" style={{ borderColor: 'var(--theme-border-default)' }}>
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
          <div className="flex-1" />
          <FilterToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm mã phiếu, biển số, tài xế, khách hàng, container..."
            statusOptions={STATUS_OPTIONS}
            selectedStatus={statusFilter}
            onStatusChange={(s) => setStatusFilter(s as StatusFilter)}
            onClearFilters={handleClearFilters}
            compact
          />
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <DataTablePro
            data={filtered}
            columns={columns}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/accountant/match/${row.id}`)}
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

        <div className="lg:hidden divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {search || statusFilter !== 'all' ? 'Không tìm thấy phiếu nào' : 'Chưa có phiếu nào'}
              </p>
            </div>
          ) : (
            filtered.map(job => (
              <WorkOrderJobCard
                key={job.id}
                job={job}
                status={job.status === 'PENDING' ? 'unmatched' : 'completed'}
                matchCount={matchCounts.get(job.id)}
                onClick={() => navigate(`/accountant/match/${job.id}`)}
              />
            ))
          )}
        </div>
      </div>

      {importDialogJsx}
    </div>
  )
}
