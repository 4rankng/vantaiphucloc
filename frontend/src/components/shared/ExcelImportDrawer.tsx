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
} from 'lucide-react'
import { Drawer } from '@/components/shared/Drawer'
import { StepIndicator } from '@/components/shared/StepIndicator'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { Button } from '@/components/ui'
import { useClients, useBulkImportAndMatch, useAIParsePreview, useCreateClient } from '@/hooks/use-queries'
import type { DuplicateGroup } from '@/services/api/deliveredTrips.api'
import type { Client } from '@/data/domain'

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
  const [creatingClient, setCreatingClient] = useState(false)
  const [clientForm, setClientForm] = useState<ClientFormData>(EMPTY_CLIENT_FORM)
  const [clientFormErrors, setClientFormErrors] = useState<{ name?: string; phone?: string; taxCode?: string }>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const { data: clients = [] } = useClients()
  const createClient = useCreateClient()
  const bulkImport = useBulkImportAndMatch()
  const aiPreview = useAIParsePreview()

  const excelClientName = useMemo<string | null>(() => {
    if (!previewData.length) return null
    const names = [...new Set(
      previewData.map(r => String(r['Chủ hàng'] ?? '').trim()).filter(Boolean),
    )]
    return names.length === 1 ? names[0] : null
  }, [previewData])

  const startPreview = useCallback((f: File) => {
    setError(null)
    aiPreview.mutate(
      { file: f },
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
            if (uniqueClients.length >= 1) {
              const norm = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').trim()
              const q = norm(uniqueClients[0])
              const match = clients.find(
                (c) =>
                  // 1. Exact code match (e.g. Excel "PAN" → client code "PAN")
                  (c.code && norm(c.code) === q) ||
                  // 2. Exact full name match
                  norm(c.name) === q ||
                  // 3. Name contains the search value
                  norm(c.name).includes(q) ||
                  // 4. Search value contains the full name (client name is an acronym in Excel)
                  q.includes(norm(c.name)),
              )
              if (match) setClientId(String(match.id))
            }
          }
          setStep('preview')
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
      },
    )
  }, [aiPreview, clientId, clients])

  const handleFileSelect = useCallback((f: File | null) => {
    if (!f) return
    setFile(f)
    setError(null)
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
    setCreatingClient(false)
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

  const previewCols = previewColumns.length > 0 ? previewColumns : []

  // Build a map of row index → duplicate type for highlighting
  const duplicateRowMap = useMemo(() => {
    const map = new Map<number, 'exact'>()
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
        {aiPreview.isPending && (
          <div className="flex items-center gap-2" style={{ color: 'var(--ink-2)', fontSize: 13 }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang phân tích...
          </div>
        )}
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

          {/* Client resolution card */}
          {!clientId && excelClientName && (
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
                    variant="default"
                    onClick={openCreateClient}
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--warning)',
                      border: '1px solid var(--warning)',
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
                    <Button variant="ghost" onClick={cancelCreateClient} disabled={createClient.isPending}>
                      Huỷ
                    </Button>
                    <Button
                      variant="default"
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
            <div
              className="nepo-table-scroll"
              style={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-sm)',
                overflow: 'auto',
                maxHeight: 'calc(100vh - 280px)',
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
                  {previewData.map((row, i) => {
                    const realIndex = i
                    const dupType = duplicateRowMap.get(realIndex)
                    const rowBg = dupType === 'exact' ? 'var(--danger-soft)' : undefined
                    return (
                      <tr key={realIndex} style={rowBg ? { background: rowBg } : undefined}>
                        <td>
                          <span
                            className="tabular-nums text-[12px]"
                            style={{ color: 'var(--ink-3)' }}
                          >
                            {dupType ? (
                              <AlertTriangle
                                className="inline h-3 w-3 mr-0.5"
                                style={{
                                  color: 'var(--danger)',
                                }}
                              />
                            ) : null}
                            {realIndex + 1}
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
