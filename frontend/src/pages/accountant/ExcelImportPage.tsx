import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { Panel } from '@/components/shared/Panel'
import { StepIndicator } from '@/components/shared/StepIndicator'
import { Button } from '@/components/ui'
import { useBulkImportAndMatch, useAIParsePreview, useClients } from '@/hooks/use-queries'

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

export function ExcelImportPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [clientId, setClientId] = useState<string>('')
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
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

  function handlePreview() {
    if (!file) return
    setError(null)
    aiPreview.mutate(
      { file },
      {
        onSuccess: (data) => {
          if (data && typeof data === 'object' && 'rows' in data) {
            setPreviewData(((data as unknown) as { rows: PreviewRow[] }).rows ?? [])
          } else if (Array.isArray(data)) {
            setPreviewData(data as PreviewRow[])
          } else {
            setPreviewData([data as unknown as PreviewRow])
          }
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

  const previewCols = previewData.length > 0 ? Object.keys(previewData[0]).slice(0, 8) : []

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="typo-display">Nhập Excel</h1>
        <p className="typo-body-sm mt-1.5">
          Nhập chuyến từ Excel của chủ hàng — AI sẽ tự phân tích cột và đề xuất ghép nối
        </p>
      </header>

      <div
        className="px-5 py-4"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
        }}
      >
        <StepIndicator steps={STEPS} current={stepIndex(step)} />
      </div>

      {step === 'upload' && (
        <Panel
          title="Tải file Excel"
          subtitle="Hỗ trợ .xlsx, .xls, .csv"
        >
          <div className="space-y-5">
            <div>
              <label className="nepo-field-label" htmlFor="import-client">
                Chủ hàng <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(tùy chọn)</span>
              </label>
              <select
                id="import-client"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="nepo-select"
              >
                <option value="">— Chọn chủ hàng —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="nepo-field-label">File Excel</label>
              <div
                ref={dropRef}
                onClick={() => fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`nepo-dropzone ${file ? 'has-file' : ''}`}
              >
                <FileSpreadsheet
                  className="h-9 w-9 mb-2"
                  style={{ color: file ? 'var(--accent)' : 'var(--ink-3)' }}
                  strokeWidth={1.5}
                />
                <p
                  className="text-[14px] font-semibold m-0"
                  style={{ color: 'var(--ink)' }}
                >
                  {file ? file.name : 'Kéo & thả file vào đây'}
                </p>
                <p className="text-[12px] m-0 mt-1" style={{ color: 'var(--ink-3)' }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'hoặc nhấn để chọn từ máy'}
                </p>
              </div>
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

            <div className="flex justify-end">
              <Button variant="default" onClick={handlePreview} disabled={!file || aiPreview.isPending}>
                {aiPreview.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {aiPreview.isPending ? 'Đang phân tích...' : 'Xem trước'}
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
            actions={<span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Hiển thị tối đa 20 dòng đầu</span>}
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
                      {previewCols.map(key => (
                        <th key={key} className="text-left">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 20).map((row, i) => (
                      <tr key={i}>
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
                {previewData.length > 20 && (
                  <p
                    className="text-center py-3 m-0"
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-3)',
                      borderTop: '1px solid var(--line)',
                      background: 'var(--surface-2)',
                    }}
                  >
                    ... và {previewData.length - 20} dòng khác
                  </p>
                )}
              </div>
            )}
          </Panel>

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

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => { setStep('upload'); setPreviewData([]) }}
            >
              Quay lại
            </Button>
            <Button variant="default" onClick={handleImport} disabled={bulkImport.isPending}>
              {bulkImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {bulkImport.isPending ? 'Đang nhập...' : 'Nhập dữ liệu'}
            </Button>
          </div>
        </>
      )}

      {step === 'done' && (
        <Panel>
          <div className="flex flex-col items-center text-center py-10 px-4">
            <div
              className="grid place-items-center mb-4"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--success-soft)',
                color: 'var(--success)',
              }}
            >
              <CheckCircle className="h-8 w-8" strokeWidth={2.25} />
            </div>
            <h2 className="m-0" style={{ fontFamily: 'var(--theme-font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>
              Nhập thành công!
            </h2>
            <p className="m-0 mt-2 max-w-md" style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>
              Dữ liệu từ {file?.name ?? 'file'} đã được nhập và tự động ghép với chuyến đã đi.
              Bạn có thể kiểm tra ngay tại trang Đối soát.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <Button variant="ghost" onClick={handleReset}>
                Nhập file khác
              </Button>
              <Button variant="default" onClick={() => navigate('/accountant/doi-soat')}>
                Xem đối soát
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}
