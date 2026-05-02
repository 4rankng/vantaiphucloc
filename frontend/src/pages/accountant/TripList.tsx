import { useRef, useState, useMemo, useCallback } from 'react'
import { useTripOrders, useImportTripOrders, useExportTripOrdersExcel } from '@/hooks/use-queries'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { ImportResultDialog } from '@/components/shared/ImportResultDialog'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Plus, Upload, Download, FileSpreadsheet, Search, X, FileText, Filter } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { downloadTripOrderTemplate } from '@/services/api/tripOrders.api'
import { useMonthParams } from './use-month-params'
import { useIsMobile } from '@/hooks/use-mobile'
import type { TripOrderStatus } from '@/data/domain'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: { key: TripOrderStatus | 'ALL'; label: string; color?: string; dot?: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DRAFT', label: 'Nháp', color: 'var(--theme-text-muted)', dot: 'var(--theme-text-muted)' },
  { key: 'PENDING', label: 'Chờ đối soát', color: 'var(--theme-status-warning)', dot: 'var(--theme-status-warning)' },
  { key: 'COMPLETED', label: 'Hoàn thành', color: 'var(--theme-status-success)', dot: 'var(--theme-status-success)' },
  { key: 'CANCELLED', label: 'Đã huỷ', color: 'var(--theme-status-error)', dot: 'var(--theme-status-error)' },
]

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
        t.containers.some(c => (c.containerNumber ?? '').toLowerCase().includes(q))
      )
    }
    return list
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
        <div className="flex items-center gap-4">
          <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => navigate(createTripPath)}
            className="flex items-center gap-2 h-10 px-4 text-sm font-bold rounded-xl transition hover:opacity-90"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            <Plus className="w-4 h-4" /> Tạo lệnh
          </Button>
          
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 h-10 px-3 text-sm font-semibold rounded-xl transition hover:bg-[var(--theme-bg-tertiary)]"
            style={{ 
              background: 'var(--theme-bg-secondary)', 
              color: 'var(--theme-text-primary)',
              border: '1px solid var(--theme-border-default)',
            }}
          >
            <Upload className="w-4 h-4" /> {importing ? 'Đang nhập...' : 'Nhập'}
          </Button>
          
          <Button
            onClick={handleExport}
            className="flex items-center gap-2 h-10 px-3 text-sm font-semibold rounded-xl transition hover:bg-[var(--theme-bg-tertiary)]"
            style={{ 
              background: 'var(--theme-bg-secondary)', 
              color: 'var(--theme-text-primary)',
              border: '1px solid var(--theme-border-default)',
            }}
          >
            <Download className="w-4 h-4" /> Xuất
          </Button>
          
          <Button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 h-10 px-3 text-sm font-semibold rounded-xl transition hover:bg-[var(--theme-bg-tertiary)]"
            style={{ 
              background: 'var(--theme-bg-secondary)', 
              color: 'var(--theme-text-primary)',
              border: '1px solid var(--theme-border-default)',
            }}
          >
            <FileSpreadsheet className="w-4 h-4" /> Tải mẫu
          </Button>
        </div>
      </div>

      {/* Filters section */}
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
            placeholder="Tìm theo mã KH, tên KH, container, biển số, tuyến đường..."
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

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map(({ key, label, color, dot }) => {
            const isActive = statusFilter === key
            const count = counts[key] ?? 0
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all active:scale-[0.97]",
                )}
                style={{
                  background: isActive ? (key === 'ALL' ? 'var(--theme-brand-primary)' : color) : 'var(--theme-bg-tertiary)',
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
          Kết quả tìm kiếm
        </p>
        <span 
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
        >
          {filtered.length} lệnh
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
            <FileText className="w-6 h-6" style={{ color: 'var(--theme-text-muted)' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {search || statusFilter !== 'ALL' ? 'Không tìm thấy lệnh nào' : 'Chưa có đơn hàng'}
          </p>
          {!search && statusFilter === 'ALL' && (
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              Nhấn "Tạo lệnh" để bắt đầu
            </p>
          )}
        </div>
      ) : (
        <div className={cn(
          "grid gap-3",
          isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
        )}>
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
