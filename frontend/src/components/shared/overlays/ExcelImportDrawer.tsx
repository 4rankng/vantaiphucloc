import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import {
  FileSpreadsheet,
  X,
  Upload,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Plus,
  UserPlus,
  Building2,
  Truck,
  User,
  Bot,
  Sparkles,
} from 'lucide-react'
import { Drawer } from '@/components/shared/overlays/Drawer'
import { StepIndicator } from '@/components/shared/navigation/StepIndicator'
import { InlineSelect } from '@/components/shared/forms/InlineSelect'
import { Button } from '@/components/ui'
import {
  useClients,
  useCreateClient,
  useCommitCustomerExcel,
  useEnqueueCustomerExcelPreview,
  useCustomerExcelPreviewStatus,
  usePreviewVendorReconciliation,
  useCommitVendorReconciliation,
  usePreviewDriverReconciliation,
  useCommitDriverReconciliation,
  useVendors,
} from '@/hooks/use-queries'
import type { DuplicateGroup } from '@/services/api/deliveredTrips.api'
import type { PreviewResultDto, VendorImportResponse, DriverImportResponse, DriverCommitResponse } from '@/services/api/imports.api'
import { type Client } from '@/data/domain'

type ClientFormData = Omit<Client, 'id'>

const VN_TAX_RE = /^\d{10}(\d{3})?$/

const EMPTY_CLIENT_FORM: ClientFormData = {
  code: '',
  name: '',
  type: 'company',
  phone: '',
  taxCode: '',
  address: '',
  contactPerson: '',
  isActive: true,
  createdAt: undefined,
  updatedAt: undefined,
}

type ImportStep = 'upload' | 'preview' | 'done'

const IMPORT_STEPS = [
  { label: 'Nhập file' },
  { label: 'Soát duyệt' },
  { label: 'Lưu dữ liệu' },
]

function stepIndex(step: ImportStep): number {
  return step === 'upload' ? 0 : step === 'preview' ? 1 : 2
}

const NUMERIC_COLS = new Set(['Cước'])

interface PreviewRow {
  [key: string]: unknown
}

