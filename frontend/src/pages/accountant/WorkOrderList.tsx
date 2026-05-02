import { useMemo, useState, useRef, useEffect } from 'react'
import { Search, Upload, Download, Link2, FileCheck } from 'lucide-react'
import { Input, Button } from '@/components/ui'
import { WorkOrderJobCard } from '@/components/shared/WorkOrderJobCard'
import { TripOrderCard } from '@/components/shared/TripOrderCard'
import { useWorkOrders, useTripOrders, useUploadCustomerExcel, useExportReconciliationExcel, useClients } from '@/hooks/use-queries'
import { useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '@/components/atoms/Toast'
import type { WorkOrder } from '@/data/domain'

type SubTab = 'match' | 'client'

// ─── Khớp WO–TO sub-tab ──────────────────────────────────────────────────────

function MatchTab() {
  const navigate = useNavigate()
  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders()
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders()
  const [search, setSearch] = useState('')

  const loading = loadingWO || loadingTrips

  const unmatchedWOs = useMemo(() =>
    workOrders.filter(w => w.status === 'PENDING'),
    [workOrders]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return unmatchedWOs
    const q = search.toLowerCase()
    return unmatchedWOs.filter(w =>
      w.tractorPlate.toLowerCase().includes(q) ||
      w.driverName.toLowerCase().includes(q) ||
      w.clientName.toLowerCase().includes(q) ||
      w.containers.some(c => c.containerNumber.toLowerCase().includes(q))
    )
  }, [unmatchedWOs, search])

  if (loading) {
    return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm biển số, tài xế, container..."
          className="text-sm pl-9 h-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
          <Link2 className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {search ? 'Không tìm thấy phiếu nào' : 'Không có phiếu chờ khớp'}
          </p>
          {!search && (
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Tất cả phiếu đã được đối soát</p>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
            {filtered.length} phiếu chờ khớp
          </p>
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
        </>
      )}
    </div>
  )
}

// ─── Đối soát KH sub-tab ─────────────────────────────────────────────────────

function ClientReconcileTab() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders()
  const { data: clients = [] } = useClients()
  const { mutate: uploadExcel, isPending: uploading } = useUploadCustomerExcel()
  const { mutate: exportExcel, isPending: exporting } = useExportReconciliationExcel()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<number | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Trips that are matched but not yet confirmed with client
  const pendingConfirm = useMemo(() =>
    trips.filter(t => t.status === 'COMPLETED' && !t.isConfirmed),
    [trips]
  )

  const handleUpload = () => {
    if (!file || !selectedClient) {
      toast.error('Lỗi', 'Vui lòng chọn file và khách hàng')
      return
    }
    uploadExcel(
      { file, clientId: Number(selectedClient), dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      {
        onSuccess: (res) => {
          toast.success('Thành công', `Đã tải lên ${res.data.totalContainers} container`)
          setUploadOpen(false)
          setFile(null)
          setSelectedClient('')
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

  if (loadingTrips) {
    return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  return (
    <div className="space-y-3">
      {/* Excel actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg flex-1"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Upload className="w-3.5 h-3.5" /> Tải Excel KH
        </Button>
        <Button
          onClick={handleExport}
          disabled={exporting || !selectedClient}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg flex-1"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
        >
          <Download className="w-3.5 h-3.5" /> Xuất Excel
        </Button>
      </div>

      {/* Client + date filter (shared for upload/export) */}
      <div className="rounded-2xl p-3 space-y-2" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Bộ lọc đối soát</p>
        <select
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value ? Number(e.target.value) : '')}
          className="w-full h-9 rounded-xl px-3 text-sm"
          style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
        >
          <option value="">Chọn khách hàng</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.code ? `[${c.code}] ` : ''}{c.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="h-9 rounded-xl px-3 text-sm"
            style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="h-9 rounded-xl px-3 text-sm"
            style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
        </div>
      </div>

      {/* Pending confirmation list */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-text-muted)' }}>
          Lệnh chờ chốt với khách ({pendingConfirm.length})
        </p>
        {pendingConfirm.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <FileCheck className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-status-success)', opacity: 0.6 }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Không có lệnh chờ chốt</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
            {pendingConfirm.map(trip => (
              <TripOrderCard
                key={trip.id}
                trip={trip}
                onClick={() => navigate(`/accountant/trip/${trip.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-5 w-full max-w-md space-y-3" style={{ background: 'var(--theme-bg-primary)' }}>
            <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>Tải lên Excel đối soát</p>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-10 rounded-xl px-3 text-sm"
              style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
            >
              <option value="">Chọn khách hàng</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.code ? `[${c.code}] ` : ''}{c.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="h-10 rounded-xl px-3 text-sm"
                style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="h-10 rounded-xl px-3 text-sm"
                style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }} />
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-10 rounded-xl text-sm font-medium border-2 border-dashed transition-colors"
              style={{ borderColor: file ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)', color: file ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}
            >
              {file ? `📎 ${file.name}` : 'Chọn file Excel (.xlsx)'}
            </button>
            <div className="flex gap-2 pt-1">
              <Button onClick={() => setUploadOpen(false)} disabled={uploading}
                className="flex-1 h-10 text-sm font-semibold"
                style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}>
                Huỷ
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
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function WorkOrderList() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const defaultTab = searchParams.get('tab') === 'client' ? 'client' : 'match'
  const [activeTab, setActiveTab] = useState<SubTab>(defaultTab)

  // Sync tab from URL param changes
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setActiveTab(params.get('tab') === 'client' ? 'client' : 'match')
  }, [location.search])

  return (
    <div className="space-y-3">
      {/* Sub-tab toggle */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }}>
        <button
          onClick={() => setActiveTab('match')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation"
          style={{
            background: activeTab === 'match' ? 'var(--theme-bg-primary)' : 'transparent',
            color: activeTab === 'match' ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
            boxShadow: activeTab === 'match' ? 'var(--theme-shadow-card)' : 'none',
          }}
        >
          <Link2 className="w-3.5 h-3.5" />
          Khớp WO – TO
        </button>
        <button
          onClick={() => setActiveTab('client')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation"
          style={{
            background: activeTab === 'client' ? 'var(--theme-bg-primary)' : 'transparent',
            color: activeTab === 'client' ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
            boxShadow: activeTab === 'client' ? 'var(--theme-shadow-card)' : 'none',
          }}
        >
          <FileCheck className="w-3.5 h-3.5" />
          Đối soát KH
        </button>
      </div>

      {activeTab === 'match' ? <MatchTab /> : <ClientReconcileTab />}
    </div>
  )
}
