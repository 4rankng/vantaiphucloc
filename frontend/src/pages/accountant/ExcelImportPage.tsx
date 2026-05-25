import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ArrowRight, X, ArrowLeft,
} from 'lucide-react'
import { Panel } from '@/components/shared/Panel'
import { StepIndicator } from '@/components/shared/StepIndicator'
import { Button } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { LinkButton } from '@/components/shared/LinkButton'
import { useBulkImportAndMatch, useParsePreview, useClients } from '@/hooks/use-queries'

type Step = 'upload' | 'preview' | 'done'

interface PreviewRow {
  [key: string]: unknown
}

const STEPS = [
  { label: 'Tải file', description: 'Chọn Excel + chủ hàng' },
  { label: 'Xem trước', description: 'Kiểm tra dữ liệu AI phân tích' },
  { label: 'Hoàn tất', description: 'Đã nhập và ghép nối' },
]

function stepIndex(step: Step): number {
  return step === 'upload' ? 0 : step === 'preview' ? 1 : 2
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InlineError({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2.5 px-3.5 py-3"
      style={{ background: 'var(--danger-soft)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13 }}
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}

function FilePreviewChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2"
      style={{ background: 'var(--accent-soft)', borderRadius: 'var(--r-sm)', border: '1px solid var(--accent)' }}
    >
      <FileSpreadsheet className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold truncate m-0" style={{ color: 'var(--ink)' }}>{file.name}</p>
        <p className="text-[11px] m-0" style={{ color: 'var(--ink-3)' }}>{(file.size / 1024).toFixed(1)} KB</p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="grid place-items-center rounded-md"
        style={{ width: 24, height: 24, color: 'var(--ink-3)' }}
        aria-label="Xoá file"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ExcelImportPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [clientId, setClientId] = useState<string>('')
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [previewColumns, setPreviewColumns] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const { data: clients = [] } = useClients()
  const bulkImport = useBulkImportAndMatch()
  const parsePreview = useParsePreview()

  const handleFileSelect = useCallback((f: File | null) => {
    if (!f) return
    setFile(f)
    setError(null)
  }, [])

  function handlePreview() {
    if (!file) return
    setError(null)
    parsePreview.mutate(
      { file },
      {
        onSuccess: (data) => {
          setPreviewColumns(data.columns ?? [])
          setPreviewData(data.rows ?? [])
          setStep('preview')
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file')
        },
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
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

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
    const f = e.dataTransfer.files?.[0]
    handleFileSelect(f ?? null)
  }

  const previewCols = previewColumns.length > 0 ? previewColumns : []

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <header>
        <LinkButton onClick={() => navigate('/accountant/doi-soat')} icon={ArrowLeft}>
          Đối soát
        </LinkButton>
        <h1 className="typo-display mt-2">Nhập Excel</h1>
        <p className="typo-body-sm mt-1">
          Nhập chuyến từ Excel của chủ hàng
        </p>
      </header>

      {/* ── Step indicator ── */}
      <Panel>
        <StepIndicator steps={STEPS} current={stepIndex(step)} />
      </Panel>

      {/* ── Step content (key={step} re-triggers animation) ── */}
      <div key={step} className="animate-fade-in">

        {step === 'upload' && (
          <Panel
            title="Tải file Excel"
            subtitle="Hỗ trợ .xlsx, .xls, .csv"
          >
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="nepo-field-label">
                  Chủ hàng <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(tùy chọn)</span>
                </label>
                <InlineSelect
                  placeholder="Chọn chủ hàng"
                  value={clientId}
                  options={clients.map(c => ({ value: String(c.id), label: c.name }))}
                  onChange={setClientId}
                />
                <p className="text-[11.5px]" style={{ color: 'var(--ink-4)' }}>
                  Để trống nếu muốn hệ thống tự suy từ nội dung file — chọn thủ công nếu muốn chắc chắn
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="nepo-field-label">File Excel</label>
                {file ? (
                  <FilePreviewChip
                    file={file}
                    onRemove={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                  />
                ) : (
                  <div
                    ref={dropRef}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="nepo-dropzone"
                  >
                    <Upload className="h-8 w-8 mb-2" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
                    <p className="text-[14px] font-semibold m-0" style={{ color: 'var(--ink)' }}>
                      Kéo & thả file vào đây
                    </p>
                    <p className="text-[12px] m-0 mt-1" style={{ color: 'var(--ink-3)' }}>
                      hoặc nhấn để chọn từ máy
                    </p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>

              {error && <InlineError message={error} />}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                  Hỗ trợ .xlsx, .xls, .csv
                </span>
                <Button variant="default" onClick={handlePreview} disabled={!file || parsePreview.isPending}>
                  {parsePreview.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {parsePreview.isPending ? 'Đang phân tích...' : 'Xem trước'}
                </Button>
              </div>
            </div>
          </Panel>
        )}

        {step === 'preview' && (
          <>
            <Panel
              title={`Xem trước (${previewData.length} dòng)`}
              subtitle={file ? file.name : undefined}
              actions={
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] rounded-full px-2 py-0.5 font-medium"
                    style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
                  >
                    {previewCols.length} cột
                  </span>
                  {previewData.length > 20 && (
                    <span className="text-[11px]" style={{ color: 'var(--ink-3)' }}>
                      Hiển thị 20 dòng đầu
                    </span>
                  )}
                </div>
              }
              flush
            >
              {previewData.length === 0 ? (
                <div className="py-10 text-center text-[13px]" style={{ color: 'var(--ink-3)' }}>
                  Không có dữ liệu
                </div>
              ) : (
                <div className="nepo-table-scroll" style={{ maxHeight: 480 }}>
                  <table className="nepo-table w-full" style={{ minWidth: 900 }}>
                    <thead>
                      <tr>
                        <th className="nepo-th-sticky" style={{ width: 44 }}>#</th>
                        {previewCols.map(key => (
                          <th key={key} className="text-left">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 20).map((row, i) => (
                        <tr key={i}>
                          <td className="nepo-td-sticky">
                            <span className="text-[12px]" style={{ color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
                              {i + 1}
                            </span>
                          </td>
                          {previewCols.map((key) => {
                            const val = row[key]
                            return (
                              <td key={key}>
                                <span style={{ color: val == null ? 'var(--ink-3)' : 'var(--ink-2)' }}>
                                  {val != null ? String(val) : '—'}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {error && <InlineError message={error} />}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                Hệ thống đã ánh xạ các cột — dữ liệu sẽ được nhập rồi tự động ghép với chuyến đã đi
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setStep('upload'); setPreviewData([]); setPreviewColumns([]) }}>
                  Quay lại
                </Button>
                <Button size="sm" onClick={handleImport} disabled={bulkImport.isPending}>
                  {bulkImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {bulkImport.isPending ? 'Đang nhập...' : 'Nhập dữ liệu'}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'done' && (
          <Panel title="Nhập thành công!">
            <div className="flex flex-col items-center text-center py-10 px-4">
              <div
                className="grid place-items-center mb-5"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'var(--success-soft)',
                  color: 'var(--success)',
                  boxShadow: '0 0 0 8px color-mix(in srgb, var(--success-soft) 50%, transparent)',
                }}
              >
                <CheckCircle className="h-10 w-10" strokeWidth={1.75} />
              </div>
              <p className="m-0 mt-2 max-w-md typo-body-sm" style={{ color: 'var(--ink-2)' }}>
                Dữ liệu từ <span className="font-mono font-semibold" style={{ color: 'var(--ink)' }}>{file?.name ?? 'file'}</span> đã được nhập và tự động ghép với chuyến đã đi.
                Bạn có thể kiểm tra ngay tại trang Đối soát.
              </p>
              <div className="flex items-center gap-2 mt-6">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Nhập file khác
                </Button>
                <Button size="sm" onClick={() => navigate('/accountant/doi-soat')}>
                  Xem đối soát
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Panel>
        )}

      </div>
    </div>
  )
}
