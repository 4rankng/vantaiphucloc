import { useMemo, useState } from 'react'
import { Search, Upload, Download } from 'lucide-react'
import { Input, Button } from '@/components/ui'
import { WorkOrderJobCard } from '@/components/shared/WorkOrderJobCard'
import { DataTable } from '@/components/shared/DataTable'
import { useIsMobile } from '@/hooks/use-mobile'
import { useWorkOrders, useTripOrders, useUploadCustomerExcel, useExportReconciliationExcel, useClients } from '@/hooks/use-queries'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/atoms/Toast'
import { type WorkOrder } from '@/data/domain'

export function WorkOrderList() {
  const navigate = useNavigate()
  const toast = useToast()
  const isMobile = useIsMobile(1024)
  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders()
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders()
  const { data: clients = [] } = useClients()
  const { mutate: uploadExcel, isPending: uploading } = useUploadCustomerExcel()
  const { mutate: exportExcel, isPending: exporting } = useExportReconciliationExcel()
  const [searchPlate, setSearchPlate] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<number | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const loading = loadingWO || loadingTrips

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatched = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])

  const filtered = useMemo(() => {
    if (!searchPlate.trim()) return unmatched
    return unmatched.filter(w => w.tractorPlate.toLowerCase().includes(searchPlate.toLowerCase()))
  }, [unmatched, searchPlate])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = () => {
    if (!file || !selectedClient) {
      toast.error('Lỗi', 'Vui lòng chọn file và khách hàng')
      return
    }
    uploadExcel(
      { file, clientId: selectedClient, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      {
        onSuccess: (res) => {
          toast.success('Thành công', `Đã tải lên ${res.data.totalContainers} container`)
          setUploadModalOpen(false)
          setFile(null)
          setSelectedClient(null)
          setDateFrom('')
          setDateTo('')
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
      { clientId: selectedClient, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      {
        onSuccess: (blob) => {
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `reconciliation_client_${selectedClient}_${new Date().toISOString().split('T')[0]}.xlsx`
          a.click()
          window.URL.revokeObjectURL(url)
          toast.success('Thành công', 'Đã xuất file Excel')
        },
        onError: () => toast.error('Lỗi', 'Không thể xuất file Excel'),
      }
    )
  }

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => setUploadModalOpen(true)}
          className="h-10 text-sm font-semibold"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Upload className="w-4 h-4 mr-1.5" />
          Tải lên Excel
        </Button>
        <Button
          onClick={handleExport}
          disabled={exporting || !selectedClient}
          className="h-10 text-sm font-semibold"
          style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}
        >
          <Download className="w-4 h-4 mr-1.5" />
          Xuất Excel
        </Button>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-4 w-full max-w-md" style={{ background: 'var(--theme-bg-primary)' }}>
            <h3 className="text-base font-bold mb-4" style={{ color: 'var(--theme-text-primary)' }}>
              Tải lên file Excel đối soát
            </h3>
            <div className="space-y-1.5 mb-3">
              <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Khách hàng</label>
              <select
                value={selectedClient || ''}
                onChange={e => setSelectedClient(Number(e.target.value))}
                className="w-full h-10 rounded-xl px-3 text-sm"
                style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
              >
                <option value="">Chọn khách hàng</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.code || c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Từ ngày</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm"
                  style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Đến ngày</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm"
                  style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
              </div>
            </div>
            <div className="space-y-1.5 mb-4">
              <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>File Excel</label>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect}
                className="w-full h-10 rounded-xl px-3 text-sm"
                style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
              {file && (
                <p className="text-xs mt-1" style={{ color: 'var(--theme-brand-primary)' }}>{file.name}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setUploadModalOpen(false)} disabled={uploading}
                className="flex-1 h-10 text-sm font-semibold"
                style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}>
                Hủy
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !file || !selectedClient}
                className="flex-1 h-10 text-sm font-semibold"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                {uploading ? 'Đang tải...' : 'Tải lên'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
        <Input
          value={searchPlate}
          onChange={e => setSearchPlate(e.target.value)}
          placeholder="Tìm theo biển số..."
          className="text-sm pl-9"
          style={{ background: 'var(--theme-bg-secondary)' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có số công cần đối soát</p>
        </div>
      ) : isMobile ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
          {filtered.map(job => (
            <WorkOrderJobCard
              key={job.id}
              job={job}
              status="unmatched"
              onClick={() => navigate(`/accountant/match/${job.id}`)}
            />
          ))}
        </div>
      ) : (
        <DataTable
          columns={[
            { key: 'id', header: 'Mã', width: '60px', align: 'center' as const, sortable: true },
            {
              key: 'tractorPlate', header: 'Biển số', width: '110px', sortable: true,
              render: (row: Record<string, unknown>) => (
                <span className="text-xs font-mono font-medium">{String(row.tractorPlate)}</span>
              ),
            },
            {
              key: 'driverName', header: 'Tài xế', sortable: true,
              render: (row: Record<string, unknown>) => (
                <span className="text-sm font-medium">{String(row.driverName)}</span>
              ),
            },
            {
              key: 'clientName', header: 'Khách hàng', sortable: true,
              render: (row: Record<string, unknown>) => (
                <span className="text-xs">{String(row.clientName || '—')}</span>
              ),
            },
            {
              key: 'route', header: 'Cung đường', sortable: true,
              render: (row: Record<string, unknown>) => (
                <span className="text-xs">{String(row.route || '—')}</span>
              ),
            },
            {
              key: 'containers', header: 'Container',
              render: (row: Record<string, unknown>) => {
                type ContainerItem = { containerNumber: string; workType: string }
                const containers = (row.containers as ContainerItem[]) || []
                return (
                  <div className="flex flex-wrap gap-1">
                    {containers.map((c, i) => (
                      <span key={i} className="text-xs font-mono">{c.containerNumber}</span>
                    ))}
                  </div>
                )
              },
            },
            {
              key: 'status', header: 'Trạng thái', width: '100px', align: 'center' as const,
              render: (row: Record<string, unknown>) => {
                const status = String(row.status)
                return (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: status === 'PENDING' ? 'var(--theme-status-warning-light)' : 'var(--theme-status-success-light)',
                      color: status === 'PENDING' ? 'var(--theme-status-warning)' : 'var(--theme-status-success)',
                    }}
                  >
                    {status === 'PENDING' ? 'Chờ khớp' : status === 'MATCHED' ? 'Đã khớp' : status}
                  </span>
                )
              },
            },
            {
              key: 'actions', header: '', width: '80px',
              render: (row: Record<string, unknown>) => (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/accountant/match/${row.id}`) }}
                  className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-[var(--theme-bg-tertiary)]"
                  style={{ color: 'var(--theme-brand-primary)' }}
                >
                  Đối soát →
                </button>
              ),
            },
          ]}
          data={filtered as unknown as Record<string, unknown>[]}
          onRowClick={(row) => navigate(`/accountant/match/${(row as unknown as WorkOrder).id}`)}
          searchable={false}
          footer={`${filtered.length} số công chưa đối soát`}
        />
      )}
    </div>
  )
}
