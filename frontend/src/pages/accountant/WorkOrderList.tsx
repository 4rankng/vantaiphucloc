import { useMemo, useState, useRef } from 'react'
import { Search, Upload, Download, X, FileText, Filter, Briefcase } from 'lucide-react'
import { Input, Button } from '@/components/ui'
import { WorkOrderJobCard } from '@/components/shared/WorkOrderJobCard'
import { useWorkOrders, useUploadCustomerExcel, useExportReconciliationExcel, useClients } from '@/hooks/use-queries'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import type { WorkOrder } from '@/data/domain'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'PENDING' | 'MATCHED' | 'COMPLETED'

const STATUS_OPTIONS: { value: StatusFilter; label: string; color?: string; dot?: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ khớp', color: 'var(--theme-status-warning)', dot: 'var(--theme-status-warning)' },
  { value: 'MATCHED', label: 'Đã khớp', color: 'var(--theme-status-info)', dot: 'var(--theme-status-info)' },
  { value: 'COMPLETED', label: 'Hoàn thành', color: 'var(--theme-status-success)', dot: 'var(--theme-status-success)' },
]

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
        w.containers.some(c => (c.containerNumber ?? '').toLowerCase().includes(q))
      )
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [workOrders, statusFilter, search])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: workOrders.length }
    workOrders.forEach(w => { map[w.status] = (map[w.status] ?? 0) + 1 })
    return map
  }, [workOrders])

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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-display" style={{ color: 'var(--theme-text-primary)' }}>
            Đối soát phiếu tài xế
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            Quản lý và khớp phiếu với lệnh điều phối
          </p>
        </div>
        
        {/* Excel action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 h-10 px-4 text-sm font-bold rounded-xl transition hover:opacity-90"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            <Upload className="w-4 h-4" /> Nhập Excel KH
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || !selectedClient}
            className="flex items-center gap-2 h-10 px-3 text-sm font-semibold rounded-xl transition hover:bg-[var(--theme-bg-tertiary)]"
            style={{ 
              background: 'var(--theme-bg-secondary)', 
              color: 'var(--theme-text-primary)',
              border: '1px solid var(--theme-border-default)',
            }}
          >
            <Download className="w-4 h-4" /> Xuất Excel
          </Button>
        </div>
      </div>

      {/* Excel filter panel */}
      <div 
        className="rounded-2xl p-4"
        style={{ 
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
        }}
      >
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--theme-text-muted)' }}>
          Bộ lọc Excel đối soát
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value ? Number(e.target.value) : '')}
            className="h-10 rounded-xl px-3 text-sm w-full"
            style={{ 
              background: 'var(--theme-bg-tertiary)', 
              border: '1px solid var(--theme-border-default)', 
              color: 'var(--theme-text-primary)' 
            }}
          >
            <option value="">Chọn khách hàng</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.code ? `[${c.code}] ` : ''}{c.name}
              </option>
            ))}
          </select>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)}
            placeholder="Từ ngày"
            className="h-10 rounded-xl px-3 text-sm"
            style={{ 
              background: 'var(--theme-bg-tertiary)', 
              border: '1px solid var(--theme-border-default)', 
              color: 'var(--theme-text-primary)' 
            }} 
          />
          <input 
            type="date" 
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)}
            placeholder="Đến ngày"
            className="h-10 rounded-xl px-3 text-sm"
            style={{ 
              background: 'var(--theme-bg-tertiary)', 
              border: '1px solid var(--theme-border-default)', 
              color: 'var(--theme-text-primary)' 
            }} 
          />
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={exporting || !selectedClient}
              className="flex-1 flex items-center justify-center gap-2 h-10 px-3 text-sm font-semibold rounded-xl"
              style={{ 
                background: selectedClient ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', 
                color: selectedClient ? '#fff' : 'var(--theme-text-muted)',
              }}
            >
              <Download className="w-4 h-4" /> Xuất
            </Button>
          </div>
        </div>
      </div>

      {/* Search and status filter */}
      <div 
        className="rounded-2xl p-4"
        style={{ 
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
        }}
      >
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo biển số, tài xế, khách hàng, container..."
            className="text-sm pl-11 pr-10 h-11 rounded-xl"
            style={{ 
              background: 'var(--theme-bg-tertiary)', 
              border: '1px solid transparent',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center transition hover:bg-[var(--theme-border-default)]"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_OPTIONS.map(({ value, label, color, dot }) => {
            const isActive = statusFilter === value
            const count = counts[value] ?? 0
            return (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all active:scale-[0.97]"
                style={{
                  background: isActive ? (value === 'all' ? 'var(--theme-brand-primary)' : color) : 'var(--theme-bg-tertiary)',
                  color: isActive ? '#fff' : (color ?? 'var(--theme-text-secondary)'),
                }}
              >
                {dot && !isActive && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}
                {label}
                {count > 0 && (
                  <span 
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--theme-bg-secondary)',
                      color: isActive ? '#fff' : 'var(--theme-text-muted)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          Danh sách phiếu
        </p>
        <span 
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
        >
          {filtered.length} phiếu
        </span>
      </div>

      {/* Results list */}
      {filtered.length === 0 ? (
        <div 
          className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
          style={{ 
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
          }}
        >
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            <Briefcase className="w-6 h-6" style={{ color: 'var(--theme-text-muted)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {search || statusFilter !== 'all' ? 'Không tìm thấy phiếu nào' : 'Chưa có phiếu nào'}
          </p>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            Phiếu tài xế sẽ xuất hiện khi được gửi từ app
          </p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-3",
          isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
        )}>
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
            className="rounded-2xl p-6 w-full max-w-md space-y-4"
            style={{ background: 'var(--theme-bg-secondary)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                Tải lên Excel đối soát
              </p>
              <button 
                onClick={() => setUploadOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition hover:bg-[var(--theme-bg-tertiary)]"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-11 rounded-xl px-4 text-sm"
              style={{ 
                background: 'var(--theme-bg-tertiary)', 
                border: '1px solid var(--theme-border-default)', 
                color: 'var(--theme-text-primary)' 
              }}
            >
              <option value="">Chọn khách hàng</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code ? `[${c.code}] ` : ''}{c.name}
                </option>
              ))}
            </select>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--theme-text-muted)' }}>
                  Từ ngày
                </label>
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full h-11 rounded-xl px-3 text-sm"
                  style={{ 
                    background: 'var(--theme-bg-tertiary)', 
                    border: '1px solid var(--theme-border-default)', 
                    color: 'var(--theme-text-primary)' 
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
                  className="w-full h-11 rounded-xl px-3 text-sm"
                  style={{ 
                    background: 'var(--theme-bg-tertiary)', 
                    border: '1px solid var(--theme-border-default)', 
                    color: 'var(--theme-text-primary)' 
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
              className="w-full h-24 rounded-xl text-sm font-medium border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2"
              style={{ 
                borderColor: file ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)', 
                color: file ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)',
                background: file ? 'var(--theme-brand-primary-light)' : 'transparent',
              }}
            >
              <Upload className="w-5 h-5" />
              {file ? file.name : 'Chọn file Excel (.xlsx)'}
            </button>
            
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={() => setUploadOpen(false)} 
                disabled={uploading}
                className="flex-1 h-11 text-sm font-semibold rounded-xl"
                style={{ 
                  background: 'var(--theme-bg-tertiary)', 
                  color: 'var(--theme-text-primary)',
                }}
              >
                Huỷ
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={uploading || !file || !selectedClient}
                className="flex-1 h-11 text-sm font-bold rounded-xl"
                style={{ 
                  background: 'var(--theme-brand-primary)', 
                  color: '#fff',
                  opacity: (!file || !selectedClient) ? 0.5 : 1,
                }}
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
