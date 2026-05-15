/**
 * Đối soát nhà xe (xe ngoài) — Vendor Reconciliation page.
 *
 * Enhanced UI with:
 *   - Vendor picker + period picker at top
 *   - Export our trips for vendor (Mode 4a)
 *   - Upload vendor's Excel (Mode 4b)
 *   - History of past imports
 *   - Master-detail review panel
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight, Loader2, Trash2, Check,
  Download, FileUp, History, Filter,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { usePartners } from '@/hooks/use-queries'
import {
  useVendorReconImports,
  useVendorReconImport,
  useUploadVendorReconciliation,
  useUpdateVendorReconRow,
  useApplyVendorReconciliation,
  useDiscardVendorReconciliation,
  useExportVendorTrips,
} from '@/hooks/use-queries'
import type { VendorReconImport, VendorReconRow, VendorRowMatchStatus } from '@/services/api/vendorReconciliation.api'
import { formatCurrencyFull } from '@/data/domain'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<VendorRowMatchStatus, string> = {
  MATCHED: 'Khớp',
  VENDOR_ONLY: 'Nhà xe khai',
  OUR_ONLY: 'Bên mình khai',
  DISPUTED: 'Tranh chấp',
  IGNORED: 'Bỏ qua',
}

const STATUS_COLORS: Record<VendorRowMatchStatus, string> = {
  MATCHED: 'var(--theme-status-success)',
  VENDOR_ONLY: 'var(--theme-status-warning)',
  OUR_ONLY: '#60a5fa',
  DISPUTED: 'var(--theme-status-error)',
  IGNORED: 'var(--theme-text-muted)',
}

const IMPORT_STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: 'Chờ xét duyệt',
  APPLIED: 'Đã áp dụng',
  DISCARDED: 'Đã huỷ',
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('vi-VN')
  } catch {
    return d
  }
}

// ---------------------------------------------------------------------------
// Toolbar — vendor picker + period + action buttons
// ---------------------------------------------------------------------------

function Toolbar({
  vendorId,
  setVendorId,
  periodFrom,
  setPeriodFrom,
  periodTo,
  setPeriodTo,
  onExport,
  onToggleUpload,
  onToggleHistory,
  showUpload,
  showHistory,
  exporting,
}: {
  vendorId: string
  setVendorId: (v: string) => void
  periodFrom: string
  setPeriodFrom: (v: string) => void
  periodTo: string
  setPeriodTo: (v: string) => void
  onExport: () => void
  onToggleUpload: () => void
  onToggleHistory: () => void
  showUpload: boolean
  showHistory: boolean
  exporting: boolean
}) {
  const { data: vendors = [] } = usePartners({ partnerType: 'vendor' })

  return (
    <div className="card p-4">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        {/* Vendor selector */}
        <div className="space-y-1 lg:w-56 flex-shrink-0">
          <label className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
            <Filter className="h-3 w-3 inline mr-1" />Nhà xe
          </label>
          <select
            value={vendorId}
            onChange={e => setVendorId(e.target.value)}
            className="h-9 w-full rounded-lg px-2.5 text-sm"
            style={{
              border: '1px solid var(--theme-border-default)',
              background: 'var(--theme-bg-primary)',
              color: 'var(--theme-text-primary)',
            }}
          >
            <option value="">— Tất cả nhà xe —</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Period */}
        <div className="flex items-end gap-2 flex-shrink-0">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
              Từ ngày
            </label>
            <input
              type="date"
              value={periodFrom}
              onChange={e => setPeriodFrom(e.target.value)}
              className="h-9 w-full rounded-lg px-2.5 text-sm"
              style={{
                border: '1px solid var(--theme-border-default)',
                background: 'var(--theme-bg-primary)',
                color: 'var(--theme-text-primary)',
              }}
            />
          </div>
          <span className="text-xs mb-2" style={{ color: 'var(--theme-text-muted)' }}>→</span>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
              Đến ngày
            </label>
            <input
              type="date"
              value={periodTo}
              onChange={e => setPeriodTo(e.target.value)}
              className="h-9 w-full rounded-lg px-2.5 text-sm"
              style={{
                border: '1px solid var(--theme-border-default)',
                background: 'var(--theme-bg-primary)',
                color: 'var(--theme-text-primary)',
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 lg:ml-auto flex-shrink-0">
          <Button
            onClick={onExport}
            disabled={exporting || !vendorId || !periodFrom || !periodTo}
            className="h-9 px-3 text-xs font-semibold rounded-lg"
            style={{
              background: 'transparent',
              border: '1px solid var(--theme-brand-primary)',
              color: 'var(--theme-brand-primary)',
              opacity: (!vendorId || !periodFrom || !periodTo) ? 0.5 : 1,
            }}
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            Xuất báo cáo cho nhà xe
          </Button>
          <Button
            onClick={onToggleUpload}
            className="h-9 px-3 text-xs font-semibold rounded-lg"
            style={{
              background: showUpload ? 'var(--theme-brand-primary)' : 'transparent',
              border: '1px solid var(--theme-brand-primary)',
              color: showUpload ? 'var(--theme-text-on-brand)' : 'var(--theme-brand-primary)',
            }}
          >
            <FileUp className="h-3.5 w-3.5 mr-1.5" />
            Tải file từ nhà xe
          </Button>
          <Button
            onClick={onToggleHistory}
            className="h-9 px-3 text-xs font-semibold rounded-lg"
            style={{
              background: showHistory ? 'var(--theme-bg-tertiary)' : 'transparent',
              border: '1px solid var(--theme-border-default)',
              color: 'var(--theme-text-secondary)',
            }}
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            Lịch sử đối soát
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Upload form
// ---------------------------------------------------------------------------

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const toast = useToast()
  const { data: vendors = [] } = usePartners({ partnerType: 'vendor' })
  const upload = useUploadVendorReconciliation()

  const [vendorId, setVendorId] = useState('')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f)
    } else {
      toast.error('Lỗi', 'Chỉ chấp nhận file .xlsx hoặc .xls')
    }
  }, [toast])

  const handleSubmit = () => {
    if (!file || !vendorId || !periodFrom || !periodTo) {
      toast.error('Thiếu thông tin', 'Vui lòng chọn nhà xe, kỳ đối soát và file')
      return
    }
    upload.mutate(
      { file, vendorId: Number(vendorId), periodFrom, periodTo, notes: notes || undefined },
      {
        onSuccess: (result) => {
          const { totals } = result
          toast.success(
            'Đã phân tích file',
            `${totals?.matched ?? 0} khớp · ${totals?.vendorOnly ?? 0} nhà xe khai · ${totals?.ourOnly ?? 0} bên mình khai`,
          )
          setFile(null)
          setVendorId('')
          setPeriodFrom('')
          setPeriodTo('')
          setNotes('')
          onSuccess()
        },
        onError: () => toast.error('Lỗi', 'Không thể phân tích file. Kiểm tra định dạng và thử lại.'),
      }
    )
  }

  return (
    <div className="card p-4 space-y-4">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
        <FileUp className="h-4 w-4 inline mr-1.5" />
        Tải lên file đối soát từ nhà xe
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Vendor selector */}
        <div className="space-y-1 lg:col-span-1">
          <label className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
            Nhà xe
          </label>
          <select
            value={vendorId}
            onChange={e => setVendorId(e.target.value)}
            className="h-9 w-full rounded-lg px-2.5 text-sm"
            style={{
              border: '1px solid var(--theme-border-default)',
              background: 'var(--theme-bg-primary)',
              color: 'var(--theme-text-primary)',
            }}
          >
            <option value="">— Chọn nhà xe —</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Period from */}
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
            Từ ngày
          </label>
          <input
            type="date"
            value={periodFrom}
            onChange={e => setPeriodFrom(e.target.value)}
            className="h-9 w-full rounded-lg px-2.5 text-sm"
            style={{
              border: '1px solid var(--theme-border-default)',
              background: 'var(--theme-bg-primary)',
              color: 'var(--theme-text-primary)',
            }}
          />
        </div>

        {/* Period to */}
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
            Đến ngày
          </label>
          <input
            type="date"
            value={periodTo}
            onChange={e => setPeriodTo(e.target.value)}
            className="h-9 w-full rounded-lg px-2.5 text-sm"
            style={{
              border: '1px solid var(--theme-border-default)',
              background: 'var(--theme-bg-primary)',
              color: 'var(--theme-text-primary)',
            }}
          />
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
            Ghi chú (tuỳ chọn)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Tháng 4/2026..."
            className="h-9 w-full rounded-lg px-2.5 text-sm"
            style={{
              border: '1px solid var(--theme-border-default)',
              background: 'var(--theme-bg-primary)',
              color: 'var(--theme-text-primary)',
            }}
          />
        </div>
      </div>

      {/* File drop zone */}
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
        className="rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 py-6 px-4 text-center"
        style={{
          borderColor: dragOver ? 'var(--theme-brand-primary)' : file ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
          background: dragOver ? 'var(--theme-bg-tertiary)' : 'transparent',
        }}
      >
        {file ? (
          <>
            <FileSpreadsheet className="h-7 w-7" style={{ color: 'var(--theme-brand-primary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--theme-brand-primary)' }}>{file.name}</p>
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
            <Upload className="h-7 w-7" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              Kéo thả file Excel nhà xe vào đây
            </p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              hoặc bấm để chọn · .xlsx, .xls
            </p>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={upload.isPending || !file || !vendorId || !periodFrom || !periodTo}
          className="h-9 px-5 text-sm font-semibold rounded-xl"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          {upload.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Đang phân tích...</>
          ) : (
            <><Upload className="h-3.5 w-3.5 mr-1.5" />Phân tích file</>
          )}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Import list
// ---------------------------------------------------------------------------

function ImportStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING_REVIEW: 'var(--theme-status-warning)',
    APPLIED: 'var(--theme-status-success)',
    DISCARDED: 'var(--theme-text-muted)',
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{
        background: (colors[status] ?? 'var(--theme-text-muted)') + '22',
        color: colors[status] ?? 'var(--theme-text-muted)',
      }}
    >
      {IMPORT_STATUS_LABEL[status] ?? status}
    </span>
  )
}

