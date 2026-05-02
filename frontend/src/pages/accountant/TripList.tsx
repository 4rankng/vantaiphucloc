import { useRef, useState, useMemo, useCallback } from 'react'
import { useTripOrders, useImportTripOrders, useExportTripOrdersExcel } from '@/hooks/use-queries'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { ImportResultDialog } from '@/components/shared/ImportResultDialog'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { Plus, Upload, Download, FileSpreadsheet, Search } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { downloadTripOrderTemplate } from '@/services/api/tripOrders.api'
import { useMonthParams } from './use-month-params'
import type { TripOrderStatus } from '@/data/domain'

const STATUS_FILTERS: { key: TripOrderStatus | 'ALL'; label: string; color?: string }[] = [
  { key: 'ALL',       label: 'Tất cả' },
  { key: 'DRAFT',     label: 'Nháp',        color: 'var(--theme-text-muted)' },
  { key: 'PENDING',   label: 'Chờ đối soát', color: 'var(--theme-status-warning)' },
  { key: 'COMPLETED', label: 'Hoàn thành',   color: 'var(--theme-status-success)' },
  { key: 'CANCELLED', label: 'Đã huỷ',       color: 'var(--theme-status-error)' },
]

export function TripList() {
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const { data: trips = [], isLoading: loading } = useTripOrders({ dateFrom, dateTo })
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
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
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* ── Month navigator ── */}
      <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />

      {/* ── Header actions ── */}
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
          <Upload className="w-3.5 h-3.5" /> {importing ? 'Đang nhập...' : 'Nhập'}
        </Button>
        <Button
          onClick={handleExport}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
        >
          <Download className="w-3.5 h-3.5" /> Xuất
        </Button>
        <Button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Tải mẫu
        </Button>
      </div>

      {/* ── Status filter tabs ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {STATUS_FILTERS.map(({ key, label, color }) => {
          const isActive = statusFilter === key
          const count = counts[key] ?? 0
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all touch-manipulation"
              style={{
                background: isActive ? (color ?? 'var(--theme-brand-primary)') : 'var(--theme-bg-secondary)',
                color: isActive ? (key === 'ALL' ? 'var(--theme-text-on-brand)' : '#fff') : (color ?? 'var(--theme-text-muted)'),
                border: `1px solid ${isActive ? 'transparent' : 'var(--theme-border-default)'}`,
              }}
            >
              {label}
              {count > 0 && (
                <span className="text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[18px] text-center"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--theme-bg-tertiary)',
                    color: isActive ? '#fff' : 'var(--theme-text-muted)',
                  }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm mã KH, tên KH, container, điểm nhận, điểm trả..."
          className="text-sm pl-9 h-9"
        />
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {search || statusFilter !== 'ALL' ? 'Không tìm thấy lệnh nào' : 'Chưa có lệnh điều hành'}
          </p>
          {!search && statusFilter === 'ALL' && (
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Nhấn "Tạo lệnh" để bắt đầu</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
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
