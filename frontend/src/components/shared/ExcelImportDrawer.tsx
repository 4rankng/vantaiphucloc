import { useState, useRef, useCallback, useMemo } from 'react'
import {
  FileSpreadsheet,
  X,
  Upload,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { Drawer } from '@/components/shared/Drawer'
import { StepIndicator } from '@/components/shared/StepIndicator'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { Button } from '@/components/ui'
import { useClients, useBulkImportAndMatch, useAIParsePreview } from '@/hooks/use-queries'
import type { DuplicateGroup } from '@/services/api/deliveredTrips.api'

type ImportStep = 'upload' | 'preview' | 'done'

const IMPORT_STEPS = [
  { label: 'Nhập file' },
  { label: 'Soát duyệt' },
  { label: 'Lưu dữ liệu' },
]

function stepIndex(step: ImportStep): number {
  return step === 'upload' ? 0 : step === 'preview' ? 1 : 2
}

interface PreviewRow {
  [key: string]: unknown
}

export function ExcelImportDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [clientId, setClientId] = useState('')
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [previewColumns, setPreviewColumns] = useState<string[]>([])
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const { data: clients = [] } = useClients()
  const bulkImport = useBulkImportAndMatch()
  const aiPreview = useAIParsePreview()

  const handleFileSelect = useCallback((f: File | null) => {
    if (!f) return
    setFile(f)
    setError(null)
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    dropRef.current?.classList.add('is-dragging')
  }

  function handleDragLeave() {
    dropRef.current?.classList.remove('is-dragging')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dropRef.current?.classList.remove('is-dragging')
    handleFileSelect(e.dataTransfer.files?.[0] ?? null)
  }

  function handlePreview() {
    if (!file) return
    setError(null)
    aiPreview.mutate(
      { file },
      {
        onSuccess: (data) => {
          const cols = (data as { columns?: string[] }).columns ?? []
          const rows = (data as { rows?: PreviewRow[] }).rows ?? []
          const dups = (data as { duplicateGroups?: DuplicateGroup[] }).duplicateGroups ?? []
          const warns = (data as { warnings?: string[] }).warnings ?? []
          setPreviewColumns(cols)
          setPreviewData(rows)
          setDuplicateGroups(dups)
          setPreviewWarnings(warns)
          // Auto-detect client from "Chủ hàng" column
          if (!clientId) {
            const uniqueClients = [
              ...new Set(rows.map((r) => String(r['Chủ hàng'] ?? '').trim()).filter(Boolean)),
            ]
            if (uniqueClients.length === 1) {
              const code = uniqueClients[0].toUpperCase()
              const match = clients.find(
                (c) =>
                  c.code?.toUpperCase() === code || c.name.toUpperCase().split(/\s+/)[0] === code,
              )
              if (match) setClientId(String(match.id))
            }
          }
          setStep('preview')
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
      },
    )
  }

  function handleImport() {
    if (!file) return
    setError(null)
    bulkImport.mutate(
      { file, clientId: clientId ? Number(clientId) : undefined },
      {
        onSuccess: () => setStep('done'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi import'),
      },
    )
  }

  function handleReset() {
    setStep('upload')
    setFile(null)
    setClientId('')
    setPreviewData([])
    setPreviewColumns([])
    setDuplicateGroups([])
    setPreviewWarnings([])
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const previewCols = previewColumns.length > 0 ? previewColumns : []

  // Build a map of row index → duplicate type for highlighting
  const duplicateRowMap = useMemo(() => {
    const map = new Map<number, 'exact' | 'fuzzy' | 'digits'>()
    for (const g of duplicateGroups) {
      for (const idx of g.rowIndices) {
        if (!map.has(idx)) map.set(idx, g.type)
      }
    }
    return map
  }, [duplicateGroups])

  const footer =
    step === 'upload' ? (
      <>
        <Button variant="ghost" onClick={onClose}>
          Huỷ
        </Button>
        <Button variant="default" onClick={handlePreview} disabled={!file || aiPreview.isPending}>
          {aiPreview.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {aiPreview.isPending ? 'Đang phân tích...' : 'Xem trước'}
        </Button>
      </>
    ) : step === 'preview' ? (
      <>
        {clientId ? (
          <span
            className="text-[12px] font-medium px-2.5 py-1 rounded-full mr-auto"
            style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
          >
            {clients.find((c) => String(c.id) === clientId)?.name ?? 'Chủ hàng'} ✓
          </span>
        ) : (
          <InlineSelect
            placeholder="Chọn chủ hàng"
            value={clientId}
            options={clients.map((c) => ({ value: String(c.id), label: c.name }))}
            onChange={setClientId}
            className="mr-auto"
            style={{ minWidth: 180, borderColor: 'var(--warning)' }}
          />
        )}
        <Button
          variant="ghost"
          onClick={() => {
            setStep('upload')
            setPreviewData([])
            setPreviewColumns([])
          }}
        >
          Quay lại
        </Button>
        <Button variant="default" onClick={handleImport} disabled={bulkImport.isPending || !clientId}>
          {bulkImport.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {bulkImport.isPending ? 'Đang lưu...' : 'Lưu dữ liệu'}
        </Button>
      </>
    ) : (
      <>
        <Button variant="ghost" onClick={handleReset}>
          Nhập file khác
        </Button>
        <Button variant="default" onClick={onClose}>
          Xong
        </Button>
      </>
    )

  return (
    <Drawer
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      breadcrumb="Đối soát"
      title="Nhập Excel"
      width="80vw"
      footer={footer}
    >
      {/* Step indicator */}
      <div className="mb-6">
        <StepIndicator steps={IMPORT_STEPS} current={stepIndex(step)} />
      </div>

      {/* ── Upload step ── */}
      {step === 'upload' && (
        <div className="space-y-5">
          {/* File area */}
          <div>
            <label className="nepo-field-label">File Excel</label>

            {/* File chip — shown when file selected */}
            {file && (
              <div
                className="flex items-center gap-2.5 px-3 py-2 mb-3"
                style={{
                  background: 'var(--accent-soft)',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--accent)',
                }}
              >
                <FileSpreadsheet
                  className="h-4 w-4 shrink-0"
                  style={{ color: 'var(--accent)' }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-semibold truncate m-0"
                    style={{ color: 'var(--ink)' }}
                  >
                    {file.name}
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>
                    {(file.size / 1024).toFixed(1)} KB · xlsx / xls / csv
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="grid place-items-center rounded-md"
                  style={{ width: 24, height: 24, color: 'var(--ink-3)' }}
                  aria-label="Xoá file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Drop zone — only shown when no file is selected */}
            {!file && (
              <div
                ref={dropRef}
                onClick={() => fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="nepo-dropzone"
                style={{ minHeight: 130 }}
              >
                <Upload
                  className="h-7 w-7 mb-2"
                  style={{ color: 'var(--ink-3)' }}
                  strokeWidth={1.5}
                />
                <p
                  className="text-[13.5px] font-semibold m-0"
                  style={{ color: 'var(--ink)' }}
                >
                  Kéo & thả file vào đây
                </p>
                <p className="text-[12px] m-0 mt-1" style={{ color: 'var(--ink-3)' }}>
                  hoặc nhấn để chọn từ máy · .xlsx .xls .csv
                </p>
              </div>
            )}
            {file && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[12px] font-medium"
                style={{ color: 'var(--accent)' }}
              >
                Thay bằng file khác
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3"
              style={{
                background: 'var(--danger-soft)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Preview step ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Duplicate warning banner */}
          {previewWarnings.length > 0 && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3"
              style={{
                background: 'var(--warning-soft)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--warning)',
                fontSize: 13,
              }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                {previewWarnings.map((w, i) => (
                  <p key={i} className="m-0 font-semibold">
                    {w}
                  </p>
                ))}
                {duplicateGroups.length > 0 && (
                  <ul className="m-0 mt-1.5 pl-4 space-y-0.5" style={{ listStyle: 'disc' }}>
                    {duplicateGroups.map((g, i) => (
                      <li key={i} className="text-[12px]" style={{ opacity: 0.9 }}>
                        {g.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {/* Summary row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
              {file?.name}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
            >
              {previewData.length} dòng · {previewCols.length} cột
            </span>
            {previewData.length > 20 && (
              <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                (hiển thị 20 dòng đầu)
              </span>
            )}
          </div>

          {/* Preview table */}
          {previewData.length === 0 ? (
            <p className="text-[13px] text-center py-8" style={{ color: 'var(--ink-3)' }}>
              Không có dữ liệu
            </p>
          ) : (
            <div
              className="nepo-table-scroll"
              style={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                overflow: 'auto',
              }}
            >
              <table className="nepo-table w-full" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    {previewCols.map((key) => (
                      <th key={key} className="text-left">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 20).map((row, i) => {
                    const dupType = duplicateRowMap.get(i)
                    const rowBg =
                      dupType === 'exact'
                        ? 'var(--danger-soft)'
                        : dupType === 'fuzzy'
                          ? 'var(--warning-soft)'
                          : dupType === 'digits'
                            ? 'color-mix(in srgb, var(--accent-soft) 60%, white)'
                            : undefined
                    return (
                      <tr key={i} style={rowBg ? { background: rowBg } : undefined}>
                        <td>
                          <span
                            className="tabular-nums text-[12px]"
                            style={{ color: 'var(--ink-3)' }}
                          >
                            {dupType ? (
                              <AlertTriangle
                                className="inline h-3 w-3 mr-0.5"
                                style={{
                                  color: dupType === 'exact' ? 'var(--danger)' : 'var(--warning)',
                                }}
                              />
                            ) : null}
                            {i + 1}
                          </span>
                        </td>
                        {previewCols.map((key) => {
                          const val = row[key]
                          return (
                            <td key={key}>
                              <span
                                style={{
                                  color: val == null ? 'var(--ink-3)' : 'var(--ink-2)',
                                  fontSize: 12.5,
                                }}
                              >
                                {val != null ? String(val) : '—'}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[12px] m-0" style={{ color: 'var(--ink-3)' }}>
            Dữ liệu sẽ được nhập và tự động ghép với chuyến đã đi sau khi xác nhận.
          </p>

          {error && (
            <div
              className="flex items-start gap-2.5 px-3.5 py-3"
              style={{
                background: 'var(--danger-soft)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Done step ── */}
      {step === 'done' && (
        <div className="flex flex-col items-center text-center py-10">
          <div
            className="grid place-items-center mb-5"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--success-soft)',
              color: 'var(--success)',
              boxShadow: '0 0 0 8px color-mix(in srgb, var(--success-soft) 50%, transparent)',
            }}
          >
            <CheckCircle className="h-9 w-9" strokeWidth={1.75} />
          </div>
          <h3
            className="m-0 text-[18px] font-bold"
            style={{ letterSpacing: '-0.02em', color: 'var(--ink)' }}
          >
            Nhập thành công
          </h3>
          <p
            className="m-0 mt-2 max-w-sm text-[13px] leading-relaxed"
            style={{ color: 'var(--ink-2)' }}
          >
            Dữ liệu từ{' '}
            <span
              className="font-semibold font-mono"
              style={{ color: 'var(--ink)' }}
            >
              {file?.name ?? 'file'}
            </span>{' '}
            đã được nhập và tự động ghép với chuyến đã đi.
          </p>
        </div>
      )}
    </Drawer>
  )
}
