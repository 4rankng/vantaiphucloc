import { useMemo, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Upload, FileSpreadsheet, X, Sparkles, ArrowLeft, Bot, ChevronDown } from 'lucide-react'
import {
  Button,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import { FilterToolbar } from '@/components/shared/FilterToolbar'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { AutoMatchDialog } from '@/components/shared/AutoMatchDialog'
import { fuzzyMatch } from '@/lib/search-utils'
import { useWorkOrders, useUploadCustomerExcel, useBulkImportAndMatch, usePartners, useAutoMatch, useMatchScores, useAIParsePreview } from '@/hooks/use-queries'
import { WorkOrderMasterList } from './work-orders/WorkOrderMasterList'
import { MatchDetailPanel } from './work-orders/MatchDetailPanel'
import type { AutoMatchResponse } from '@/services/api/tripOrders.api'
import type { AIParsePreviewResult, AIParsedRow } from '@/services/api/workOrders.api'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMonthParams } from './use-month-params'
import type { WorkOrderMatchScore } from '@/data/domain'

type StatusFilter = 'all' | 'PENDING' | 'MATCHED'

const STATUS_OPTIONS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ ghép', color: 'var(--theme-status-warning)' },
  { key: 'MATCHED', label: 'Đã khớp', color: 'var(--theme-status-success)' },
]

