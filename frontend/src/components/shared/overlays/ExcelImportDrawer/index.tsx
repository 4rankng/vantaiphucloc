import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  X,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle,
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

import { type ImportStep, IMPORT_STEPS, stepIndex, type PreviewRow, transformPreviewToTable } from '../importTypes'
import { type ImportType, ImportTypeSelector } from './ImportTypeSelector'
import { FileDropZone } from './FileDropZone'
import { AIProcessingScreen } from './AIProcessingScreen'
import { ClientResolutionCard } from './ClientResolutionCard'
import { FreightKindBanner } from './FreightKindBanner'
import { PreviewTable } from './PreviewTable'
import { ImportResultScreen } from './ImportResultScreen'

type ClientFormData = Omit<Client, 'id'>

export function ExcelImportDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [clientId, setClientId] = useState('')
  const [importType, setImportType] = useState<ImportType>('client')
  const [vendorId, setVendorId] = useState('')
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [previewColumns, setPreviewColumns] = useState<string[]>([])
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [previewResult, setPreviewResult] = useState<PreviewResultDto | null>(null)
  const [reconResult, setReconResult] = useState<VendorImportResponse | DriverImportResponse | null>(null)
  const [driverCommitResult, setDriverCommitResult] = useState<DriverCommitResponse | null>(null)
  const [resolvedFreightKinds, setResolvedFreightKinds] = useState<Record<number, 'E' | 'F'>>({})
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const { data: clients = [] } = useClients()
  const { data: vendors = [] } = useVendors()
  const createClient = useCreateClient()
  const commitClientExcel = useCommitCustomerExcel()
  const enqueueClientExcel = useEnqueueCustomerExcelPreview()
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
    setResolvedFreightKinds({})
    const { cols, rows, duplicateGroups: dups, warnings } = transformPreviewToTable(data)
    setPreviewColumns(cols)
    setPreviewData(rows)
    setDuplicateGroups(dups)
    setPreviewWarnings(warnings)

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
    setResolvedFreightKinds(prev => ({ ...prev, [rowIndex]: kind }))
    if (previewResult?.accepted?.[rowIndex]) {
      const row = previewResult.accepted[rowIndex]
      const size = row.values.container_size ?? ''
      row.values.freight_kind = kind
      row.values.cont_type = `${kind}${size}`
      setPreviewData(prev => {
        const newData = [...prev]
        newData[rowIndex] = { ...newData[rowIndex], 'Loại Cont': `${kind}${size}` }
        return newData
      })
    }
  }, [previewResult])

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

  const startPreview = useCallback((f: File) => {
    setError(null)
    if (importType === 'client') {
      enqueueClientExcel.mutate(
        { file: f },
        {
          onSuccess: (res) => setActiveJobId(res.job_id),
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
        },
      )
    } else if (importType === 'driver') {
      previewDriverRecon.mutate(
        { file: f },
        {
          onSuccess: (data) => {
            setPreviewResult(data)
            const { cols, rows, duplicateGroups: dups, warnings } = transformPreviewToTable(data)
            setPreviewColumns(cols)
            setPreviewData(rows)
            setDuplicateGroups(dups)
            setPreviewWarnings(warnings)
            setStep('preview')
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
        },
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
            const { cols, rows, duplicateGroups: dups, warnings } = transformPreviewToTable(data)
            setPreviewColumns(cols)
            setPreviewData(rows)
            setDuplicateGroups(dups)
            setPreviewWarnings(warnings)
            setStep('preview')
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi phân tích file'),
        },
      )
    }
  }, [importType, previewDriverRecon, previewVendorRecon, vendorId, enqueueClientExcel])

  const handleFileSelect = useCallback((f: File) => {
    setError(null)
    if (importType === 'vendor' && !vendorId) {
      setError('Vui lòng chọn nhà thầu trước khi chọn file.')
      return
    }
    setFile(f)
    startPreview(f)
  }, [startPreview, importType, vendorId])

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
            freight_kind_unknown: r.values.freight_kind_unknown && !resolvedFreightKinds[idx],
          })),
        },
        {
          onSuccess: () => setStep('done'),
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu'),
        },
      )
    } else if (importType === 'vendor') {
      commitVendorRecon.mutate(
        { vendorId: Number(vendorId), rows: (previewResult?.accepted ?? []).map(r => r.values as Record<string, unknown>) },
        {
          onSuccess: (data) => { setReconResult(data); setStep('done') },
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu'),
        },
      )
    } else if (importType === 'driver') {
      commitDriverRecon.mutate(
        { rows: (previewResult?.accepted ?? []).map(r => r.values as Record<string, unknown>) },
        {
          onSuccess: (data) => { setDriverCommitResult(data); setStep('done') },
          onError: (err) => setError(err instanceof Error ? err.message : 'Lỗi khi lưu dữ liệu'),
        },
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
    setActiveJobId(null)
  }

  // When client is selected, fill "Chủ hàng" column in all preview rows
  useEffect(() => {
    if (step !== 'preview' || !clientId || !previewData.length) return
    const clientName = clients.find(c => String(c.id) === clientId)?.name
    if (!clientName) return
    setPreviewData(prev => prev.map(row => ({ ...row, 'Chủ hàng': clientName })))
  }, [step, clientId, clients])

  const isProcessing = enqueueClientExcel.isPending || !!activeJobId || previewDriverRecon.isPending || previewVendorRecon.isPending

  const isCommitting = commitClientExcel.isPending || commitDriverRecon.isPending || commitVendorRecon.isPending

  const headerActions = (
    <div className="flex items-center gap-2">
      {step === 'upload' ? (
        <>
          {isProcessing && (
            <div className="flex items-center gap-2 mr-2" style={{ color: 'var(--ink-2)', fontSize: 13 }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{activeJobId ? 'AI đang phân tích file...' : 'Đang tải file lên...'}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Huỷ
          </Button>
        </>
      ) : step === 'preview' ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setStep('upload'); setPreviewData([]); setPreviewColumns([]); setActiveJobId(null) }}
          >
            Quay lại
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={importType === 'client' ? (!clientId || isCommitting || unresolvedCount > 0) : (isCommitting || unresolvedCount > 0)}
          >
            {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {isCommitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
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
      )}
    </div>
  )

  function handleResolveAll(kind: 'E' | 'F') {
    const updated = { ...resolvedFreightKinds }
    ;(previewResult?.accepted ?? []).forEach((r, idx) => {
      if (r.values?.freight_kind_unknown && !resolvedFreightKinds[idx]) {
        updated[idx] = kind
        const size = r.values.container_size ?? ''
        r.values.freight_kind = kind
        r.values.cont_type = `${kind}${size}`
        setPreviewData(prev => {
          const d = [...prev]
          d[idx] = { ...d[idx], 'Loại Cont': `${kind}${size}` }
          return d
        })
      }
    })
    setResolvedFreightKinds(updated)
  }

  return (
    <Drawer
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Đối soát"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <span>Nhập Excel</span>
          {headerActions}
        </div>
      }
      width="80vw"
    >
      {/* Step indicator */}
      <div className="mb-6">
        <StepIndicator steps={IMPORT_STEPS} current={stepIndex(step)} />
      </div>

      {/* ── Upload step ── */}
      {step === 'upload' && (
        <div className="space-y-5">
          {isProcessing ? (
            <AIProcessingScreen fileName={file?.name} />
          ) : (
            <>
              <ImportTypeSelector
                value={importType}
                onChange={(type) => { setImportType(type); setFile(null); setClientId(''); setVendorId(''); setError(null) }}
              />

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

              <div>
                <label className="nepo-field-label">File Excel</label>
                {!file && <FileDropZone onFileSelect={handleFileSelect} />}
              </div>

              {error && (
                <div
                  className="flex items-start gap-2.5 px-3.5 py-3"
                  style={{
                    background: 'var(--danger-soft)',
                    borderRadius: 'var(--r-sm)',
                    color: 'var(--danger)',
                    fontSize: 13,
                    maxWidth: 500,
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
                  <p key={i} className="m-0 font-semibold">{w}</p>
                ))}
                {duplicateGroups.length > 0 && (
                  <ul className="m-0 mt-1.5 pl-4 space-y-0.5" style={{ listStyle: 'disc' }}>
                    {duplicateGroups.map((g, i) => (
                      <li key={i} className="text-[12px]" style={{ opacity: 0.9 }}>{g.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Client resolution card or selected client status */}
          {importType === 'client' && (
            clientId ? (
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: 'var(--success-soft)',
                  borderRadius: 'var(--r-md, var(--r-sm))',
                  border: '1px solid var(--success)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold" style={{ color: 'var(--success)' }}>
                    Chủ hàng đã chọn:
                  </span>
                  <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>
                    {clients.find((c) => String(c.id) === clientId)?.name ?? '—'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClientId('')}
                  style={{
                    color: 'var(--danger)',
                    borderColor: 'var(--danger)',
                    background: 'transparent',
                  }}
                >
                  <X className="h-4 w-4" />
                  Chọn lại chủ hàng
                </Button>
              </div>
            ) : excelClientName ? (
              <ClientResolutionCard
                excelClientName={excelClientName}
                clientId={clientId}
                onClientIdChange={setClientId}
                clients={clients}
                createClientMutate={createClient.mutateAsync as (data: ClientFormData) => Promise<{ id: number | string } | null>}
                isCreating={createClient.isPending}
                onError={(msg) => setError(msg)}
              />
            ) : (
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: 'var(--warning-soft)',
                  borderRadius: 'var(--r-md, var(--r-sm))',
                  border: '1px solid var(--warning)',
                }}
              >
                <span className="text-[13px] font-semibold" style={{ color: 'var(--warning)' }}>
                  Vui lòng chọn chủ hàng:
                </span>
                <InlineSelect
                  placeholder="Chọn chủ hàng..."
                  value={clientId}
                  options={clients.map((c) => ({ value: String(c.id), label: c.name }))}
                  onChange={setClientId}
                  style={{ minWidth: 200 }}
                />
              </div>
            )
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
              {previewData.length} dòng · {previewColumns.length} cột
            </span>
          </div>

          {/* Freight kind resolution + Preview table */}
          {unresolvedCount > 0 && (
            <FreightKindBanner unresolvedCount={unresolvedCount} onResolveAll={handleResolveAll} />
          )}
          <PreviewTable
            columns={previewColumns}
            data={previewData}
            previewResult={previewResult}
            resolvedFreightKinds={resolvedFreightKinds}
            onResolveFreightKind={resolveFreightKind}
          />

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
        <ImportResultScreen
          importType={importType}
          fileName={file?.name}
          clientCreated={commitClientExcel.data?.created ?? 0}
          clientLocationsCreated={commitClientExcel.data?.locations_created ?? 0}
          clientErrors={commitClientExcel.data?.errors}
          vendorResult={importType === 'vendor' ? reconResult as VendorImportResponse : null}
          driverResult={driverCommitResult}
          totalRows={(previewResult?.accepted?.length ?? 0) + (previewResult?.rejected?.length ?? 0)}
        />
      )}
    </Drawer>
  )
}
