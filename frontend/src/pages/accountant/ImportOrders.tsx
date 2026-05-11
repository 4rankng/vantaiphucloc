import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Tag, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { useClients } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { apiClient } from '@/services/api'
import type {
  ColumnMappingDto,
  CommitResponse,
  CommitRow,
  LocationResolutionDto,
  ParsedRowDto,
  PreviewResultDto,
} from '@/services/api/imports.api'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ImportOrders({ onClose }: { onClose?: () => void } = {}) {
  const toast = useToast()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: clients = [] } = useClients()

  const [clientId, setClientId] = useState('')
  const [defaultTripDate, setDefaultTripDate] = useState(todayIso())
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [applyingPricing, setApplyingPricing] = useState(false)
  const [preview, setPreview] = useState<PreviewResultDto | null>(null)
  const [mapping, setMapping] = useState<ColumnMappingDto[]>([])
  const [editedRows, setEditedRows] = useState<ParsedRowDto[]>([])
  const [lastCommit, setLastCommit] = useState<CommitResponse | null>(null)
  const [pricingResult, setPricingResult] = useState<{ priced: number; unpriced: number } | null>(null)

  const clientOptions = useMemo(
    () => clients.map(c => ({ value: String(c.id), label: c.name, sublabel: c.code ? `Mã: ${c.code}` : undefined })),
    [clients],
  )

  const handlePickFile = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const runPreview = async () => {
    if (!file) {
      toast.error('Chưa chọn tệp')
      return
    }
    setBusy(true)
    try {
      const result = await apiClient.previewCustomerExcel({
        file,
        clientId: clientId ? Number(clientId) : undefined,
        defaultTripDate,
      })
      setPreview(result)
      setMapping(result.column_mappings)
      setEditedRows(result.accepted)
      if (result.template_used) {
        toast.success('Đã áp dụng template đã lưu')
      }
    } catch (err) {
      const detail = (err as { message?: string })?.message ?? 'Không phân tích được tệp.'
      toast.error('Lỗi phân tích', detail)
    } finally {
      setBusy(false)
    }
  }

  const updateRowValue = (rowSourceIdx: number, key: keyof ParsedRowDto['values'], value: string) => {
    setEditedRows(prev =>
      prev.map(r =>
        r.source_row_index === rowSourceIdx
          ? { ...r, values: { ...r.values, [key]: value } }
          : r,
      ),
    )
  }

  const removeRow = (rowSourceIdx: number) => {
    setEditedRows(prev => prev.filter(r => r.source_row_index !== rowSourceIdx))
  }

  const applyPricing = async () => {
    if (!lastCommit?.created_trip_ids?.length) return
    setApplyingPricing(true)
    try {
      const res = await apiClient.applyPricingToTripIds(lastCommit.created_trip_ids)
      const total = res.priced + res.unpriced
      const summary = `Đã áp giá ${res.priced}/${total} đơn`
      if (res.unpriced > 0) {
        toast.info(summary, `${res.unpriced} đơn chưa có bảng giá phù hợp.`)
      } else {
        toast.success(summary, 'Tất cả đơn vừa nhập đã có đơn giá.')
      }
      setPricingResult({ priced: res.priced, unpriced: res.unpriced })
    } catch (err) {
      const detail = (err as { message?: string })?.message ?? 'Không áp giá được.'
      toast.error('Lỗi áp giá', detail)
    } finally {
      setApplyingPricing(false)
    }
  }

  const commit = async () => {
    if (!preview) return
    if (!clientId) {
      toast.error('Vui lòng chọn khách hàng')
      return
    }
    if (!editedRows.length) {
      toast.error('Không có dòng nào để tạo')
      return
    }
    setCommitting(true)
    try {
      const rows: CommitRow[] = editedRows.map(r => ({
        container_no: r.values.container_no,
        container_size: r.values.container_size,
        freight_kind: r.values.freight_kind,
        work_type: r.values.work_type,
        container_type_iso: r.values.container_type_iso || '',
        gross_weight_kg: r.values.gross_weight_kg ?? null,
        seal_no: r.values.seal_no || '',
        pickup_location: r.values.pickup_location || '',
        dropoff_location: r.values.dropoff_location || '',
        pickup_date: r.values.pickup_date || null,
        dropoff_date: r.values.dropoff_date || null,
        trip_date: r.values.trip_date || defaultTripDate,
        customer_ref: r.values.customer_ref || '',
        consignee: r.values.consignee || '',
        commodity: r.values.commodity || '',
        driver_name: r.values.driver_name || '',
        remarks: r.values.remarks || '',
      }))
      const res = await apiClient.commitCustomerExcel({
        partner_id: Number(clientId),
        rows,
        overwrite_duplicates: false,
        structure_hash: preview.structure_hash,
        sheet_name: preview.sheet_name,
        header_row_index: preview.header_row_index,
        column_mapping: mapping,
      })
      toast.success(
        'Đã tạo đơn hàng',
        `Tạo ${res.created}, bỏ qua ${res.skipped_duplicates} trùng`,
      )
      if (res.errors.length) {
        toast.error(`${res.errors.length} dòng lỗi`, res.errors[0])
      }
      setLastCommit(res)
      setPricingResult(null)
      // Reset upload state but keep the result panel visible.
      setPreview(null)
      setMapping([])
      setEditedRows([])
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      const detail = (err as { message?: string })?.message ?? 'Không tạo được đơn hàng.'
      toast.error('Lỗi tạo đơn', detail)
    } finally {
      setCommitting(false)
    }
  }

  // Drag & drop handlers
  const [dragging, setDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f)
    } else if (f) {
      toast.error('Định dạng không hỗ trợ', 'Chỉ chấp nhận file .xlsx hoặc .xls')
    }
  }, [toast])

  return (
    <div className="space-y-4">
      {/* Page header — only shown when used as a standalone page (no onClose prop) */}
      {!onClose && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-[color-mix(in_srgb,var(--theme-brand-primary)_8%,transparent)]"
            style={{ color: 'var(--theme-text-secondary)' }}
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="typo-h1">Nhập dữ liệu đơn hàng</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
              Tải lên file Excel từ khách hàng để tạo đơn hàng tự động
            </p>
          </div>
        </div>
      )}

      {/* Results panel — appears after a successful commit */}
      {lastCommit && (lastCommit.created_trip_ids?.length ?? 0) > 0 && (
        <div
          className="card p-5"
          style={{
            borderLeft: pricingResult
              ? pricingResult.unpriced > 0
                ? '4px solid var(--theme-status-warning)'
                : '4px solid var(--theme-status-success)'
              : '4px solid var(--theme-status-info)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="typo-h2">
                Đã tạo {lastCommit.created} đơn hàng ({lastCommit.created_trip_ids?.length ?? 0} ID)
              </h3>
              <p className="typo-caption">
                {pricingResult
                  ? `Áp giá: ${pricingResult.priced}/${pricingResult.priced + pricingResult.unpriced} đơn`
                  : 'Đơn đang ở trạng thái DRAFT, chưa có đơn giá. Bấm Áp giá để tự động lấy giá theo bảng giá.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!pricingResult && (
                <Button
                  onClick={applyPricing}
                  disabled={applyingPricing}
                  className="btn-primary h-9 px-4 text-sm"
                >
                  <Tag className="w-4 h-4 mr-1.5" />
                  {applyingPricing ? 'Đang áp giá...' : 'Áp giá theo bảng giá'}
                </Button>
              )}
              {pricingResult && pricingResult.unpriced > 0 && (
                <Button
                  onClick={() => navigate('/accountant/trips?unpriced=true')}
                  className="btn-secondary h-9 px-4 text-sm"
                >
                  Xem {pricingResult.unpriced} đơn chưa có giá
                </Button>
              )}
              <Button
                onClick={() => {
                  setLastCommit(null)
                  setPricingResult(null)
                }}
                className="btn-ghost h-9 px-3 text-sm"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 — Client, Date, Dropzone */}
      <div className="card p-5 space-y-4">
        {/* Client + Date row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="typo-form-label">Khách hàng</label>
            <InlineSelect
              placeholder="Chọn khách hàng"
              value={clientId}
              options={clientOptions}
              onChange={setClientId}
            />
          </div>
          <div className="space-y-1.5">
            <label className="typo-form-label" htmlFor="default-trip-date">Ngày mặc định</label>
            <Input
              id="default-trip-date"
              type="date"
              value={defaultTripDate}
              onChange={e => setDefaultTripDate(e.target.value)}
              className="h-11 text-sm"
            />
          </div>
        </div>

        {/* Dropzone */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={file ? undefined : handlePickFile}
          className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
            dragging ? 'border-[var(--theme-brand-primary)] bg-[var(--theme-brand-primary-light)]' : 'border-[var(--theme-border-default)]'
          }`}
          style={{ background: dragging ? undefined : 'var(--theme-bg-tertiary)' }}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-8 h-8 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{file.name}</p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="ml-2 w-7 h-7 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-[var(--theme-bg-secondary)]"
                style={{ color: 'var(--theme-text-muted)' }}
                aria-label="Xoá tệp"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)' }}>
                <FileSpreadsheet className="w-7 h-7" style={{ color: 'var(--theme-brand-primary)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  Kéo thả tệp Excel vào đây
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                  hoặc{' '}
                  <span className="font-semibold underline underline-offset-2" style={{ color: 'var(--theme-brand-primary)' }}>
                    bấm để chọn tệp
                  </span>
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}
                >
                  .xlsx · .xls
                </span>
                <span style={{ color: 'var(--theme-border-default)' }}>·</span>
                <a
                  href="/sample-import-template.xlsx"
                  download
                  onClick={e => e.stopPropagation()}
                  className="text-[11px] underline underline-offset-2 transition hover:opacity-70"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  Tải file mẫu
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            {onClose && !preview && (
              <Button
                onClick={onClose}
                className="btn-ghost h-10 px-4 text-sm"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                Huỷ
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={runPreview}
              disabled={!file || busy}
              className="btn-primary h-10 px-5 text-sm font-semibold"
              style={
                file && !busy
                  ? { background: 'var(--theme-brand-primary)', color: '#fff', opacity: 1 }
                  : undefined
              }
            >
              {busy ? 'Đang phân tích...' : 'Phân tích tệp'}
            </Button>
            {preview && (
              <Button
                onClick={commit}
                disabled={!clientId || !editedRows.length || committing}
                className="btn-primary h-10 px-5 text-sm"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {committing ? 'Đang tạo...' : `Tạo ${editedRows.length} đơn hàng`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pane 2 — detected layout summary */}
      {preview && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="typo-h2">Bố cục nhận diện</h3>
            <span className="typo-caption">
              {preview.template_used ? 'Đã áp dụng template' : 'Phân tích tự động'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Stat label="Sheet" value={preview.sheet_name} />
            <Stat label="Hàng tiêu đề" value={`Hàng ${preview.header_row_index + 1}`} />
            <Stat label="Đã chấp nhận" value={String(preview.accepted.length)} ok />
            <Stat label="Bị bỏ" value={String(preview.rejected.length)} warn />
          </div>
          {preview.warnings.length > 0 && (
            <div
              className="rounded-md p-3 text-sm flex items-start gap-2"
              style={{ background: 'var(--theme-status-warning-light, #fff7ed)', color: 'var(--theme-status-warning, #ea580c)' }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{preview.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>
            </div>
          )}
          {preview.sheet_alternatives.length > 0 && (
            <p className="typo-caption mt-3">
              Sheet khác: {preview.sheet_alternatives.map(s => `${s.sheet_name} (${s.score})`).join(', ')}
            </p>
          )}
        </div>
      )}


      {/* Pane 3b — parsed rows preview */}
      {preview && editedRows.length > 0 && (
        <div className="card p-5">
          <h3 className="typo-h2 mb-3">Xem trước đơn hàng ({editedRows.length})</h3>
          <div className="overflow-x-auto" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="w-full text-xs">
              <thead style={{ color: 'var(--theme-text-secondary)', position: 'sticky', top: 0, background: 'var(--theme-bg-primary)' }}>
                <tr className="text-left">
                  <th className="py-1.5 px-2 font-medium">#</th>
                  <th className="py-1.5 px-2 font-medium">Container</th>
                  <th className="py-1.5 px-2 font-medium">Loại</th>
                  <th className="py-1.5 px-2 font-medium">Ngày</th>
                  <th className="py-1.5 px-2 font-medium">Điểm đi</th>
                  <th className="py-1.5 px-2 font-medium">Điểm đến</th>
                  <th className="py-1.5 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {editedRows.slice(0, 200).map(r => (
                  <tr key={r.source_row_index} className="border-t" style={{ borderColor: 'var(--theme-border-subtle)' }}>
                    <td className="py-1 px-2 text-muted-foreground">{r.source_row_index + 1}</td>
                    <td className="py-1 px-2 font-mono">{r.values.container_no}</td>
                    <td className="py-1 px-2">{r.values.work_type}</td>
                    <td className="py-1 px-2">
                      <input
                        type="date"
                        value={r.values.trip_date ?? ''}
                        onChange={e => updateRowValue(r.source_row_index, 'trip_date', e.target.value)}
                        className="h-7 px-1 rounded border text-xs w-32"
                        style={{ borderColor: 'var(--theme-border)', background: 'transparent' }}
                      />
                    </td>
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={r.values.pickup_location ?? ''}
                          onChange={e => updateRowValue(r.source_row_index, 'pickup_location', e.target.value)}
                          className="h-7 px-1 rounded border text-xs w-24"
                          style={{ borderColor: 'var(--theme-border)', background: 'transparent' }}
                        />
                        <LocationBadge resolution={preview.location_resolutions?.[r.values.pickup_location ?? '']} />
                      </div>
                    </td>
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={r.values.dropoff_location ?? ''}
                          onChange={e => updateRowValue(r.source_row_index, 'dropoff_location', e.target.value)}
                          className="h-7 px-1 rounded border text-xs w-24"
                          style={{ borderColor: 'var(--theme-border)', background: 'transparent' }}
                        />
                        <LocationBadge resolution={preview.location_resolutions?.[r.values.dropoff_location ?? '']} />
                      </div>
                    </td>
                    <td className="py-1 px-2">
                      <button
                        type="button"
                        onClick={() => removeRow(r.source_row_index)}
                        className="text-xs"
                        style={{ color: 'var(--theme-status-error)' }}
                        title="Bỏ dòng"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {editedRows.length > 200 && (
              <p className="typo-caption mt-2">
                Hiển thị 200 / {editedRows.length} dòng. Tất cả {editedRows.length} dòng sẽ được tạo khi nhấn "Tạo đơn hàng".
              </p>
            )}
          </div>

        </div>
      )}

    </div>
  )
}

/**
 * Tiny chip showing how a pickup/dropoff string resolves against the
 * Location table. Four states:
 *   exact_name / exact_alias → green "có sẵn"
 *   fuzzy_auto              → amber "gợi ý: {canonical}" (auto-linked, marked review)
 *   fuzzy_ambiguous         → amber "trùng lặp?" (multiple candidates)
 *   new                     → blue "mới" (will create on commit)
 */
function LocationBadge({ resolution }: { resolution?: LocationResolutionDto }) {
  if (!resolution) return null
  const style = (bg: string, fg: string) =>
    ({ background: bg, color: fg, padding: '1px 6px', borderRadius: 4, fontSize: 10, whiteSpace: 'nowrap' as const })
  switch (resolution.match_kind) {
    case 'exact_name':
    case 'exact_alias':
      return (
        <span style={style('rgba(34,197,94,0.15)', '#16a34a')} title={`→ ${resolution.location_name}`}>
          có sẵn
        </span>
      )
    case 'fuzzy_auto':
      return (
        <span style={style('rgba(234,179,8,0.18)', '#a16207')}
              title={`Gợi ý: ${resolution.location_name} (auto-link)`}>
          gợi ý: {resolution.location_name?.slice(0, 12)}
        </span>
      )
    case 'fuzzy_ambiguous':
      return (
        <span style={style('rgba(234,179,8,0.18)', '#a16207')}
              title={resolution.suggestions.map(s => `${s.name} (${(s.score * 100).toFixed(0)}%)`).join('\n')}>
          trùng lặp?
        </span>
      )
    case 'new':
      return <span style={style('rgba(59,130,246,0.18)', '#1d4ed8')}>mới</span>
    default:
      return null
  }
}


function Stat({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-md p-2.5" style={{ background: 'var(--theme-bg-tertiary)' }}>
      <p className="typo-caption mb-0.5">{label}</p>
      <p
        className="text-sm font-semibold"
        style={{
          color: ok ? 'var(--theme-status-success)' : warn ? 'var(--theme-status-warning)' : 'var(--theme-text-primary)',
        }}
      >
        {value}
      </p>
    </div>
  )
}

