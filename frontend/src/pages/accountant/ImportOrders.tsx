import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, FileText, AlertTriangle, CheckCircle2, XCircle, Save } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { useClients } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { apiClient } from '@/services/api'
import type {
  CanonicalSchema,
  ColumnMappingDto,
  CommitRow,
  LocationResolutionDto,
  ParsedRowDto,
  PreviewResultDto,
} from '@/services/api/imports.api'

const SKIP_FIELD = '__skip__'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function confidenceBadge(conf: number): { label: string; color: string } {
  if (conf >= 0.95) return { label: 'Cao', color: 'var(--theme-status-success)' }
  if (conf >= 0.6) return { label: 'TB', color: 'var(--theme-status-info)' }
  if (conf > 0) return { label: 'Thấp', color: 'var(--theme-status-warning)' }
  return { label: '—', color: 'var(--theme-text-muted)' }
}

export function ImportOrders() {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: clients = [] } = useClients()

  const [clientId, setClientId] = useState('')
  const [defaultTripDate, setDefaultTripDate] = useState(todayIso())
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [preview, setPreview] = useState<PreviewResultDto | null>(null)
  const [mapping, setMapping] = useState<ColumnMappingDto[]>([])
  const [editedRows, setEditedRows] = useState<ParsedRowDto[]>([])
  const [saveTemplateName, setSaveTemplateName] = useState('')
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false)
  const [schema, setSchema] = useState<CanonicalSchema | null>(null)

  useEffect(() => {
    apiClient.getCanonicalSchema().then(setSchema).catch(() => {/* non-fatal */})
  }, [])

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

  const updateMapping = (colIdx: number, newField: string | null) => {
    setMapping(prev =>
      prev.map(m =>
        m.column_index === colIdx
          ? { ...m, canonical_field: newField, source: 'manual', confidence: newField ? 1.0 : 0.0 }
          : m,
      ),
    )
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
        tractor_plate: r.values.tractor_plate || '',
        remarks: r.values.remarks || '',
      }))
      const res = await apiClient.commitCustomerExcel({
        client_id: Number(clientId),
        rows,
        overwrite_duplicates: overwriteDuplicates,
        save_template_as: saveTemplateName || undefined,
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
      // Reset
      setPreview(null)
      setMapping([])
      setEditedRows([])
      setFile(null)
      setSaveTemplateName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      const detail = (err as { message?: string })?.message ?? 'Không tạo được đơn hàng.'
      toast.error('Lỗi tạo đơn', detail)
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nhập đơn hàng từ Excel"
        subtitle="Tải tệp khách hàng (loading list, discharging list, BDST, log bãi…) — hệ thống tự nhận dạng và đề xuất ánh xạ cột."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={runPreview} disabled={!file || busy} className="btn-secondary h-9 px-4 text-sm">
              {busy ? 'Đang phân tích...' : 'Phân tích tệp'}
            </Button>
            <Button
              onClick={commit}
              disabled={!preview || !clientId || !editedRows.length || committing}
              className="btn-primary h-9 px-4 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {committing ? 'Đang tạo...' : `Tạo ${editedRows.length} đơn hàng`}
            </Button>
          </div>
        }
      />

      {/* Pane 1 — file upload + period/client */}
      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="typo-form-label">Tệp Excel</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button onClick={handlePickFile} className="btn-secondary h-9 px-4 text-sm w-full">
              <Upload className="w-4 h-4 mr-1.5" />
              {file ? file.name : 'Chọn tệp...'}
            </Button>
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

      {/* Pane 3a — column mapping table */}
      {preview && schema && (
        <div className="card p-5">
          <h3 className="typo-h2 mb-3">Ánh xạ cột</h3>
          <p className="typo-caption mb-3">Có thể chọn lại trường nếu cột nào ánh xạ chưa đúng.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ color: 'var(--theme-text-secondary)' }}>
                <tr className="text-left">
                  <th className="py-2 px-2 font-medium">Cột</th>
                  <th className="py-2 px-2 font-medium">Tiêu đề</th>
                  <th className="py-2 px-2 font-medium">Trường</th>
                  <th className="py-2 px-2 font-medium">Tin cậy</th>
                  <th className="py-2 px-2 font-medium">Mẫu giá trị</th>
                </tr>
              </thead>
              <tbody>
                {mapping.map(m => (
                  <tr key={m.column_index} className="border-t" style={{ borderColor: 'var(--theme-border-subtle)' }}>
                    <td className="py-2 px-2 font-mono">{m.column_index + 1}</td>
                    <td className="py-2 px-2">{m.header_text || <em>(trống)</em>}</td>
                    <td className="py-2 px-2">
                      <select
                        value={m.canonical_field ?? ''}
                        onChange={e => updateMapping(m.column_index, e.target.value || null)}
                        className="h-8 px-2 rounded border text-sm"
                        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)' }}
                      >
                        <option value="">— Chưa ánh xạ —</option>
                        <option value={SKIP_FIELD}>Bỏ qua (vessel/admin)</option>
                        {schema.fields.map(f => (
                          <option key={f.name} value={f.name}>{f.label} ({f.name})</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <span style={{ color: confidenceBadge(m.confidence).color }} className="text-xs font-medium">
                        {confidenceBadge(m.confidence).label} · {Math.round(m.confidence * 100)}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-xs text-truncate" style={{ color: 'var(--theme-text-muted)' }}>
                      {m.sample_values.slice(0, 3).join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  <th className="py-1.5 px-2 font-medium">Trọng lượng</th>
                  <th className="py-1.5 px-2 font-medium">Khách hàng</th>
                  <th className="py-1.5 px-2 font-medium">Booking</th>
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
                    <td className="py-1 px-2 tabular-nums">{r.values.gross_weight_kg ?? ''}</td>
                    <td className="py-1 px-2">{r.values.consignee ?? ''}</td>
                    <td className="py-1 px-2 font-mono text-[11px]">{r.values.customer_ref ?? ''}</td>
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

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="typo-form-label" htmlFor="save-template-name">
                Lưu thành template (tuỳ chọn)
              </label>
              <Input
                id="save-template-name"
                placeholder="VD: HAIAN Loading List"
                value={saveTemplateName}
                onChange={e => setSaveTemplateName(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="typo-caption">Lần sau khi nhập tệp cùng cấu trúc, hệ thống dùng lại ánh xạ này.</p>
            </div>
            <div className="space-y-1.5">
              <label className="typo-form-label">Tuỳ chọn</label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={overwriteDuplicates}
                  onChange={e => setOverwriteDuplicates(e.target.checked)}
                />
                Ghi đè đơn trùng (cùng ngày + container)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Rejected rows */}
      {preview && preview.rejected.length > 0 && (
        <div className="card p-5">
          <h3 className="typo-h2 mb-2">Dòng bị bỏ ({preview.rejected.length})</h3>
          <p className="typo-caption mb-3">Các dòng dưới đây không vượt qua kiểm tra. Có thể sửa file gốc rồi tải lại.</p>
          <div className="overflow-x-auto" style={{ maxHeight: '240px', overflowY: 'auto' }}>
            <table className="w-full text-xs">
              <thead><tr className="text-left">
                <th className="py-1.5 px-2 font-medium">#</th>
                <th className="py-1.5 px-2 font-medium">Lý do</th>
                <th className="py-1.5 px-2 font-medium">Container</th>
              </tr></thead>
              <tbody>
                {preview.rejected.slice(0, 100).map(r => (
                  <tr key={r.source_row_index} className="border-t" style={{ borderColor: 'var(--theme-border-subtle)' }}>
                    <td className="py-1 px-2 text-muted-foreground">{r.source_row_index + 1}</td>
                    <td className="py-1 px-2">{r.reasons.join(', ')}</td>
                    <td className="py-1 px-2 font-mono">{String((r.raw as Record<string, unknown>).container_no ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
