import { useMemo, useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, Sparkles, ArrowLeft } from 'lucide-react'
import {
  Button,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import { FilterToolbar } from '@/components/shared/FilterToolbar'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { AutoMatchDialog } from '@/components/shared/AutoMatchDialog'
import { useWorkOrders, useUploadCustomerExcel, useClients, useAutoMatch, useMatchScores } from '@/hooks/use-queries'
import { WorkOrderMasterList } from './work-orders/WorkOrderMasterList'
import { MatchDetailPanel } from './work-orders/MatchDetailPanel'
import type { AutoMatchResponse } from '@/services/api/tripOrders.api'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMonthParams } from './use-month-params'
import type { WorkOrder, WorkOrderMatchScore } from '@/data/domain'

type StatusFilter = 'all' | 'PENDING' | 'COMPLETED'

const STATUS_OPTIONS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ khớp', color: 'var(--theme-status-warning)' },
  { key: 'COMPLETED', label: 'Hoàn thành', color: 'var(--theme-status-success)' },
]

export function WorkOrderList() {
  const isMobile = useIsMobile(1024)
  const toast = useToast()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const { data: workOrders = [], isLoading: loading } = useWorkOrders({ dateFrom, dateTo })
  const { data: clients = [] } = useClients()
  const { data: matchScoresData } = useMatchScores(dateFrom, dateTo)
  const { mutate: uploadExcel, isPending: uploading } = useUploadCustomerExcel()
  const { mutate: runAutoMatch, isPending: autoMatching } = useAutoMatch()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
  const [autoMatchResult, setAutoMatchResult] = useState<AutoMatchResponse | null>(null)
  const [selectedWoId, setSelectedWoId] = useState<number | null>(null)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  // Import dialog
  const [importOpen, setImportOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const matchScores = useMemo(() => {
    const map = new Map<number, WorkOrderMatchScore>()
    if (matchScoresData?.scores) {
      for (const s of matchScoresData.scores) {
        map.set(s.workOrderId, s)
      }
    }
    return map
  }, [matchScoresData])

  const filtered = useMemo(() => {
    let result = workOrders
    if (statusFilter !== 'all') result = result.filter(w => w.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(w =>
        (w.tractorPlate ?? '').toLowerCase().includes(q) ||
        w.driver.name.toLowerCase().includes(q) ||
        w.client.name.toLowerCase().includes(q) ||
        (w.code ?? '').toLowerCase().includes(q) ||
        w.containers.some(c => (c.containerNumber ?? '').toLowerCase().includes(q))
      )
    }
    return result
  }, [workOrders, statusFilter, search])

  const selectedWo = useMemo(
    () => workOrders.find(w => w.id === selectedWoId) ?? null,
    [workOrders, selectedWoId]
  )

  const pendingCount = useMemo(
    () => filtered.filter(w => w.status === 'PENDING').length,
    [filtered]
  )

  const handleSelectWo = useCallback((id: number) => {
    setSelectedWoId(prev => prev === id ? null : id)
    if (isMobile) {
      setMobileSheetOpen(true)
    }
  }, [isMobile])

  const handleMatchSuccess = useCallback(() => {
    setSelectedWoId(null)
    if (isMobile) setMobileSheetOpen(false)
  }, [isMobile])

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

  const handleAutoMatch = useCallback(() => {
    runAutoMatch(
      { dateFrom, dateTo },
      {
        onSuccess: (res) => {
          if (res.data) {
            setAutoMatchResult(res.data)
            if (res.data.autoMatched.length > 0) {
              toast.success('Tự động ghép', `Đã ghép ${res.data.autoMatched.length} cặp`)
            }
          }
        },
        onError: () => toast.error('Lỗi', 'Không thể tự động ghép'),
      },
    )
  }, [runAutoMatch, dateFrom, dateTo, toast])

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

  // ── Import dialog ──
  const importDialogJsx = (
    <Dialog open={importOpen} onOpenChange={(open) => {
      setImportOpen(open)
      if (!open) { setFile(null); setSelectedClient('') }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nhập đơn đối soát</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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

          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] ?? null)} className="hidden" />
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 py-8 px-4 text-center"
            style={{
              borderColor: dragOver ? 'var(--theme-brand-primary)' : file ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
              background: dragOver ? 'var(--theme-bg-tertiary)' : 'transparent',
            }}
          >
            {file ? (
              <>
                <FileSpreadsheet className="h-8 w-8" style={{ color: 'var(--theme-brand-primary)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--theme-brand-primary)' }}>{file.name}</p>
                <button onClick={e => { e.stopPropagation(); setFile(null) }} className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  <X className="h-3 w-3" /> Xoá file
                </button>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8" style={{ color: 'var(--theme-text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Kéo thả file vào đây</p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>hoặc click để chọn file .xlsx / .xls</p>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button onClick={() => { setImportOpen(false); setFile(null); setSelectedClient('') }} disabled={uploading} className="flex-1 h-10 text-sm font-semibold rounded-xl" style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}>
              Huỷ
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file || !selectedClient} className="flex-1 h-10 text-sm font-semibold rounded-xl" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              {uploading ? 'Đang tải...' : 'Tải lên'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  // ── Filter bar (shared between mobile and desktop) ──
  const filterBar = (
    <div
      className="flex items-center gap-3 px-3 py-2 border-b"
      style={{ borderColor: 'var(--theme-border-default)' }}
    >
      <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />
      <div className="flex-1" />
      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm mã, biển số, container..."
        statusOptions={STATUS_OPTIONS}
        selectedStatus={statusFilter}
        onStatusChange={(s) => setStatusFilter(s as StatusFilter)}
        onClearFilters={handleClearFilters}
        compact
      />
      {pendingCount > 0 && (
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)', color: 'var(--theme-status-warning)' }}
        >
          {pendingCount} chờ khớp
        </span>
      )}
    </div>
  )

  // ── Header actions ──
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleAutoMatch}
        disabled={autoMatching}
        className="h-9 gap-1.5 text-xs font-semibold rounded-lg"
        style={{ background: 'var(--theme-status-success)', color: '#fff' }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {autoMatching ? 'Đang ghép...' : 'Tự động ghép'}
      </Button>
      <Button
        onClick={() => setImportOpen(true)}
        className="h-9 gap-1.5 text-xs font-semibold rounded-lg"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Nhập đơn
      </Button>
    </div>
  )

  // ── Mobile ──
  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">{headerActions}</div>
        {filterBar}

        <div className="card overflow-hidden">
          <WorkOrderMasterList
            workOrders={filtered}
            matchScores={matchScores}
            selectedId={selectedWoId}
            onSelect={handleSelectWo}
            loading={loading}
          />
        </div>

        {/* Mobile: Sheet drawer for detail panel */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 overflow-hidden">
            <SheetHeader className="px-4 pt-4 pb-2 flex flex-row items-center gap-2">
              <button
                onClick={() => setMobileSheetOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <SheetTitle className="text-sm font-semibold">Chi tiết ghép chuyến</SheetTitle>
            </SheetHeader>
            <MatchDetailPanel workOrder={selectedWo} onMatchSuccess={handleMatchSuccess} />
          </SheetContent>
        </Sheet>

        {importDialogJsx}
        <AutoMatchDialog open={!!autoMatchResult} onClose={() => setAutoMatchResult(null)} result={autoMatchResult} />
      </div>
    )
  }

  // ── Desktop: master-detail 2-column ──
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{headerActions}</div>

      <div className="card overflow-hidden">
        {filterBar}

        <div className="flex" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Left: master list */}
          <div
            className="overflow-y-auto border-r"
            style={{ width: '40%', borderColor: 'var(--theme-border-default)' }}
          >
            <WorkOrderMasterList
              workOrders={filtered}
              matchScores={matchScores}
              selectedId={selectedWoId}
              onSelect={handleSelectWo}
              loading={loading}
            />
          </div>

          {/* Right: detail panel */}
          <div className="flex-1 overflow-hidden">
            <MatchDetailPanel workOrder={selectedWo} onMatchSuccess={handleMatchSuccess} />
          </div>
        </div>
      </div>

      {importDialogJsx}
      <AutoMatchDialog open={!!autoMatchResult} onClose={() => setAutoMatchResult(null)} result={autoMatchResult} />
    </div>
  )
}
