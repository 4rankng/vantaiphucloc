import { useState, useRef } from 'react'
import { useTripOrders, useImportTripOrders, useExportTripOrdersExcel } from '@/hooks/use-queries'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { Plus, Truck, Upload, Download } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'

export function TripList() {
  const { data: trips = [], isLoading: loading } = useTripOrders()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const importMutation = useImportTripOrders()
  const exportMutation = useExportTripOrdersExcel()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const basePath = location.pathname.startsWith('/director') ? '/director' : '/accountant'
  const createTripPath = `${basePath}/create-trip`
  const tripDetailPath = (id: number) => `${basePath}/trip/${id}`

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const res = await importMutation.mutateAsync(file)
    if (res.success) {
      toast.success(`Nhập thành công ${res.data.created} chuyến`, res.data.errors.length ? `${res.data.errors.length} lỗi` : undefined)
    } else {
      toast.error('Nhập thất bại')
    }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleExport = async () => {
    const blob = await exportMutation.mutateAsync()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'trip_orders.xlsx'
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
      {/* Action bar */}
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
        >
          <Upload className="w-3.5 h-3.5" /> {importing ? 'Đang nhập...' : 'Nhập Excel'}
        </Button>
        <Button
          onClick={handleExport}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
        >
          <Download className="w-3.5 h-3.5" /> Xuất Excel
        </Button>
      </div>

      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--theme-bg-secondary)' }}>
            <Truck className="w-8 h-8" style={{ color: 'var(--theme-text-muted)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chưa có chuyến nào</p>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Nhấn nút bên dưới để tạo chuyến mới</p>
          </div>
          <Button
            onClick={() => navigate(createTripPath)}
            className="hidden lg:flex items-center gap-2 h-10 px-5 font-semibold rounded-xl"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            <Plus className="w-4 h-4" /> Tạo chuyến
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
          {trips.map(trip => (
            <TripOrderCard
              key={trip.id}
              trip={trip}
              onClick={() => navigate(tripDetailPath(trip.id))}
            />
          ))}
        </div>
      )}
      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => navigate(createTripPath)} />
    </div>
  )
}
