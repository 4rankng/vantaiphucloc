import { useState, useRef, useCallback, useMemo } from 'react'
import {
  FileSpreadsheet,
  Upload,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import { Button } from '@/components/ui'
import {
  usePreviewVendorRoutePricingImport,
  useCommitVendorRoutePricingImport,
} from '@/hooks/queries/vendor-route-pricings-import'
import type { VendorRoutePricingImportPreviewRow } from '@/services/api/vendorRoutePricings.api'
import { getWorkTypeLabel } from '@/data/domain'

type Step = 'upload' | 'preview' | 'done'

const PREVIEW_COLS = ['Nhà thầu', 'Điểm đi', 'Điểm đến', 'F20', 'F40', 'E20', 'E40', 'Tác nghiệp'] as const

function MatchBadge({ matched }: { matched: boolean }) {
  return (
    <span
      className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ml-1"
      style={{
        background: matched ? 'var(--success-soft)' : 'var(--warning-soft)',
        color: matched ? 'var(--success)' : 'var(--warning)',
      }}
    >
      {matched ? '✓' : '?'}
    </span>
  )
}

function fmtPrice(v: number | null | undefined) {
  if (v == null) return '—'
  return v.toLocaleString('vi-VN')
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VendorRoutePricingImportDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<VendorRoutePricingImportPreviewRow[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [stats, setStats] = useState<{
    total: number
    matched: number
    unmatchedVendor: number
    unmatchedLocation: number
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const previewMut = usePreviewVendorRoutePricingImport()
  const commitMut = useCommitVendorRoutePricingImport()

  const handleFileSelect = useCallback(
    (f: File | null) => {
      if (!f) return
      setFile(f)
      setError(null)
      previewMut.mutate(f, {
        onSuccess: (data) => {
          setRows(data.rows)
          setWarnings(data.warnings)
          setStats({
            total: data.stats.total,
            matched: data.stats.matched,
            unmatchedVendor: data.stats.unmatchedVendor,
            unmatchedLocation: data.stats.unmatchedLocation,
          })
          setStep('preview')
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
      })
    },
    [previewMut],
  )

  const commitRows = useMemo(() => rows.filter((r) => r.canCommit), [rows])

  const handleCommit = useCallback(() => {
    setError(null)
    commitMut.mutate(
      commitRows.map((r) => ({
        vendorId: r.vendorId,
        vendorRaw: r.vendorRaw,
        pickupLocationId: r.pickupLocationId,
        pickupRaw: r.pickupRaw,
        dropoffLocationId: r.dropoffLocationId,
        dropoffRaw: r.dropoffRaw,
        workType: r.workType,
        f20Price: r.f20Price,
        f40Price: r.f40Price,
        e20Price: r.e20Price,
        e40Price: r.e40Price,
      })),
      {
        onSuccess: () => setStep('done'),
        onError: (err) =>
          setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu'),
      },
    )
  }, [commitMut, commitRows])

  const handleReset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setRows([])
    setWarnings([])
    setStats(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const handleClose = useCallback(() => {
    handleReset()
    onOpenChange(false)
  }, [handleReset, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nhập Excel cước trả</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-1">
          {step === 'upload' && (
            <div className="space-y-4">
              {file ? (
                <div
                  className="flex items-center gap-2.5 px-3 py-2"
                  style={{ background: 'var(--accent-soft)', borderRadius: 'var(--r-sm)', border: '1px solid var(--accent)' }}
                >
                  <FileSpreadsheet className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate m-0" style={{ color: 'var(--ink)' }}>{file.name}</p>
                    <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                  onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files?.[0] ?? null) }}
                  className="nepo-dropzone cursor-pointer"
                  style={{ minHeight: 120 }}
                >
                  <Upload className="h-6 w-6 mb-2" style={{ color: 'var(--ink-3)' }} strokeWidth={1.5} />
                  <p className="text-[13px] font-semibold m-0" style={{ color: 'var(--ink)' }}>Kéo & thả file hoặc nhấn để chọn</p>
                  <p className="text-[11px] m-0 mt-1" style={{ color: 'var(--ink-3)' }}>.xlsx — Cần có cột: NHÀ THẦU, ĐIỂM ĐI, ĐIỂM ĐẾN, giá cước</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} className="hidden" />
              {previewMut.isPending && (
                <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--ink-2)' }}>
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang phân tích tệp...
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              {warnings.length > 0 && (
                <div className="flex items-start gap-2 px-3 py-2.5" style={{ background: 'var(--warning-soft)', borderRadius: 'var(--r-sm)', color: 'var(--warning)', fontSize: 13 }}>
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  {warnings.map((w, i) => <p key={i} className="m-0 font-semibold">{w}</p>)}
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap text-[12px]">
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>{file?.name}</span>
                <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>{stats?.total ?? rows.length} dòng</span>
                {(stats?.matched ?? 0) > 0 && (
                  <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>{stats!.matched} khớp</span>
                )}
                {(stats?.unmatchedVendor ?? 0) > 0 && (
                  <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>{stats!.unmatchedVendor} nhà thầu chưa khớp</span>
                )}
              </div>

              <div className="nepo-table-scroll" style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', overflow: 'auto', maxHeight: '50vh' }}>
                <table className="nepo-table w-full" style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      {PREVIEW_COLS.map((c) => <th key={c} className="text-left">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const rowBg = !r.canCommit ? 'var(--warning-soft)' : undefined
                      return (
                        <tr key={i} style={rowBg ? { background: rowBg } : undefined}>
                          <td><span className="tabular-nums text-[12px]" style={{ color: 'var(--ink-3)' }}>{i + 1}</span></td>
                          <td>
                            <span className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>{r.vendorRaw}</span>
                            <MatchBadge matched={r.vendorMatched} />
                          </td>
                          <td>
                            <span className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>{r.pickupRaw}</span>
                            <MatchBadge matched={r.pickupMatched} />
                          </td>
                          <td>
                            <span className="text-[12.5px]" style={{ color: 'var(--ink-2)' }}>{r.dropoffRaw}</span>
                            <MatchBadge matched={r.dropoffMatched} />
                          </td>
                          <td><span className="tabular-nums text-[12.5px]" style={{ color: r.f20Price ? 'var(--ink)' : 'var(--ink-3)' }}>{fmtPrice(r.f20Price)}</span></td>
                          <td><span className="tabular-nums text-[12.5px]" style={{ color: r.f40Price ? 'var(--ink)' : 'var(--ink-3)' }}>{fmtPrice(r.f40Price)}</span></td>
                          <td><span className="tabular-nums text-[12.5px]" style={{ color: r.e20Price ? 'var(--ink)' : 'var(--ink-3)' }}>{fmtPrice(r.e20Price)}</span></td>
                          <td><span className="tabular-nums text-[12.5px]" style={{ color: r.e40Price ? 'var(--ink)' : 'var(--ink-3)' }}>{fmtPrice(r.e40Price)}</span></td>
                          <td>
                            <span className="text-[12.5px]" style={{ color: r.workTypeValid ? 'var(--ink-2)' : 'var(--warning)' }}>
                              {getWorkTypeLabel(r.workType) ?? r.workType ?? '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {commitRows.length < rows.length && (
                <p className="text-[12px] m-0" style={{ color: 'var(--ink-3)' }}>
                  {commitRows.length}/{rows.length} dòng sẽ được lưu (nhà thầu/địa điểm chưa khớp sẽ được tự động tạo mới).
                </p>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="grid place-items-center mb-3" style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-soft)', color: 'var(--success)' }}>
                <CheckCircle className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <h3 className="m-0 text-[16px] font-bold" style={{ color: 'var(--ink)' }}>Nhập dữ liệu thành công</h3>
              <div className="grid grid-cols-5 gap-3 w-full mt-4">
                <div className="p-2.5 rounded-lg" style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[18px] font-bold m-0 tabular-nums" style={{ color: 'var(--success)' }}>{commitMut.data?.created ?? 0}</p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Cước trả mới</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[18px] font-bold m-0 tabular-nums" style={{ color: 'var(--accent)' }}>{commitMut.data?.updated ?? 0}</p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Cập nhật giá</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[18px] font-bold m-0 tabular-nums" style={{ color: 'var(--ink-3)' }}>{commitMut.data?.skipped ?? 0}</p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Bỏ qua</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[18px] font-bold m-0 tabular-nums" style={{ color: 'var(--warning)' }}>{commitMut.data?.createdVendors ?? 0}</p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Nhà thầu mới</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[18px] font-bold m-0 tabular-nums" style={{ color: 'var(--warning)' }}>{commitMut.data?.createdLocations ?? 0}</p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Địa điểm mới</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 mt-2" style={{ background: 'var(--danger-soft)', borderRadius: 'var(--r-sm)', color: 'var(--danger)', fontSize: 13 }}>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--line)' }}>
          {step === 'upload' && <Button variant="ghost" onClick={handleClose}>Huỷ</Button>}
          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={handleReset}>Quay lại</Button>
              <Button onClick={handleCommit} disabled={commitMut.isPending || rows.length === 0}>
                {commitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {commitMut.isPending ? 'Đang lưu...' : `Lưu ${commitRows.length} dòng`}
              </Button>
            </>
          )}
          {step === 'done' && (
            <>
              <Button variant="ghost" onClick={handleReset}>Nhập file khác</Button>
              <Button onClick={handleClose}>Xong</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
