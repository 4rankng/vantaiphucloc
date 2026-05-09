import { useMemo, useRef, useState } from 'react'
import { Upload, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { useClients } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { apiClient } from '@/services/api'
import type {
  PricingFormat,
  PricingPreviewResponse,
  PricingPreviewRow,
} from '@/services/api/imports.api'

const FORMAT_OPTIONS: { value: PricingFormat | ''; label: string; sublabel?: string }[] = [
  { value: '', label: 'Tự nhận diện theo tên tệp' },
  { value: 'pan', label: 'PAN', sublabel: "Sheet 'Trucking (HD)'" },
  { value: 'hap', label: 'HAP', sublabel: "Sheet 'CUOC'" },
  { value: 'newway', label: 'NEWWAY', sublabel: 'Best-effort (modal price)' },
]

const WORK_TYPE_OPTIONS = [
  { value: 'F20', label: 'F20 (hàng 20\')' },
  { value: 'F40', label: 'F40 (hàng 40\')' },
  { value: 'E20', label: 'E20 (vỏ 20\')' },
  { value: 'E40', label: 'E40 (vỏ 40\')' },
]

function fmtVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n)
}

export function ImportPricing() {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: clients = [] } = useClients()

  const [clientId, setClientId] = useState('')
  const [format, setFormat] = useState<PricingFormat | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [preview, setPreview] = useState<PricingPreviewResponse | null>(null)
  const [editedRows, setEditedRows] = useState<PricingPreviewRow[]>([])

  const clientOptions = useMemo(
    () => clients.map(c => ({
      value: String(c.id),
      label: c.name,
      sublabel: c.code ? `Mã: ${c.code}` : undefined,
    })),
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
      const result = await apiClient.previewCustomerPricing({
        file,
        format: format || undefined,
      })
      setPreview(result)
      setEditedRows(result.rows)
      if (result.rows.length === 0) {
        toast.error('Không có dòng nào', result.warnings[0] ?? 'Hãy kiểm tra định dạng tệp.')
      }
    } catch (err) {
      const detail = (err as { message?: string })?.message ?? 'Không phân tích được tệp.'
      toast.error('Lỗi phân tích', detail)
    } finally {
      setBusy(false)
    }
  }

  const updateRow = (idx: number, patch: Partial<PricingPreviewRow>) => {
    setEditedRows(prev =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    )
  }

  const removeRow = (idx: number) => {
    setEditedRows(prev => prev.filter((_, i) => i !== idx))
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
      const res = await apiClient.commitCustomerPricing({
        client_id: Number(clientId),
        rows: editedRows,
        update_existing_lines: updateExisting,
      })
      const summary = `+${res.pricings_created} bảng giá, +${res.lines_created} dòng giá` +
        (res.lines_updated ? `, cập nhật ${res.lines_updated}` : '') +
        (res.skipped_no_locations ? `, bỏ qua ${res.skipped_no_locations} vì thiếu địa điểm` : '')
      toast.success('Đã tạo bảng giá', summary)
      setPreview(null)
      setEditedRows([])
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      const detail = (err as { message?: string })?.message ?? 'Không tạo được bảng giá.'
      toast.error('Lỗi tạo bảng giá', detail)
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Tải tệp tariff khách hàng (PAN, HAP, NEWWAY) — hệ thống nhận dạng định dạng và đề xuất các dòng giá.
        </p>
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
            {committing ? 'Đang tạo...' : `Tạo bảng giá (${editedRows.length})`}
          </Button>
        </div>
      </div>

      {/* Pane 1 — file upload + client + format */}
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
            <label className="typo-form-label">Định dạng</label>
            <InlineSelect
              placeholder="Tự nhận diện"
              value={format}
              options={FORMAT_OPTIONS.map(o => ({ value: o.value, label: o.label, sublabel: o.sublabel }))}
              onChange={(v) => setFormat((v as PricingFormat | '') || '')}
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
            <span className="typo-caption">Định dạng {preview.format.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Stat label="Sheet" value={preview.sheet_name || '—'} />
            <Stat label="Số dòng" value={String(preview.stats.row_count)} ok={preview.stats.row_count > 0} />
            <Stat label="Tuyến đường" value={String(preview.stats.unique_routes)} />
            <Stat label="Định dạng tệp" value={preview.filename} />
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
        </div>
      )}

      {/* Pane 3 — editable rows */}
      {preview && editedRows.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="typo-h2">Các dòng giá ({editedRows.length})</h3>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
              />
              Ghi đè dòng giá cũ nếu đã tồn tại
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ color: 'var(--theme-text-secondary)' }}>
                <tr className="text-left">
                  <th className="py-2 px-2 font-medium">#</th>
                  <th className="py-2 px-2 font-medium">Điểm đi</th>
                  <th className="py-2 px-2 font-medium">Điểm đến</th>
                  <th className="py-2 px-2 font-medium">Loại</th>
                  <th className="py-2 px-2 font-medium">Đơn giá (VND)</th>
                  <th className="py-2 px-2 font-medium">SL</th>
                  <th className="py-2 px-2 font-medium">Lương TX</th>
                  <th className="py-2 px-2 font-medium">Phụ cấp</th>
                  <th className="py-2 px-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {editedRows.map((row, idx) => {
                  const pickupRes = preview.location_resolutions?.[row.pickup_location]
                  const dropoffRes = preview.location_resolutions?.[row.dropoff_location]
                  return (
                    <tr key={idx} className="border-t" style={{ borderColor: 'var(--theme-border-subtle)' }}>
                      <td className="py-1 px-2 typo-caption">{idx + 1}</td>
                      <td className="py-1 px-2">
                        <Input
                          value={row.pickup_location}
                          onChange={(e) => updateRow(idx, { pickup_location: e.target.value })}
                          className="h-8 text-sm"
                        />
                        {pickupRes && (
                          <LocationBadge res={pickupRes} />
                        )}
                      </td>
                      <td className="py-1 px-2">
                        <Input
                          value={row.dropoff_location}
                          onChange={(e) => updateRow(idx, { dropoff_location: e.target.value })}
                          className="h-8 text-sm"
                        />
                        {dropoffRes && (
                          <LocationBadge res={dropoffRes} />
                        )}
                      </td>
                      <td className="py-1 px-2">
                        <select
                          value={row.work_type}
                          onChange={(e) => updateRow(idx, { work_type: e.target.value })}
                          className="h-8 px-2 rounded border text-sm"
                          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)' }}
                        >
                          {WORK_TYPE_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1 px-2">
                        <Input
                          type="number"
                          value={row.unit_price}
                          onChange={(e) => updateRow(idx, { unit_price: Number(e.target.value) || 0 })}
                          className="h-8 text-sm w-32"
                        />
                        <p className="typo-caption">{fmtVnd(row.unit_price)}</p>
                      </td>
                      <td className="py-1 px-2">
                        <Input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, { quantity: Number(e.target.value) || 1 })}
                          className="h-8 text-sm w-16"
                          min={1}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <Input
                          type="number"
                          value={row.driver_salary}
                          onChange={(e) => updateRow(idx, { driver_salary: Number(e.target.value) || 0 })}
                          className="h-8 text-sm w-28"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <Input
                          type="number"
                          value={row.allowance}
                          onChange={(e) => updateRow(idx, { allowance: Number(e.target.value) || 0 })}
                          className="h-8 text-sm w-28"
                        />
                      </td>
                      <td className="py-1 px-2">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="p-1 rounded hover:bg-red-50"
                          aria-label="Xoá dòng"
                          title="Xoá dòng"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: 'var(--theme-status-error)' }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="typo-caption">{label}</p>
      <p
        className="text-sm font-medium truncate"
        title={value}
        style={{
          color: ok
            ? 'var(--theme-status-success)'
            : warn
              ? 'var(--theme-status-warning)'
              : 'var(--theme-text-primary)',
        }}
      >
        {value}
      </p>
    </div>
  )
}

function LocationBadge({ res }: { res: { match_kind: string; location_name: string | null; review_needed: boolean } }) {
  const label = res.match_kind === 'exact_name' || res.match_kind === 'exact_alias'
    ? '(có sẵn)'
    : res.match_kind === 'fuzzy_auto'
      ? '(gợi ý)'
      : res.match_kind === 'fuzzy_ambiguous'
        ? '(trùng lặp?)'
        : '(mới)'
  const color =
    res.match_kind === 'exact_name' || res.match_kind === 'exact_alias'
      ? 'var(--theme-status-success)'
      : res.match_kind === 'fuzzy_auto'
        ? 'var(--theme-status-info)'
        : res.match_kind === 'fuzzy_ambiguous'
          ? 'var(--theme-status-warning)'
          : 'var(--theme-text-muted)'
  return (
    <p className="typo-caption" style={{ color }}>
      {label} {res.location_name ?? ''}
    </p>
  )
}