export function ExcelImportDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [clientId, setClientId] = useState('')
  const [importType, setImportType] = useState<'client' | 'vendor' | 'driver'>('client')
  const [vendorId, setVendorId] = useState('')
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [previewColumns, setPreviewColumns] = useState<string[]>([])
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [creatingClient, setCreatingClient] = useState(false)
  const [clientForm, setClientForm] = useState<ClientFormData>(EMPTY_CLIENT_FORM)
  const [clientFormErrors, setClientFormErrors] = useState<{ name?: string; phone?: string; taxCode?: string }>({})
  const [previewResult, setPreviewResult] = useState<PreviewResultDto | null>(null)
  const [reconResult, setReconResult] = useState<VendorImportResponse | DriverImportResponse | null>(null)
  const [driverCommitResult, setDriverCommitResult] = useState<DriverCommitResponse | null>(null)
  const [resolvedFreightKinds, setResolvedFreightKinds] = useState<Record<number, 'E' | 'F'>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const { data: clients = [] } = useClients()
  const { data: vendors = [] } = useVendors()
  const createClient = useCreateClient()
  const commitClientExcel = useCommitCustomerExcel()
  const enqueueClientExcel = useEnqueueCustomerExcelPreview()
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const previewDriverRecon = usePreviewDriverReconciliation()
  const commitDriverRecon = useCommitDriverReconciliation()
  const previewVendorRecon = usePreviewVendorReconciliation()
  const commitVendorRecon = useCommitVendorReconciliation()

  const excelClientName = useMemo<string | null>(() => {
    if (!previewData.length) return null
    const names = [...new Set(
      previewData.map(r => String(r['Khách hàng / chủ hàng'] ?? r['Chủ hàng'] ?? '').trim()).filter(Boolean),
    )]
    return names.length === 1 ? names[0] : null
  }, [previewData])

  const applyPreviewResult = useCallback((data: PreviewResultDto) => {
    setPreviewResult(data)
    setResolvedFreightKinds({})  // Clear resolved kinds when new preview is loaded
    const cols = ['Ngày đi', 'Chủ hàng', 'Số Cont', 'Loại Cont', 'Số xe chạy', 'Điểm đi', 'Điểm đến', 'Cước']
    const rows = (data.accepted ?? []).map(r => ({
      'Ngày đi': r.values.trip_date,
      'Chủ hàng': r.values.consignee,
      'Số Cont': r.values.container_no,
      'Loại Cont': r.values.cont_type ?? `${r.values.freight_kind ?? ''}${r.values.container_size ?? ''}`,
      'Số xe chạy': r.values.vehicle_plate,
      'Điểm đi': r.values.pickup_location,
      'Điểm đến': r.values.dropoff_location,
      'Cước': r.values.freight_charge,
    }))
    const containerKey = Object.keys((data.rejected?.[0]?.raw ?? {}) as Record<string, unknown>).find(k => /container/i.test(k))
    const dups = (data.rejected ?? [])
      .filter(r => r.reasons?.includes('duplicate_in_file') || r.reasons?.some(reason => reason.includes('duplicate')))
      .map((r) => {
        const cNo = containerKey ? String((r.raw as Record<string, unknown>)?.[containerKey] ?? '') : ''
        return {
          type: 'exact' as const,
          rowIndices: [r.source_row_index],
          containers: [cNo],
          message: `Dòng ${r.source_row_index + 1}: Trùng container ${cNo}`
        }
      })
    const warns = data.warnings ?? []

    setPreviewColumns(cols)
    setPreviewData(rows)
    setDuplicateGroups(dups)
    setPreviewWarnings(warns)

    if (!clientId) {
      const uniqueConsignees = [
        ...new Set((data.accepted ?? []).map((r) => String(r.values.consignee ?? '').trim()).filter(Boolean)),
      ]
      if (uniqueConsignees.length >= 1) {
        const norm = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').trim()
        const q = norm(uniqueConsignees[0])
        const match = clients.find(
          (c) =>
            (c.code && norm(c.code) === q) ||
            norm(c.name) === q ||
            norm(c.name).includes(q) ||
            q.includes(norm(c.name)),
        )
        if (match) setClientId(String(match.id))
      }
    }
    setStep('preview')
  }, [clientId, clients])

  const unresolvedCount = useMemo(() => {
    if (!previewResult) return 0
    return (previewResult.accepted ?? []).filter((_, idx) => {
      return (previewResult.accepted?.[idx]?.values?.freight_kind_unknown ?? false) && !resolvedFreightKinds[idx]
    }).length
  }, [previewResult, resolvedFreightKinds])

  const resolveFreightKind = useCallback((rowIndex: number, kind: 'E' | 'F') => {
    setResolvedFreightKinds(prev => ({
      ...prev,
      [rowIndex]: kind
    }))
    // Update the previewData to reflect the resolution
    if (previewResult?.accepted?.[rowIndex]) {
      const row = previewResult.accepted[rowIndex]
      const size = row.values.container_size ?? ''
      row.values.freight_kind = kind
      row.values.cont_type = `${kind}${size}`
      setPreviewData(prev => {
        const newData = [...prev]
        newData[rowIndex] = {
          ...newData[rowIndex],
          'Loại Cont': `${kind}${size}`
        }
        return newData
      })
    }
  }, [previewResult])

  // Polling hook fires the callback once per status transition to a
  // terminal state. The hook handles its own ref-keeping internally so
  // `applyPreviewResult` doesn't need to be in a dep array.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const jobStatus = useCustomerExcelPreviewStatus(
    activeJobId,
    (status, result) => {
      if (status === 'complete' && result) {
        applyPreviewResult(result)
        setActiveJobId(null)
      } else if (status === 'failed' || status === 'not_found') {
        setError(
          status === 'not_found'
            ? 'Job đã hết hạn hoặc không tồn tại. Vui lòng tải lại file.'
            : 'Phân tích file thất bại. Vui lòng thử lại.',
        )
        setActiveJobId(null)
      }
    },
  )

  // When the async job finishes, the polling hook's `onResult` callback
  // (set up just above) handles the state transitions. No effect needed
  // here.

  const startPreview = useCallback((f: File) => {
    setError(null)
    if (importType === 'client') {
      enqueueClientExcel.mutate(
        { file: f },
        {
          onSuccess: (res) => {
            setActiveJobId(res.job_id)
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
        }
      )
    } else if (importType === 'driver') {
      previewDriverRecon.mutate(
        { file: f },
        {
          onSuccess: (data) => {
            setPreviewResult(data)
            const cols = ['Ngày đi', 'Chủ hàng', 'Số Cont', 'Loại Cont', 'Số xe chạy', 'Điểm đi', 'Điểm đến', 'Cước']
            const rows = (data.accepted ?? []).map(r => ({
              'Ngày đi': r.values.trip_date,
              'Chủ hàng': r.values.consignee,
              'Số Cont': r.values.container_no,
              'Loại Cont': r.values.cont_type ?? `${r.values.freight_kind ?? ''}${r.values.container_size ?? ''}`,
              'Số xe chạy': r.values.vehicle_plate,
              'Điểm đi': r.values.pickup_location,
              'Điểm đến': r.values.dropoff_location,
              'Cước': r.values.freight_charge,
            }))
            const dups = (data.rejected ?? [])
              .filter(r => r.reasons?.includes('duplicate_in_file') || r.reasons?.some(reason => reason.includes('duplicate')))
              .map((r) => ({
                type: 'exact' as const,
                rowIndices: [r.source_row_index],
                containers: [String((r.raw as Record<string, unknown>)?.container_no ?? '')],
                message: `Dòng ${r.source_row_index + 1}: Trùng dòng`
              }))
            const warns = data.warnings ?? []

            setPreviewColumns(cols)
            setPreviewData(rows)
            setDuplicateGroups(dups)
            setPreviewWarnings(warns)
            setStep('preview')
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
        }
      )
    } else if (importType === 'vendor') {
      if (!vendorId) {
        setError('Vui lòng chọn nhà thầu trước khi phân tích file.')
        return
      }
      previewVendorRecon.mutate(
        { file: f, vendorId: Number(vendorId) },
        {
          onSuccess: (data) => {
            setPreviewResult(data)
            const cols = ['Ngày đi', 'Chủ hàng', 'Số Cont', 'Loại Cont', 'Số xe chạy', 'Điểm đi', 'Điểm đến', 'Cước']
            const rows = (data.accepted ?? []).map(r => ({
              'Ngày đi': r.values.trip_date,
              'Chủ hàng': r.values.consignee,
              'Số Cont': r.values.container_no,
              'Loại Cont': r.values.cont_type ?? `${r.values.freight_kind ?? ''}${r.values.container_size ?? ''}`,
              'Số xe chạy': r.values.vehicle_plate,
              'Điểm đi': r.values.pickup_location,
              'Điểm đến': r.values.dropoff_location,
              'Cước': r.values.freight_charge,
            }))
            const dups = (data.rejected ?? [])
              .filter(r => r.reasons?.includes('duplicate_in_file') || r.reasons?.some(reason => reason.includes('duplicate')))
              .map((r) => ({
                type: 'exact' as const,
                rowIndices: [r.source_row_index],
                containers: [String((r.raw as Record<string, unknown>)?.container_no ?? '')],
                message: `Dòng ${r.source_row_index + 1}: Trùng dòng`
              }))
            const warns = data.warnings ?? []

            setPreviewColumns(cols)
            setPreviewData(rows)
            setDuplicateGroups(dups)
            setPreviewWarnings(warns)
            setStep('preview')
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
        }
      )
    }
  }, [importType, previewDriverRecon, previewVendorRecon, vendorId, enqueueClientExcel])

  const handleFileSelect = useCallback((f: File | null) => {
    if (!f) return
    setError(null)
    // For vendor imports, the vendor must be selected first — otherwise the
    // drop zone would disappear (file chip shown) but preview can't start,
    // leaving the user stuck with no way to re-try without removing the chip.
    if (importType === 'vendor' && !vendorId) {
      setError('Vui lòng chọn nhà thầu trước khi chọn file.')
      return
    }
    setFile(f)
    startPreview(f)
  }, [startPreview, importType, vendorId])

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
    if (!file) return
    setError(null)
    if (importType === 'client') {
      if (!clientId) {
        setError('Vui lòng chọn chủ hàng để lưu.')
        return
      }
      commitClientExcel.mutate(
        {
          client_id: Number(clientId),
          rows: (previewResult?.accepted ?? []).map((r, idx) => ({
            ...r.values,
            // If the row had an unknown freight kind, it should have been resolved
            freight_kind_unknown: r.values.freight_kind_unknown && !resolvedFreightKinds[idx],
          }))
        },
        {
          onSuccess: () => setStep('done'),
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu'),
        }
      )
    } else if (importType === 'vendor') {
      commitVendorRecon.mutate(
        { vendorId: Number(vendorId), rows: (previewResult?.accepted ?? []).map(r => r.values as Record<string, unknown>) },
        {
          onSuccess: (data) => {
            setReconResult(data)
            setStep('done')
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu'),
        }
      )
    } else if (importType === 'driver') {
      commitDriverRecon.mutate(
        { rows: (previewResult?.accepted ?? []).map(r => r.values as Record<string, unknown>) },
        {
          onSuccess: (data) => {
            setDriverCommitResult(data)
            setStep('done')
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu'),
        }
      )
    }
  }

  function handleReset() {
    setStep('upload')
    setFile(null)
    setClientId('')
    setVendorId('')
    setPreviewData([])
    setPreviewColumns([])
    setDuplicateGroups([])
    setPreviewWarnings([])
    setPreviewResult(null)
    setReconResult(null)
    setDriverCommitResult(null)
    setError(null)
    setCreatingClient(false)
    setActiveJobId(null)
    setClientForm(EMPTY_CLIENT_FORM)
    setClientFormErrors({})
    if (fileRef.current) fileRef.current.value = ''
  }

  const updateClientField = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => {
    setClientForm(prev => ({ ...prev, [key]: value }))
    if (key === 'name' || key === 'phone' || key === 'taxCode') {
      setClientFormErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  function openCreateClient() {
    setClientForm({
      ...EMPTY_CLIENT_FORM,
      name: excelClientName ?? '',
    })
    setClientFormErrors({})
    setCreatingClient(true)
  }

  function cancelCreateClient() {
    setCreatingClient(false)
    setClientForm(EMPTY_CLIENT_FORM)
    setClientFormErrors({})
  }

  async function handleSaveNewClient() {
    const errs: typeof clientFormErrors = {}
    if (!clientForm.name.trim()) errs.name = 'Vui lòng nhập tên'
    if (clientForm.taxCode && !VN_TAX_RE.test(clientForm.taxCode)) {
      errs.taxCode = 'MST phải 10 hoặc 13 chữ số'
    }
    if (Object.keys(errs).length > 0) {
      setClientFormErrors(errs)
      return
    }
    try {
      const payload = {
        ...clientForm,
        name: clientForm.name.trim(),
      }
      const res = await createClient.mutateAsync(payload)
      if (res) {
        setClientId(String(res.id))
        setCreatingClient(false)
        setClientForm(EMPTY_CLIENT_FORM)
        setClientFormErrors({})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo khách hàng')
    }
  }

  // Auto-open create mode when no match is found, with detected name pre-filled.
  // Stays closed if user already picked a client or if there's no detected name.
  useEffect(() => {
    if (step === 'preview' && !clientId && excelClientName && !creatingClient) {
      // Don't auto-open — let user choose. Just pre-fill if they open.

      setClientForm(prev => prev.name ? prev : { ...EMPTY_CLIENT_FORM, name: excelClientName })
    }
  }, [step, clientId, excelClientName, creatingClient])

  // When client is selected, fill "Chủ hàng" column in all preview rows
  useEffect(() => {
    if (step !== 'preview' || !clientId || !previewData.length) return
    const clientName = clients.find(c => String(c.id) === clientId)?.name
    if (!clientName) return
    setPreviewData(prev => prev.map(row => ({ ...row, 'Chủ hàng': clientName })))
  }, [step, clientId, clients])

  const previewCols = previewColumns.length > 0 ? previewColumns : []

  const isProcessing = enqueueClientExcel.isPending || !!activeJobId || previewDriverRecon.isPending || previewVendorRecon.isPending

  const footer =
    step === 'upload' ? (
      <>
        <Button variant="outline" size="sm" onClick={onClose}>
          Huỷ
        </Button>
        {isProcessing && (
          <div className="flex items-center gap-2" style={{ color: 'var(--ink-2)', fontSize: 13 }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            {activeJobId ? 'AI đang phân tích file...' : 'Đang tải file lên...'}
          </div>
        )}
        {/* Hidden button since we auto-parse now, but kept for logic structure */}
        <div className="hidden">
          <Button 
            onClick={() => {
              if (file) startPreview(file)
            }} 
            size="sm" 
            disabled={!file || isProcessing}
          >
            {isProcessing ? 'Đang phân tích...' : 'Phân tích file'}
          </Button>
        </div>
      </>
    ) : step === 'preview' ? (
      <>
        {importType === 'client' && (
          clientId ? (
            <button
              type="button"
              onClick={() => setClientId('')}
              className="group text-[12px] font-medium pl-2.5 pr-1.5 py-1 rounded-full mr-auto flex items-center gap-1 transition-colors cursor-pointer"
              style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
              title="Nhấn để chọn lại chủ hàng"
            >
              <span>{clients.find((c) => String(c.id) === clientId)?.name ?? 'Chủ hàng'}</span>
              <span
                className="inline-flex items-center justify-center rounded-full ml-0.5 transition-colors"
                style={{ width: 18, height: 18, fontSize: 10 }}
              >
                <X className="h-3 w-3 opacity-50 group-hover:opacity-100" style={{ color: 'var(--danger)' }} />
              </span>
            </button>
          ) : (
            <InlineSelect
              placeholder="Chọn chủ hàng"
              value={clientId}
              options={clients.map((c) => ({ value: String(c.id), label: c.name }))}
              onChange={setClientId}
              className="mr-auto"
              style={{ minWidth: 180, borderColor: 'var(--warning)' }}
            />
          )
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setStep('upload')
            setPreviewData([])
            setPreviewColumns([])
            setActiveJobId(null)
          }}
        >
          Quay lại
        </Button>
        <Button size="sm" onClick={handleImport}
          disabled={importType === 'client' ? (commitClientExcel.isPending || !clientId || unresolvedCount > 0) : (commitDriverRecon.isPending || commitVendorRecon.isPending || unresolvedCount > 0)}
        >
          {commitClientExcel.isPending || commitDriverRecon.isPending || commitVendorRecon.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {commitClientExcel.isPending || commitDriverRecon.isPending || commitVendorRecon.isPending ? 'Đang lưu...' : 'Lưu dữ liệu'}
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
          {/* When Processing, hide the forms and show a Dramatic AI Parsing Screen */}
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <style>{`
                @keyframes bot-float {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-10px); }
                }
                @keyframes radar-scan {
                  0% { transform: scale(0.8); opacity: 0.8; }
                  100% { transform: scale(2); opacity: 0; }
                }
                @keyframes pulse-glow {
                  0%, 100% { opacity: 0.6; filter: blur(20px); }
                  50% { opacity: 1; filter: blur(30px); }
                }
              `}</style>
              
              <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                {/* Glowing aura */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{ 
                    background: 'var(--accent)', 
                    animation: 'pulse-glow 2s ease-in-out infinite' 
                  }}
                />
                {/* Radar rings */}
                <div 
                  className="absolute inset-0 rounded-full border-2"
                  style={{ 
                    borderColor: 'var(--accent)', 
                    animation: 'radar-scan 1.5s cubic-bezier(0.0, 0.2, 0.8, 1) infinite' 
                  }}
                />
                <div 
                  className="absolute inset-0 rounded-full border-2"
                  style={{ 
                    borderColor: 'var(--accent)', 
                    animation: 'radar-scan 1.5s cubic-bezier(0.0, 0.2, 0.8, 1) infinite',
                    animationDelay: '0.75s'
                  }}
                />
                {/* Center AI Bot icon */}
                <div 
                  className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-xl"
                  style={{ 
                    background: 'var(--surface)', 
                    border: '4px solid var(--accent)',
                    animation: 'bot-float 3s ease-in-out infinite'
                  }}
                >
                  <Bot className="h-10 w-10" style={{ color: 'var(--accent)' }} />
                  <Sparkles 
                    className="absolute top-1 right-2 h-5 w-5 animate-pulse" 
                    style={{ color: '#FCD34D' }} 
                  />
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-3 tracking-tight" style={{ color: 'var(--ink)' }}>
                Hệ thống AI đang đọc và trích xuất dữ liệu
              </h3>
              <p className="text-sm max-w-md text-center" style={{ color: 'var(--ink-3)' }}>
                Antigravity đang phân tích hàng ngàn dòng dữ liệu từ file <strong style={{ color: 'var(--ink)' }}>{file?.name}</strong>. Quá trình này được tối ưu hoá cực kỳ nhanh và chuẩn xác.
              </p>
              
              <div className="mt-8 flex items-center gap-3 px-5 py-2.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Đang quét cấu trúc cột...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Type selector */}
              <div className="grid grid-cols-3 gap-3" style={{ maxWidth: 660 }}>
                {([
                  { type: 'client', icon: Building2, label: 'Chủ hàng', hint: 'Tạo đơn đặt từ file Excel khách hàng' },
                  { type: 'vendor', icon: Truck,     label: 'Nhà xe',    hint: 'Đối soát chuyến đi từ file nhà thầu' },
                  { type: 'driver', icon: User,      label: 'Lái xe nội bộ', hint: 'Đối soát chuyến đi từ file lái xe' },
                ] as const).map(({ type, icon: Icon, label, hint }) => {
                  const active = importType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setImportType(type); setFile(null); setClientId(''); setVendorId(''); setError(null) }}
                      className="text-left px-4 py-3.5 rounded-xl transition-all"
                      style={{
                        background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
                        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                        outline: 'none',
                      }}
                    >
                      <div
                        className="grid place-items-center mb-2.5"
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: active ? 'var(--accent)' : 'var(--surface-3)',
                           color: active ? 'var(--theme-text-on-brand)' : 'var(--ink-3)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <p className="m-0 text-[13.5px] font-semibold" style={{ color: active ? 'var(--accent)' : 'var(--ink)' }}>
                        {label}
                      </p>
                      <p className="m-0 mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--ink-3)' }}>
                        {hint}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Vendor selector if Vendor reconciliation is picked */}
              {importType === 'vendor' && (
                <div className="space-y-1.5" style={{ maxWidth: 400 }}>
                  <label className="nepo-field-label">
                    Nhà xe / Nhà thầu <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <InlineSelect
                    placeholder="Chọn nhà thầu..."
                    value={vendorId}
                    options={vendors.map(v => ({ value: String(v.id), label: v.name }))}
                    onChange={setVendorId}
                  />
                </div>
              )}

              {/* File area */}
              <div>
                <label className="nepo-field-label">File Excel</label>

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
                    maxWidth: 500
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Preview step ── */}
      {step === 'preview' && (
        <div className="space-y-4 preview-step-enter">
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

          {/* Client resolution card — only for client import type */}
          {importType === 'client' && !clientId && excelClientName && (
            <div
              className="overflow-hidden"
              style={{
                background: 'var(--warning-soft)',
                borderRadius: 'var(--r-md, var(--r-sm))',
                border: '1px solid var(--warning)',
              }}
            >
              {/* Header row — single line, no wrap */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ minHeight: 52 }}>
                <div
                  className="grid place-items-center shrink-0"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'color-mix(in srgb, var(--warning) 18%, transparent)',
                    color: 'var(--warning)',
                  }}
                >
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="m-0 text-[13.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ color: 'var(--ink)' }}
                  >
                    Xác nhận chủ hàng{' '}
                    <span style={{ color: 'var(--warning)' }}>"{excelClientName}"</span>
                  </p>
                  <p
                    className="m-0 mt-0.5 text-[12px]"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    {creatingClient
                      ? 'Nhập thông tin chủ hàng mới để lưu vào danh bạ.'
                      : 'Chọn chủ hàng có sẵn hoặc tạo mới với đầy đủ thông tin.'}
                  </p>
                </div>
                {creatingClient && (
                  <button
                    type="button"
                    onClick={cancelCreateClient}
                    className="grid place-items-center rounded-md shrink-0"
                    style={{ width: 28, height: 28, color: 'var(--ink-3)' }}
                    aria-label="Huỷ tạo mới"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Body — either select row OR inline form */}
              {!creatingClient ? (
                <div
                  className="px-4 pb-4 flex items-stretch gap-2"
                  style={{ borderTop: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)', paddingTop: 12 }}
                >
                  <div className="flex-1 min-w-0" style={{ maxWidth: 360 }}>
                    <InlineSelect
                      placeholder="Chọn chủ hàng có sẵn..."
                      value={clientId}
                      options={clients.map(c => ({ value: String(c.id), label: c.name }))}
                      onChange={setClientId}
                      onCreateNew={openCreateClient}
                      createNewLabel={`Tạo mới "${excelClientName}"`}
                    />
                  </div>
                  <span
                    className="self-center text-[12px] font-medium px-1"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    hoặc
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openCreateClient}
                    style={{
                      color: 'var(--warning)',
                      borderColor: 'var(--warning)',
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Thêm chủ hàng mới
                  </Button>
                </div>
              ) : (
                <div
                  className="px-4 pb-4 pt-3"
                  style={{
                    background: 'var(--surface)',
                    borderTop: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
                  }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    {/* Tên + Mã KH */}
                    <div className="col-span-2 grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="nepo-field-label">
                          Tên chủ hàng <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <input
                          className="nepo-input"
                          value={clientForm.name}
                          onChange={e => updateClientField('name', e.target.value)}
                          placeholder="Ví dụ: Công ty TNHH PAN"
                          autoFocus
                        />
                        {clientFormErrors.name && (
                          <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--danger)' }}>
                            {clientFormErrors.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="nepo-field-label">Mã KH</label>
                        <input
                          className="nepo-input"
                          value={clientForm.code ?? ''}
                          onChange={e => updateClientField('code', e.target.value)}
                          placeholder="VD: PAN"
                        />
                      </div>
                    </div>

                    {/* Loại */}
                    <div className="col-span-2">
                      <label className="nepo-field-label">Loại chủ hàng</label>
                      <div
                        className="grid grid-cols-2 gap-1 p-1"
                        style={{
                          background: 'var(--surface-2)',
                          borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        {(['company', 'individual'] as const).map(t => {
                          const active = clientForm.type === t
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => updateClientField('type', t)}
                              className="py-2 text-[13px] font-medium transition-colors rounded"
                              style={{
                                background: active ? 'var(--surface)' : 'transparent',
                                color: active ? 'var(--ink)' : 'var(--ink-2)',
                                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                              }}
                            >
                              {t === 'company' ? 'Công ty' : 'Cá nhân'}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Điện thoại */}
                    <div>
                      <label className="nepo-field-label">Điện thoại</label>
                      <input
                        className="nepo-input"
                        value={clientForm.phone}
                        onChange={e => updateClientField('phone', e.target.value)}
                        placeholder="0912345678"
                        inputMode="tel"
                      />
                      {clientFormErrors.phone && (
                        <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--danger)' }}>
                          {clientFormErrors.phone}
                        </p>
                      )}
                    </div>

                    {/* Mã số thuế */}
                    <div>
                      <label className="nepo-field-label">Mã số thuế</label>
                      <input
                        className="nepo-input"
                        value={clientForm.taxCode ?? ''}
                        onChange={e => updateClientField('taxCode', e.target.value)}
                        placeholder="0123456789"
                        inputMode="numeric"
                      />
                      {clientFormErrors.taxCode && (
                        <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--danger)' }}>
                          {clientFormErrors.taxCode}
                        </p>
                      )}
                    </div>

                    {/* Địa chỉ */}
                    <div className="col-span-2">
                      <label className="nepo-field-label">Địa chỉ</label>
                      <input
                        className="nepo-input"
                        value={clientForm.address ?? ''}
                        onChange={e => updateClientField('address', e.target.value)}
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                      />
                    </div>

                    {/* Người liên hệ */}
                    <div className="col-span-2">
                      <label className="nepo-field-label">Người liên hệ</label>
                      <input
                        className="nepo-input"
                        value={clientForm.contactPerson ?? ''}
                        onChange={e => updateClientField('contactPerson', e.target.value)}
                        placeholder="Họ tên người liên hệ"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={cancelCreateClient} disabled={createClient.isPending}>
                      Huỷ
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNewClient}
                      disabled={!clientForm.name.trim() || createClient.isPending}
                    >
                      {createClient.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {createClient.isPending ? 'Đang lưu...' : 'Lưu chủ hàng'}
                    </Button>
                  </div>
                </div>
              )}
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
          </div>

          {/* Preview table */}
          {previewData.length === 0 ? (
            <p className="text-[13px] text-center py-8" style={{ color: 'var(--ink-3)' }}>
              Không có dữ liệu
            </p>
          ) : (
            <>
              {unresolvedCount > 0 && (
                <div
                  className="flex items-start gap-2.5 px-3.5 py-3 mb-3"
                  style={{
                    background: 'var(--warning-soft)',
                    border: '1px solid var(--warning)',
                    borderRadius: 'var(--r-sm)',
                  }}
                >
                  <AlertTriangle
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--warning)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div style={{ color: 'var(--warning)' }} className="text-[13px]">
                      <strong>{unresolvedCount}</strong> dòng cần xác định loại container (E/F) trước khi lưu. Vui lòng chọn E hoặc F trong cột "Loại Cont".
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...resolvedFreightKinds }
                          ;(previewResult?.accepted ?? []).forEach((r, idx) => {
                            if (r.values?.freight_kind_unknown && !resolvedFreightKinds[idx]) {
                              updated[idx] = 'E'
                              const size = r.values.container_size ?? ''
                              r.values.freight_kind = 'E'
                              r.values.cont_type = `E${size}`
                              setPreviewData(prev => {
                                const d = [...prev]
                                d[idx] = { ...d[idx], 'Loại Cont': `E${size}` }
                                return d
                              })
                            }
                          })
                          setResolvedFreightKinds(updated)
                        }}
                        className="px-2.5 py-1 rounded text-[12px] font-semibold transition-colors"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--warning)',
                          color: 'var(--warning)',
                        }}
                      >
                        Chọn tất cả E
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...resolvedFreightKinds }
                          ;(previewResult?.accepted ?? []).forEach((r, idx) => {
                            if (r.values?.freight_kind_unknown && !resolvedFreightKinds[idx]) {
                              updated[idx] = 'F'
                              const size = r.values.container_size ?? ''
                              r.values.freight_kind = 'F'
                              r.values.cont_type = `F${size}`
                              setPreviewData(prev => {
                                const d = [...prev]
                                d[idx] = { ...d[idx], 'Loại Cont': `F${size}` }
                                return d
                              })
                            }
                          })
                          setResolvedFreightKinds(updated)
                        }}
                        className="px-2.5 py-1 rounded text-[12px] font-semibold transition-colors"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--warning)',
                          color: 'var(--warning)',
                        }}
                      >
                        Chọn tất cả F
                      </button>
                    </div>
                  </div>
                </div>
              )}
            <div
              className="preview-table-wrap"
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
              <table className="nepo-table w-full" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    {previewCols.map((key) => (
                      <th key={key} className={`text-left ${NUMERIC_COLS.has(key) ? 'text-right' : ''}`}
                        style={key === 'Loại Cont' ? { width: 60 } : key === 'Số Cont' ? { width: 100 } : undefined}
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => {
                    const realIndex = i
                    return (
                      <tr key={realIndex}>
                        <td>
                          <span className="tabular-nums text-[12px]" style={{ color: 'var(--ink-3)' }}>
                            {realIndex + 1}
                          </span>
                        </td>
                        {previewCols.map((key) => {
                          const val = row[key]
                          const isNumeric = NUMERIC_COLS.has(key)
                          const isFreightKindUnknown = previewResult?.accepted?.[realIndex]?.values?.freight_kind_unknown ?? false
                          const isFreightKindCol = key === 'Loại Cont'
                          const showFreightPicker = isFreightKindCol && isFreightKindUnknown
                          const resolved = resolvedFreightKinds[realIndex]

                          return (
                            <td key={key} className={isNumeric ? 'text-right' : ''}>
                              {showFreightPicker ? (
                                <InlineSelect
                                  placeholder="Chọn E/F"
                                  value={resolved ?? ''}
                                  options={[
                                    { value: 'E', label: `E${previewResult?.accepted?.[realIndex]?.values?.container_size ?? ''}` },
                                    { value: 'F', label: `F${previewResult?.accepted?.[realIndex]?.values?.container_size ?? ''}` },
                                  ]}
                                  onChange={(v) => v && resolveFreightKind(realIndex, v as 'E' | 'F')}
                                  style={{
                                    minWidth: 70,
                                    borderColor: resolved ? 'var(--success)' : 'var(--warning)',
                                    background: resolved ? 'var(--success-soft)' : 'var(--warning-soft)',
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    color: val == null ? 'var(--ink-3)' : 'var(--ink-2)',
                                    fontSize: 12.5,
                                  }}
                                >
                                  {val != null
                                    ? isNumeric && typeof val === 'number'
                                      ? val.toLocaleString('vi-VN')
                                      : String(val)
                                    : '—'}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
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
            Dữ liệu từ tệp{' '}
            <span className="font-semibold font-mono" style={{ color: 'var(--ink)' }}>
              {file?.name}
            </span>{' '}
            đã được xử lý hoàn tất.
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            {importType === 'client' ? (
              <>
                <div className="p-3 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--success)' }}>
                    {commitClientExcel.data?.created ?? 0}
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Chuyến đã tạo</p>
                </div>
                <div className="p-3 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--ink)' }}>
                    {commitClientExcel.data?.locations_created ?? 0}
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Địa điểm mới</p>
                </div>
              </>
            ) : importType === 'driver' ? (
              <>
                <div className="p-3 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--success)' }}>
                    {driverCommitResult?.created ?? 0}
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Chuyến nội bộ tạo mới</p>
                </div>
                <div className="p-3 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--accent)' }}>
                    {driverCommitResult?.matched ?? 0}
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Chuyến tự động so khớp</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--success)' }}>
                    {reconResult?.created ?? 0}
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Chuyến thầu tạo mới</p>
                </div>
                <div className="p-3 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color: 'var(--accent)' }}>
                    {reconResult?.matched ?? 0}
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>Chuyến tự động so khớp</p>
                </div>
                <div className="col-span-2 p-2.5 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                  <p className="text-[14px] font-semibold m-0" style={{ color: 'var(--ink)' }}>
                    Tổng số dòng xử lý: {(previewResult?.accepted?.length ?? 0) + (previewResult?.rejected?.length ?? 0)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Errors list if any */}
          {((importType === 'client' ? commitClientExcel.data?.errors : importType === 'driver' ? driverCommitResult?.errors : reconResult?.errors) ?? []).length > 0 && (
            <div className="w-full text-left mt-5 space-y-1.5">
              <h4 className="text-[12.5px] font-bold m-0 text-red-600" style={{ color: 'var(--danger)' }}>
                Một số dòng gặp lỗi khi xử lý ({importType === 'client' ? commitClientExcel.data?.errors?.length : importType === 'driver' ? driverCommitResult?.errors?.length : reconResult?.errors?.length}):
              </h4>
              <div
                className="p-3 rounded border border-solid max-h-40 overflow-y-auto"
                style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', fontSize: 11.5 }}
              >
                {((importType === 'client' ? commitClientExcel.data?.errors : importType === 'driver' ? driverCommitResult?.errors : reconResult?.errors) ?? []).map((err: string, idx: number) => (
                  <p key={idx} className="m-0 mt-1 font-mono text-red-500" style={{ color: 'var(--danger)' }}>
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
