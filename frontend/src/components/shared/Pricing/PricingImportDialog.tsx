import { useState, useMemo } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button
} from '@/components/ui'
import {
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2,
  ArrowRight, ChevronRight, Loader2, Info
} from 'lucide-react'
import { usePreviewPricing, useCommitPricing } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { formatCurrencyShort } from '@/data/domain'
import type { Client } from '@/data/domain'
import type { PricingPreviewResponse, PricingPreviewRow, PricingFormat } from '@/services/api/imports.api'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'

interface PricingImportDialogProps {
  open: boolean
  onClose: () => void
  clients: Client[]
}

export function PricingImportDialog({ open, onClose, clients }: PricingImportDialogProps) {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>()
  const [format, setFormat] = useState<PricingFormat | undefined>()
  
  const { mutate: preview, isPending: previewing, data: previewData, reset: resetPreview } = usePreviewPricing()
  const { mutate: commit, isPending: committing } = useCommitPricing()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      resetPreview()
    }
  }

  const handlePreview = () => {
    if (!file) return
    preview({ file, format, clientId: selectedClientId })
  }

  const handleCommit = () => {
    if (!previewData || !selectedClientId) return
    commit({
      client_id: selectedClientId,
      rows: previewData.rows,
      update_existing_lines: true // Overwrite by default for tariff updates
    }, {
      onSuccess: (res) => {
        toast.success(
          'Đã nạp bảng giá', 
          `Đã tạo ${res.pricingsCreated} mức giá mới, cập nhật ${res.linesUpdated} mức giá cũ.`
        )
        onClose()
      },
      onError: (err: any) => {
        toast.error('Lỗi', err.message || 'Không thể nạp bảng giá')
      }
    })
  }

  const reset = () => {
    setFile(null)
    setFormat(undefined)
    resetPreview()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); if (!o) reset(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-bottom">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Nạp bảng giá từ Excel
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!previewData ? (
            <div className="space-y-4">
              {/* Step 1: File & Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">1. Chọn Khách hàng</label>
                  <InlineSelect
                    placeholder="-- Chọn khách hàng --"
                    value={selectedClientId ? String(selectedClientId) : ''}
                    options={[
                      { value: '', label: '-- Chọn khách hàng --' },
                      ...clients.map(c => ({ value: String(c.id), label: c.name })),
                    ]}
                    onChange={v => setSelectedClientId(v ? Number(v) : 0)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">2. Định dạng file (Tùy chọn)</label>
                  <InlineSelect
                    placeholder="Tự động nhận diện"
                    value={format ?? ''}
                    options={[
                      { value: '', label: 'Tự động nhận diện' },
                      { value: 'pan', label: 'PAN (Trucking HD)' },
                      { value: 'hap', label: 'HAP (Shipside)' },
                      { value: 'newway', label: 'NEWWAY (Hải chung)' },
                    ]}
                    onChange={v => setFormat((v as PricingFormat) || undefined)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">3. Tệp Excel</label>
                <div 
                  className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors hover:border-emerald-500 hover:bg-emerald-50/50"
                  onClick={() => document.getElementById('pricing-upload')?.click()}
                  style={{ cursor: 'pointer' }}
                >
                  <Upload className="h-8 w-8 text-slate-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium">{file ? file.name : 'Nhấp để chọn tệp hoặc kéo thả'}</p>
                    <p className="text-xs text-slate-400 mt-1">Hỗ trợ .xlsx, .xls</p>
                  </div>
                  <input 
                    id="pricing-upload"
                    type="file" 
                    className="hidden" 
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800 leading-relaxed">
                  <p className="font-bold mb-1">Lưu ý về dữ liệu:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Hệ thống sẽ chỉ lấy <strong>Đơn giá (Revenue)</strong> từ file Excel.</li>
                    <li>Lương lái xe và Phụ cấp sẽ mặc định bằng 0 (Kế toán tự nhập sau).</li>
                    <li>Nếu tuyến đường đã có giá, hệ thống sẽ hiển thị so sánh để xác nhận ghi đè.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview Stats */}
              <div className="flex items-center justify-between bg-slate-50 border rounded-lg px-4 py-3">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Số dòng</p>
                    <p className="text-lg font-bold">{previewData.stats.row_count}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Cung đường</p>
                    <p className="text-lg font-bold">{previewData.stats.unique_routes}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Định dạng</p>
                    <p className="text-sm font-bold mt-1 uppercase">{previewData.format}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={resetPreview}>Chọn tệp khác</Button>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-slate-600">Cung đường</th>
                      <th className="text-center px-4 py-2 font-semibold text-slate-600">Loại</th>
                      <th className="text-right px-4 py-2 font-semibold text-slate-600">Giá cũ</th>
                      <th className="px-2 py-2"></th>
                      <th className="text-right px-4 py-2 font-semibold text-slate-600">Giá mới</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.pickup_location} → {row.dropoff_location}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-bold border rounded px-1.5 py-0.5">{row.work_type}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                          {row.old_unit_price ? formatCurrencyShort(row.old_unit_price) : '—'}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <ChevronRight className="h-3 w-3 text-slate-300 mx-auto" />
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          <div className="flex flex-col items-end">
                            <span style={{ color: row.old_unit_price && row.old_unit_price !== row.unit_price ? 'var(--theme-status-warning)' : 'inherit' }}>
                              {formatCurrencyShort(row.unit_price)}
                            </span>
                            {row.old_unit_price && row.old_unit_price !== row.unit_price && (
                              <span className="text-[9px] font-normal text-amber-600 bg-amber-50 px-1 rounded">Thay đổi</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.rows.length > 50 && (
                  <div className="p-3 text-center bg-slate-50 text-xs text-slate-500 italic border-t">
                    Hiển thị 50 / {previewData.rows.length} dòng...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50/50">
          <Button variant="outline" onClick={onClose} disabled={previewing || committing}>Huỷ</Button>
          {!previewData ? (
            <Button 
              onClick={handlePreview} 
              disabled={!file || !selectedClientId || previewing}
              className="min-w-[120px]"
              style={{ background: 'var(--theme-brand-primary)', color: 'white' }}
            >
              {previewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
              {previewing ? 'Đang xử lý...' : 'Xem trước'}
            </Button>
          ) : (
            <Button 
              onClick={handleCommit} 
              disabled={committing}
              className="min-w-[140px]"
              style={{ background: 'var(--theme-brand-primary)', color: 'white' }}
            >
              {committing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {committing ? 'Đang nạp...' : `Xác nhận nạp ${previewData.rows.length} dòng`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