export function WorkOrderList() {
  const isMobile = useIsMobile(1024)
  const toast = useToast()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const { data: workOrders = [], isLoading: loading } = useWorkOrders({ dateFrom, dateTo })
  const { data: clients = [] } = usePartners()
  const { data: matchScoresData } = useMatchScores(dateFrom, dateTo)
  const { mutate: uploadExcel, isPending: uploading } = useUploadCustomerExcel()
  const { mutate: bulkImport, isPending: bulkImporting } = useBulkImportAndMatch()
  const { mutate: runAutoMatch, isPending: autoMatching } = useAutoMatch()

  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => (searchParams.get('status') as StatusFilter) || 'PENDING')
  const [autoMatchResult, setAutoMatchResult] = useState<AutoMatchResponse | null>(null)
  const [selectedWoId, setSelectedWoId] = useState<number | null>(null)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  // Import dialog
  const [importOpen, setImportOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bulkFileRef = useRef<HTMLInputElement>(null)

  // AI parse state
  const { mutate: aiParse, isPending: aiParsing } = useAIParsePreview()
  const [aiResult, setAiResult] = useState<AIParsePreviewResult | null>(null)
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false)
  const aiFileRef = useRef<HTMLInputElement>(null)

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
    if (statusFilter === 'PENDING') result = result.filter(w => w.status === 'PENDING')
    else if (statusFilter === 'MATCHED') result = result.filter(w => w.status === 'MATCHED' || w.status === 'COMPLETED')
    if (search.trim()) {
      const q = search
      result = result.filter(w =>
        fuzzyMatch(w.driver?.name ?? '', q) ||
        fuzzyMatch(w.partner.name, q) ||
        fuzzyMatch(w.code ?? '', q) ||
        w.containers.some(c => fuzzyMatch(c.containerNumber ?? '', q))
      )
    }
    return result
  }, [workOrders, statusFilter, search])

  const selectedWo = useMemo(
    () => workOrders.find(w => w.id === selectedWoId) ?? null,
    [workOrders, selectedWoId]
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
          setAutoMatchResult(res)
          if (res.candidates.length > 0) {
            toast.info('Tự động ghép', `Tìm thấy ${res.candidates.length} cặp đề xuất`)
          } else {
            toast.info('Tự động ghép', 'Không tìm thấy cặp nào để tự động ghép')
          }
        },
        onError: () => toast.error('Lỗi', 'Không thể tự động ghép'),
      },
    )
  }, [runAutoMatch, dateFrom, dateTo, toast])

  const handleBulkImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      toast.error('Lỗi', 'Chỉ hỗ trợ file .xlsx hoặc .xls')
      return
    }
    bulkImport(
      { file: f },
      {
        onSuccess: (res) => {
          toast.success(
            'Nhập đơn hàng',
            `✅ Đã nhập ${res.created} đơn · Khớp: ${res.matched} chuyến · Cảnh báo: ${res.warnings} · Chưa khớp: ${res.unmatched}`,
          )
        },
        onError: () => toast.error('Lỗi', 'Không thể nhập file đơn hàng'),
      },
    )
    // Reset so the same file can be re-selected
    e.target.value = ''
  }, [bulkImport, toast])

  const handleAIParse = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      toast.error('Lỗi', 'Chỉ hỗ trợ file .xlsx hoặc .xls')
      return
    }
    aiParse(
      { file: f },
      {
        onSuccess: (res) => {
          setAiResult(res)
          setAiPreviewOpen(true)
          toast.info('AI Phân tích', `Đã nhận diện ${res.totalRows} dòng · Độ tin cậy: ${(res.mappingConfidence * 100).toFixed(0)}%`)
        },
        onError: () => toast.error('Lỗi', 'Không thể phân tích file bằng AI'),
      },
    )
    e.target.value = ''
  }, [aiParse, toast])

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
          <DialogTitle>Nhập đơn hàng</DialogTitle>
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
                <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Kéo thả tệp Excel vào đây</p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>hoặc bấm để chọn tệp · Hỗ trợ .xlsx, .xls</p>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button onClick={() => { setImportOpen(false); setFile(null); setSelectedClient('') }} disabled={uploading} className="flex-1 h-10 text-sm font-semibold rounded-xl" style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}>
              Huỷ
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file || !selectedClient} className="flex-1 h-10 text-sm font-semibold rounded-xl" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              {uploading ? 'Đang phân tích...' : 'Phân tích tệp'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  // ── AI Preview dialog ──
  const aiPreviewDialogJsx = (
    <Dialog open={aiPreviewOpen} onOpenChange={setAiPreviewOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🤖 Kết quả phân tích AI
            {aiResult && (
              <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>
                {aiResult.filename}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {aiResult && (
          <div className="flex-1 overflow-auto space-y-3">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div className="rounded-xl p-3" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Tổng dòng</div>
                <div className="font-bold text-lg">{aiResult.totalRows}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Độ tin cậy</div>
                <div className="font-bold text-lg" style={{ color: aiResult.mappingConfidence >= 0.8 ? 'var(--theme-status-success)' : aiResult.mappingConfidence >= 0.5 ? 'var(--theme-status-warning)' : 'var(--theme-status-danger)' }}>
                  {(aiResult.mappingConfidence * 100).toFixed(0)}%
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Cache</div>
                <div className="font-bold text-lg">{aiResult.cachedMapping ? '✅' : '—'}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Chi phí</div>
                <div className="font-bold text-lg">${aiResult.costEstimateUsd.toFixed(4)}</div>
              </div>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--theme-border-default)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <th className="px-2 py-1.5 text-left font-semibold">#</th>
                    {Object.values(aiResult.columnMapping).map((field) => (
                      <th key={field} className="px-2 py-1.5 text-left font-semibold">{field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aiResult.rows.slice(0, 20).map((row) => (
                    <tr key={row.rowNumber} className="border-t" style={{ borderColor: 'var(--theme-border-default)' }}>
                      <td className="px-2 py-1" style={{ color: 'var(--theme-text-muted)' }}>{row.rowNumber}</td>
                      {Object.values(aiResult.columnMapping).map((field) => {
                        const cell = row.cells[field]
                        if (!cell) return <td key={field} className="px-2 py-1">—</td>
                        const bgColor = cell.confidence >= 0.8
                          ? 'var(--theme-status-success-bg, rgba(34,197,94,0.1))'
                          : cell.confidence >= 0.5
                            ? 'var(--theme-status-warning-bg, rgba(234,179,8,0.1))'
                            : 'var(--theme-status-danger-bg, rgba(239,68,68,0.1))'
                        return (
                          <td
                            key={field}
                            className="px-2 py-1"
                            style={{ background: bgColor }}
                            title={cell.cleaned && cell.originalValue ? `Gốc: ${cell.originalValue}` : undefined}
                          >
                            {cell.value ?? '—'}
                            {cell.cleaned && ' ✏️'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => setAiPreviewOpen(false)}
                className="h-9 text-sm font-semibold rounded-xl"
                style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  // ── Filter bar (shared between mobile and desktop) ──
  // On mobile (<lg): stack month navigator + pending counter on row 1, search/chips on row 2.
  // On desktop (≥lg): single row with month navigator pinned left, search/chips center, counter right.
  const filterBar = (
    <div className="toolbar flex-col gap-2 lg:flex-row">
      {/* Month navigator */}
      <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />

      <div className="min-w-0 lg:flex-1">
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm mã, biển số, container..."
          statusOptions={STATUS_OPTIONS}
          selectedStatus={statusFilter}
          onStatusChange={(s) => setStatusFilter(s as StatusFilter)}
          onClearFilters={handleClearFilters}
        />
      </div>
    </div>
  )

  // ── Header actions ──
  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Primary: Auto-match */}
      <button
        onClick={handleAutoMatch}
        disabled={autoMatching}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        style={{ background: 'var(--theme-brand-primary)', color: '#fff' }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {autoMatching ? 'Đang ghép...' : 'Tự động ghép'}
      </button>

      {/* Secondary: Import actions grouped in dropdown */}
      <input ref={bulkFileRef} type="file" accept=".xlsx,.xls" onChange={handleBulkImport} className="hidden" />
      <input ref={aiFileRef} type="file" accept=".xlsx,.xls" onChange={handleAIParse} className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold border transition-all hover:opacity-90"
            style={{
              background: 'var(--theme-bg-secondary)',
              borderColor: 'var(--theme-border-default)',
              color: 'var(--theme-text-primary)',
            }}
          >
            <Upload className="h-3.5 w-3.5" />
            Nhập
            <ChevronDown className="h-3 w-3 ml-0.5" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Nhập đơn (khách hàng)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => bulkFileRef.current?.click()} disabled={bulkImporting}>
            <Upload className="mr-2 h-4 w-4" />
            {bulkImporting ? 'Đang nhập...' : 'Tải file PLV'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => aiFileRef.current?.click()} disabled={aiParsing}>
            <Bot className="mr-2 h-4 w-4" />
            {aiParsing ? 'Đang phân tích...' : 'Phân tích AI'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  // ── Mobile ──
  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="typo-h2">Khớp chuyến</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Tháng {month}/{year}</p>
          </div>
          {headerActions}
        </div>
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
        {aiPreviewDialogJsx}
        <AutoMatchDialog open={!!autoMatchResult} onClose={() => setAutoMatchResult(null)} result={autoMatchResult} />
      </div>
    )
  }

  // ── Desktop: master-detail 2-column ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="typo-h2">Khớp chuyến</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
            Tháng {month}/{year} · {workOrders.filter(w => w.status === 'MATCHED' || w.status === 'COMPLETED').length}/{workOrders.length} đã khớp
          </p>
        </div>
        {headerActions}
      </div>

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
      {aiPreviewDialogJsx}
      <AutoMatchDialog open={!!autoMatchResult} onClose={() => setAutoMatchResult(null)} result={autoMatchResult} />
    </div>
  )
}