function TotalsBar({ totals }: { totals: VendorReconImport['totals'] }) {
  if (!totals) return null
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <span style={{ color: STATUS_COLORS.MATCHED }}>
        ✓ {totals.matched} khớp
      </span>
      <span style={{ color: STATUS_COLORS.VENDOR_ONLY }}>
        ⚠ {totals.vendorOnly} nhà xe khai
      </span>
      <span style={{ color: STATUS_COLORS.OUR_ONLY }}>
        ● {totals.ourOnly} bên mình khai
      </span>
      {totals.disputed > 0 && (
        <span style={{ color: STATUS_COLORS.DISPUTED }}>
          ✗ {totals.disputed} tranh chấp
        </span>
      )}
    </div>
  )
}

function ImportCard({
  imp,
  selected,
  onSelect,
}: {
  imp: VendorReconImport
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-4 py-3 border-b transition-colors"
      style={{
        borderColor: 'var(--theme-border-default)',
        background: selected ? 'var(--theme-bg-secondary)' : 'transparent',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {imp.vendorPartnerName || `Nhà xe #${imp.vendorId}`}
        </span>
        <ImportStatusBadge status={imp.status} />
      </div>
      <div className="text-xs mb-1.5" style={{ color: 'var(--theme-text-secondary)' }}>
        {formatDate(imp.periodFrom)} – {formatDate(imp.periodTo)}
      </div>
      <TotalsBar totals={imp.totals} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Row verdict editor
// ---------------------------------------------------------------------------

const VERDICT_OPTIONS: { value: VendorRowMatchStatus; label: string }[] = [
  { value: 'MATCHED', label: 'Khớp' },
  { value: 'VENDOR_ONLY', label: 'Nhà xe khai' },
  { value: 'OUR_ONLY', label: 'Bên mình khai' },
  { value: 'DISPUTED', label: 'Tranh chấp' },
  { value: 'IGNORED', label: 'Bỏ qua' },
]

function RowVerdictCell({
  row,
  importId,
  readonly,
}: {
  row: VendorReconRow
  importId: number
  readonly: boolean
}) {
  const [editing, setEditing] = useState(false)
  const updateRow = useUpdateVendorReconRow()
  const toast = useToast()

  const handleChange = (status: VendorRowMatchStatus) => {
    updateRow.mutate(
      { importId, rowId: row.id, payload: { matchStatus: status } },
      {
        onSuccess: () => setEditing(false),
        onError: () => toast.error('Lỗi', 'Không thể cập nhật'),
      }
    )
  }

  if (readonly || !editing) {
    return (
      <button
        onClick={() => !readonly && setEditing(true)}
        className="flex items-center gap-1 text-xs font-medium rounded px-1.5 py-0.5 transition-colors"
        style={{
          color: STATUS_COLORS[row.matchStatus] ?? 'var(--theme-text-muted)',
          background: (STATUS_COLORS[row.matchStatus] ?? 'var(--theme-text-muted)') + '18',
          cursor: readonly ? 'default' : 'pointer',
        }}
        disabled={readonly}
      >
        {STATUS_LABELS[row.matchStatus] ?? row.matchStatus}
        {!readonly && <ChevronDown className="h-3 w-3 opacity-50" />}
      </button>
    )
  }

  return (
    <select
      autoFocus
      value={row.matchStatus}
      onChange={e => handleChange(e.target.value as VendorRowMatchStatus)}
      onBlur={() => setEditing(false)}
      className="text-xs rounded px-1.5 py-0.5 h-6"
      style={{
        border: '1px solid var(--theme-border-default)',
        background: 'var(--theme-bg-primary)',
        color: 'var(--theme-text-primary)',
      }}
    >
      {VERDICT_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ---------------------------------------------------------------------------
// Review panel
// ---------------------------------------------------------------------------

type Tab = 'MATCHED' | 'VENDOR_ONLY' | 'OUR_ONLY' | 'DISPUTED'

function ReviewPanel({
  importId,
  onApplied,
}: {
  importId: number
  onApplied: () => void
}) {
  const toast = useToast()
  const { data: imp, isLoading } = useVendorReconImport(importId)
  const apply = useApplyVendorReconciliation()
  const discard = useDiscardVendorReconciliation()
  const [tab, setTab] = useState<Tab>('MATCHED')

  const rows = imp?.rows ?? []
  const readonly = imp?.status !== 'PENDING_REVIEW'

  const grouped = useMemo(() => ({
    MATCHED: rows.filter(r => r.matchStatus === 'MATCHED'),
    VENDOR_ONLY: rows.filter(r => r.matchStatus === 'VENDOR_ONLY'),
    OUR_ONLY: rows.filter(r => r.matchStatus === 'OUR_ONLY'),
    DISPUTED: rows.filter(r => r.matchStatus === 'DISPUTED'),
  }), [rows])

  const visibleRows = grouped[tab]

  const handleApply = () => {
    apply.mutate(importId, {
      onSuccess: (res) => {
        toast.success('Đã áp dụng', `${res.applied} chuyến đã ghi nhận chi phí nhà xe`)
        onApplied()
      },
      onError: () => toast.error('Lỗi', 'Không thể áp dụng đối soát'),
    })
  }

  const handleDiscard = () => {
    discard.mutate(importId, {
      onSuccess: () => {
        toast.info('Đã huỷ', 'Import đã được đánh dấu huỷ')
        onApplied()
      },
      onError: () => toast.error('Lỗi', 'Không thể huỷ import'),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--theme-text-muted)' }} />
      </div>
    )
  }

  if (!imp) return null

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'MATCHED', label: 'Khớp', count: grouped.MATCHED.length },
    { key: 'VENDOR_ONLY', label: 'Nhà xe khai', count: grouped.VENDOR_ONLY.length },
    { key: 'OUR_ONLY', label: 'Bên mình khai', count: grouped.OUR_ONLY.length },
    { key: 'DISPUTED', label: 'Tranh chấp', count: grouped.DISPUTED.length },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b space-y-2 flex-shrink-0"
        style={{ borderColor: 'var(--theme-border-default)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {imp.vendorPartnerName || `Nhà xe #${imp.vendorId}`}
            </p>
            <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
              {formatDate(imp.periodFrom)} – {formatDate(imp.periodTo)}
              {imp.sourceFilename && <> · {imp.sourceFilename}</>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ImportStatusBadge status={imp.status} />
            {imp.status === 'PENDING_REVIEW' && (
              <>
                <Button
                  onClick={handleDiscard}
                  disabled={discard.isPending}
                  className="h-7 px-2.5 text-xs rounded-lg"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--theme-status-error)',
                    color: 'var(--theme-status-error)',
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />Huỷ
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={apply.isPending}
                  className="h-7 px-2.5 text-xs rounded-lg"
                  style={{ background: 'var(--theme-status-success)', color: '#fff' }}
                >
                  {apply.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Áp dụng
                </Button>
              </>
            )}
          </div>
        </div>
        <TotalsBar totals={imp.totals} />
      </div>

      {/* Tabs */}
      <div
        className="flex border-b flex-shrink-0"
        style={{ borderColor: 'var(--theme-border-default)' }}
      >
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors"
            style={{
              borderBottomColor: tab === t.key ? 'var(--theme-brand-primary)' : 'transparent',
              color: tab === t.key ? 'var(--theme-brand-primary)' : 'var(--theme-text-secondary)',
            }}
          >
            {t.label}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{
                background: STATUS_COLORS[t.key] + '22',
                color: STATUS_COLORS[t.key],
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Rows table */}
      <div className="flex-1 overflow-y-auto">
        {visibleRows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            <CheckCircle2 className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">Không có dòng nào</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--theme-bg-secondary)', borderBottom: '1px solid var(--theme-border-default)' }}>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Số cont</th>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Ngày</th>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Lộ trình</th>
                <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Chi phí nhà xe</th>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Trạng thái</th>
                <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, idx) => (
                <tr
                  key={row.id}
                  style={{
                    background: idx % 2 === 0 ? 'var(--theme-bg-primary)' : 'var(--theme-bg-secondary)',
                    borderBottom: '1px solid var(--theme-border-default)',
                  }}
                >
                  <td className="px-3 py-2 font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {row.containerNumber ?? '—'}
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--theme-text-secondary)' }}>
                    {formatDate(row.tripDate)}
                  </td>
                  <td className="px-3 py-2 max-w-[160px] truncate" style={{ color: 'var(--theme-text-secondary)' }} title={row.routeText ?? ''}>
                    {row.routeText ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--theme-text-primary)' }}>
                    {row.vendorAmount != null ? formatCurrencyFull(row.vendorAmount) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <RowVerdictCell row={row} importId={imp.id} readonly={readonly} />
                  </td>
                  <td className="px-3 py-2 max-w-[120px] truncate text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {row.reviewerNote ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function VendorReconciliation() {
  const toast = useToast()
  const exportMutation = useExportVendorTrips()

  // Filter state
  const [vendorId, setVendorId] = useState('')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')

  // Panel toggles
  const [showUpload, setShowUpload] = useState(false)
  const [showHistory, setShowHistory] = useState(true)

  // Selected import for review
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Fetch imports, optionally filtered by vendor
  const { data: imports = [], isLoading } = useVendorReconImports(
    vendorId ? Number(vendorId) : undefined,
  )

  const handleExport = useCallback(() => {
    if (!vendorId || !periodFrom || !periodTo) {
      toast.error('Thiếu thông tin', 'Chọn nhà xe và kỳ để xuất báo cáo')
      return
    }
    exportMutation.mutate(
      { vendorId: Number(vendorId), dateFrom: periodFrom, dateTo: periodTo },
      {
        onSuccess: () => toast.success('Đã tải', 'File báo cáo đã được tải xuống'),
        onError: () => toast.error('Lỗi', 'Không thể xuất báo cáo'),
      },
    )
  }, [vendorId, periodFrom, periodTo, exportMutation, toast])

  const handleUploadSuccess = useCallback(() => {
    setShowUpload(false)
    setShowHistory(true)
  }, [])

  return (
    <div className="space-y-4">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
          Đối soát nhà xe
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
          So sánh file nhà xe gửi với phiếu làm việc của bên mình · Xuất báo cáo gửi nhà xe
        </p>
      </div>

      {/* Toolbar */}
      <Toolbar
        vendorId={vendorId}
        setVendorId={setVendorId}
        periodFrom={periodFrom}
        setPeriodFrom={setPeriodFrom}
        periodTo={periodTo}
        setPeriodTo={setPeriodTo}
        onExport={handleExport}
        onToggleUpload={() => setShowUpload(s => !s)}
        onToggleHistory={() => setShowHistory(s => !s)}
        showUpload={showUpload}
        showHistory={showHistory}
        exporting={exportMutation.isPending}
      />

      {/* Upload form (collapsible) */}
      {showUpload && (
        <UploadForm onSuccess={handleUploadSuccess} />
      )}

      {/* History + Review master-detail */}
      {showHistory && (
        <div
          className="card overflow-hidden"
          style={{ height: 'calc(100vh - 320px)', minHeight: 400 }}
        >
          <div className="flex h-full">
            {/* Import list (left column) */}
            <div
              className="overflow-y-auto border-r flex-shrink-0"
              style={{ width: 280, borderColor: 'var(--theme-border-default)' }}
            >
              <div
                className="px-3 py-2 text-xs font-semibold border-b"
                style={{
                  color: 'var(--theme-text-secondary)',
                  borderColor: 'var(--theme-border-default)',
                  background: 'var(--theme-bg-secondary)',
                }}
              >
                <History className="h-3 w-3 inline mr-1" />
                Lịch sử import ({imports.length})
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--theme-text-muted)' }} />
                </div>
              ) : imports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <AlertTriangle className="h-7 w-7 mb-2 opacity-30" style={{ color: 'var(--theme-text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    Chưa có file nào. Tải lên file nhà xe để bắt đầu.
                  </p>
                </div>
              ) : (
                imports.map(imp => (
                  <ImportCard
                    key={imp.id}
                    imp={imp}
                    selected={selectedId === imp.id}
                    onSelect={() => setSelectedId(imp.id)}
                  />
                ))
              )}
            </div>

            {/* Review panel (right) */}
            <div className="flex-1 overflow-hidden">
              {selectedId == null ? (
                <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--theme-text-muted)' }}>
                  <ChevronRight className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Chọn một import để xem chi tiết</p>
                </div>
              ) : (
                <ReviewPanel
                  key={selectedId}
                  importId={selectedId}
                  onApplied={() => {/* list will auto-refresh via query invalidation */}}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
