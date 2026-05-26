import { useState, useRef, useCallback, useMemo } from 'react'
import { FileSpreadsheet, X, Upload, AlertCircle, AlertTriangle, Loader2, CheckCircle } from 'lucide-react'
import { Drawer } from '@/components/shared/Drawer'
import { StepIndicator } from '@/components/shared/StepIndicator'
import { Button } from '@/components/ui'
import { usePreviewLocationImport, useCommitLocationImport } from '@/hooks/use-queries'
import type { ApiResponse } from '@/data/domain'

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
  name: string
  row: number
  column: number
}

interface LocationImportDrawerProps {
  onClose: () => void
}

export function LocationImportDrawer({ onClose }: LocationImportDrawerProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [previewResult, setPreviewResult] = useState<ApiResponse<{
    filename: string
    sheetName: string
    rows: PreviewRow[]
    totalCount: number
    duplicateNames: string[]
    alreadyExist: string[]
    newNames: string[]
  }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [commitResult, setCommitResult] = useState<{
    created: number
    skippedExisting: number
    errors: string[]
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const previewImport = usePreviewLocationImport()
  const commitImport = useCommitLocationImport()

  const startPreview = useCallback((f: File) => {
    setError(null)
    previewImport.mutate(f, {
      onSuccess: (data) => {
        setPreviewResult(data)
        setPreviewData(data.rows || [])
        setStep('preview')
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
    })
  }, [previewImport])

  const handleFileSelect = useCallback((f: File | null) => {
    if (!f) return
    setError(null)
    setFile(f)
    startPreview(f)
  }, [startPreview])

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

  function handleImport() {
    if (!previewResult) return
    setError(null)

    const namesToImport = previewResult.newNames || []
    if (namesToImport.length === 0) {
      setError('Không có địa điểm mới để nhập')
      return
    }

    commitImport.mutate(namesToImport, {
      onSuccess: (data) => {
        setCommitResult(data)
        setStep('done')
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu'),
    })
  }

  function handleReset() {
    setStep('upload')
    setFile(null)
    setPreviewData([])
    setPreviewResult(null)
    setCommitResult(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const previewCols = useMemo(() => ['Tên địa điểm', 'Dòng', 'Cột'], [])

  const footer =
    step === 'upload' ? (
      <>
        <Button variant="outline" size="sm" onClick={onClose}>
          Huỷ
        </Button>
        {previewImport.isPending && (
          <div className="flex items-center gap-2" style={{ color: 'var(--ink-2)', fontSize: 13 }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang phân tích tệp...
          </div>
        )}
      </>
    ) : step === 'preview' ? (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setStep('upload')
            setPreviewData([])
            setPreviewResult(null)
          }}
        >
          Quay lại
        </Button>
        <Button
          size="sm"
          onClick={handleImport}
          disabled={commitImport.isPending || !previewResult?.newNames?.length}
        >
          {commitImport.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {commitImport.isPending ? 'Đang lưu...' : `Lưu ${previewResult?.newNames?.length || 0} địa điểm mới`}
        </Button>
      </>
    ) : (
      <>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Nhập file khác
        </Button>
        <Button size="sm" onClick={onClose}>
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
      breadcrumb="Địa điểm"
      title="Nhập danh sách địa điểm"
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
                  maxWidth: 500
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
                    {(file.size / 1024).toFixed(1)} KB · xlsx / xls
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
                  hoặc nhấn để chọn từ máy · .xlsx .xls
                </p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
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
                maxWidth: 500
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <p className="text-[13px] font-semibold m-0 mb-2" style={{ color: 'var(--ink)' }}>
              Định dạng file mong đợi:
            </p>
            <ul className="text-[12px] m-0 pl-4 space-y-1" style={{ color: 'var(--ink-2)' }}>
              <li>File Excel có chứa danh sách tên địa điểm</li>
              <li>Hệ thống sẽ tự động phát hiện sheet chứa dữ liệu địa điểm</li>
              <li>Tên địa điểm trùng với hệ thống sẽ được tự động bỏ qua</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Preview step ── */}
      {step === 'preview' && previewResult && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
              <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--accent)' }}>
                {previewResult.totalCount}
              </p>
              <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Tổng số địa điểm trong file</p>
            </div>
            <div className="p-3 rounded-lg border" style={{ background: 'var(--success-soft)', borderColor: 'var(--success)' }}>
              <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--success)' }}>
                {previewResult.newNames?.length || 0}
              </p>
              <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Địa điểm mới sẽ tạo</p>
            </div>
            <div className="p-3 rounded-lg border" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
              <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--ink-2)' }}>
                {previewResult.alreadyExist?.length || 0}
              </p>
              <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Đã tồn tại (bỏ qua)</p>
            </div>
          </div>

          {/* Warnings */}
          {(previewResult.duplicateNames?.length || 0) > 0 && (
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
                <p className="m-0 font-semibold">
                  Có {previewResult.duplicateNames?.length} địa điểm trùng trong file
                </p>
                <p className="text-[12px] m-0 mt-1" style={{ opacity: 0.9 }}>
                  {previewResult.duplicateNames?.slice(0, 5).join(', ')}
                  {previewResult.duplicateNames?.length > 5 && '...'}
                </p>
              </div>
            </div>
          )}

          {/* Sheet info */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
              Sheet: {previewResult.sheetName}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
            >
              {previewResult.totalCount} dòng
            </span>
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
                maxHeight: 'calc(100vh - 350px)',
              }}
            >
              <table className="nepo-table w-full" style={{ minWidth: 400 }}>
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
                  {previewData.map((row, i) => {
                    const isNew = previewResult.newNames?.includes(row.name)
                    const rowBg = isNew ? 'var(--success-soft)' : undefined
                    return (
                      <tr key={i} style={rowBg ? { background: rowBg } : undefined}>
                        <td>
                          <span className="tabular-nums text-[12px]" style={{ color: 'var(--ink-3)' }}>
                            {i + 1}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--ink-2)', fontSize: 12.5 }}>
                            {row.name}
                          </span>
                          {isNew && (
                            <span
                              className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{ background: 'var(--success)', color: '#fff' }}
                            >
                              Mới
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="tabular-nums text-[12px]" style={{ color: 'var(--ink-3)' }}>
                            {row.row}
                          </span>
                        </td>
                        <td>
                          <span className="tabular-nums text-[12px]" style={{ color: 'var(--ink-3)' }}>
                            {row.column}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

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
      {step === 'done' && commitResult && (
        <div className="flex flex-col items-center text-center py-6 max-w-xl mx-auto">
          <div
            className="grid place-items-center mb-4"
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--success-soft)',
              color: 'var(--success)',
              boxShadow: '0 0 0 6px color-mix(in srgb, var(--success-soft) 50%, transparent)',
            }}
          >
            <CheckCircle className="h-8 w-8" strokeWidth={1.75} />
          </div>
          <h3
            className="m-0 text-[18px] font-bold"
            style={{ letterSpacing: '-0.02em', color: 'var(--ink)' }}
          >
            Nhập dữ liệu thành công
          </h3>
          <p
            className="m-0 mt-2 text-[13px] leading-relaxed"
            style={{ color: 'var(--ink-2)' }}
          >
            Đã thêm{' '}
            <span className="font-semibold" style={{ color: 'var(--success)' }}>
              {commitResult.created}
            </span>{' '}
            địa điểm mới vào hệ thống.
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            <div className="p-3 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
              <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--success)' }}>
                {commitResult.created}
              </p>
              <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Địa điểm đã tạo</p>
            </div>
            <div className="p-3 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
              <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--ink-2)' }}>
                {commitResult.skippedExisting}
              </p>
              <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Bỏ qua (đã tồn tại)</p>
            </div>
          </div>

          {/* Errors list if any */}
          {commitResult.errors.length > 0 && (
            <div className="w-full text-left mt-5 space-y-1.5">
              <h4 className="text-[12.5px] font-bold m-0" style={{ color: 'var(--danger)' }}>
                Một số địa điểm gặp lỗi khi xử lý ({commitResult.errors.length}):
              </h4>
              <div
                className="p-3 rounded border border-solid max-h-40 overflow-y-auto"
                style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', fontSize: 11.5 }}
              >
                {commitResult.errors.map((err, idx) => (
                  <p key={idx} className="m-0 mt-1 font-mono" style={{ color: 'var(--danger)' }}>
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
