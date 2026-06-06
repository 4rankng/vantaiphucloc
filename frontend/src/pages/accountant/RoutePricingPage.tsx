import { useState, useCallback, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Route, FileSpreadsheet, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { Panel } from '@/components/shared/overlays/Panel'
import { InlineSelect } from '@/components/shared/forms/InlineSelect/InlineSelect'
import { DangerConfirmDialog } from '@/components/shared/overlays/DangerConfirmDialog/DangerConfirmDialog'
import { RoutePricingTable, type RoutePricingFormData, type ClientGroup } from '@/components/route-pricing/RoutePricingTable'
import { RoutePricingDialog } from '@/components/route-pricing/RoutePricingDialog'
import { RoutePricingImportDialog } from '@/components/route-pricing/RoutePricingImportDialog'
import { useRoutePricing } from '@/components/route-pricing/useRoutePricing'
import { WORK_TYPE_LABELS } from '@/data/domain'
import type { WorkType, RoutePricing } from '@/data/domain'
import type { RoutePricingUpdatePayload } from '@/services/api/routePricings.api'
import { LinkButton, SyncPricingDialog } from '@/components/shared'
import { useSyncAllPricing } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms'

export function RoutePricingPage() {
  const { pathname } = useLocation()
  const backTo = pathname.startsWith('/accountant') ? '/accountant/settings' : undefined
  const [importOpen, setImportOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [inlineEditId, setInlineEditId] = useState<number | null>(null)

  const { toast } = useToast()
  const syncAllPricing = useSyncAllPricing()

  const handleConfirmSync = useCallback(() => {
    syncAllPricing.mutate(undefined, {
      onSuccess: (data) => {
        toast({
          title: 'Đồng bộ thành công',
          description: `Đã cập nhật cước/lương cho ${data.updatedCount} chuyến.`,
          variant: 'success',
        })
        setSyncOpen(false)
      },
      onError: (err) => {
        toast({
          title: 'Đồng bộ thất bại',
          description: err.message || 'Đã có lỗi xảy ra khi đồng bộ.',
          variant: 'error',
        })
      },
    })
  }, [syncAllPricing, toast])

  const [inlineEditField, setInlineEditField] = useState<
    'clientId' | 'pickupLocationId' | 'dropoffLocationId' | 'workType' | 'f20Price' | 'f40Price' | 'e20Price' | 'e40Price' | 'f20DriverSalary' | 'f40DriverSalary' | 'e20DriverSalary' | 'e40DriverSalary'
  >('f20Price')
  const [inlineEditInitial, setInlineEditInitial] = useState<RoutePricingFormData | undefined>()

  const {
    routePricings,
    isLoading,
    clients,
    locations,
    clientId,
    setClientId,
    workType,
    setWorkType,
    dialogOpen,
    setDialogOpen,
    editingId,
    form,
    setForm,
    deleteId,
    setDeleteId,
    openCreate,
    handleSubmit,
    handleDelete,
    updateItem,
    isSubmitting,
    isUpdating,
  } = useRoutePricing()

  // ─── Group route pricings by client ──────────────────────────────────────

  const groups = useMemo<ClientGroup[]>(() => {
    const map = new Map<number, ClientGroup>()
    for (const rp of routePricings) {
      const existing = map.get(rp.client.id)
      if (existing) {
        existing.routes.push(rp)
        existing.routeCount++
      } else {
        map.set(rp.client.id, {
          clientId: rp.client.id,
          clientName: rp.client.name,
          clientCode: rp.client.code ?? null,
          routeCount: 1,
          routes: [rp],
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.clientName.localeCompare(b.clientName, 'vi'))
  }, [routePricings])

  // ─── Expand/collapse state ───────────────────────────────────────────────

  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set())

  // Auto-expand when filtering to a specific client
  useEffect(() => {
    if (clientId) {
      setExpandedClients(new Set([clientId]))
    }
  }, [clientId])

  const toggleClient = useCallback((id: number) => {
    setExpandedClients(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedClients(new Set(groups.map(g => g.clientId)))
  }, [groups])

  const collapseAll = useCallback(() => {
    setExpandedClients(new Set())
  }, [])

  // ─── Inline edit handlers ────────────────────────────────────────────────

  const handleStartEdit = useCallback((rp: RoutePricing, field?: typeof inlineEditField) => {
    setInlineEditId(rp.id)
    setInlineEditField(field ?? 'f20Price')
    setInlineEditInitial({
      clientId: rp.client.id,
      pickupLocationId: rp.pickupLocation.id,
      dropoffLocationId: rp.dropoffLocation.id,
      workType: rp.workType,
      f20Price: rp.f20Price?.toString() ?? '',
      f40Price: rp.f40Price?.toString() ?? '',
      e20Price: rp.e20Price?.toString() ?? '',
      e40Price: rp.e40Price?.toString() ?? '',
      f20DriverSalary: rp.f20DriverSalary?.toString() ?? '',
      f40DriverSalary: rp.f40DriverSalary?.toString() ?? '',
      e20DriverSalary: rp.e20DriverSalary?.toString() ?? '',
      e40DriverSalary: rp.e40DriverSalary?.toString() ?? '',
    })
    // Auto-expand the group containing this row
    setExpandedClients(prev => {
      if (prev.has(rp.client.id)) return prev
      const next = new Set(prev)
      next.add(rp.client.id)
      return next
    })
  }, [])

  const handleSaveInline = useCallback((id: number, data: RoutePricingFormData) => {
    const parsePrice = (v: string) => {
      if (!v.trim()) return null
      const n = parseInt(v.replace(/[^0-9]/g, ''), 10)
      return isNaN(n) ? null : n
    }
    const payload: RoutePricingUpdatePayload = {
      clientId: data.clientId,
      pickupLocationId: data.pickupLocationId,
      dropoffLocationId: data.dropoffLocationId,
      workType: data.workType,
      f20Price: parsePrice(data.f20Price),
      f40Price: parsePrice(data.f40Price),
      e20Price: parsePrice(data.e20Price),
      e40Price: parsePrice(data.e40Price),
      f20DriverSalary: parsePrice(data.f20DriverSalary),
      f40DriverSalary: parsePrice(data.f40DriverSalary),
      e20DriverSalary: parsePrice(data.e20DriverSalary),
      e40DriverSalary: parsePrice(data.e40DriverSalary),
    }
    updateItem(id, payload, { onSuccess: () => setInlineEditId(null) })
  }, [updateItem])

  const handleCancelInline = useCallback(() => setInlineEditId(null), [])

  // ─── Filter options ──────────────────────────────────────────────────────

  const workTypeOptions = [
    { value: 'all', label: 'Tất cả tác nghiệp' },
    ...(Object.entries(WORK_TYPE_LABELS) as [WorkType, string][])
      .filter(([key]) => !['E20', 'E40', 'F20', 'F40'].includes(key))
      .map(([key, label]) => ({ value: key, label })),
  ]

  const clientOptions = [
    { value: 'all', label: 'Tất cả chủ hàng' },
    ...clients.map(c => ({ value: String(c.id), label: c.code ? `${c.code} – ${c.name}` : c.name })),
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Bảng giá cước"
        subtitle="Quản lý bảng giá cước theo tuyến đường và loại hình tác nghiệp"
        lucideIcon={Route}
        breadcrumbs={
          backTo
            ? <LinkButton to={backTo} icon={ArrowLeft} variant="muted">Thiết lập</LinkButton>
            : undefined
        }
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 flex-wrap">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-[190px]">
            <InlineSelect
              placeholder="Tất cả chủ hàng"
              value={clientId ? String(clientId) : 'all'}
              options={clientOptions}
              onChange={v => setClientId(v === 'all' ? undefined : Number(v))}
              size="md"
            />
          </div>

          <div className="w-full sm:w-[180px]">
            <InlineSelect
              placeholder="Tất cả tác nghiệp"
              value={workType ?? 'all'}
              options={workTypeOptions}
              onChange={v => setWorkType(v === 'all' ? undefined : v)}
              size="md"
            />
          </div>

          {(clientId || workType) && (
            <button
              className="text-xs font-medium transition-colors whitespace-nowrap self-start sm:self-center"
              style={{ color: 'var(--ink-3)' }}
              onClick={() => { setClientId(undefined); setWorkType(undefined) }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-1)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)')}
            >
              Xoá lọc
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setSyncOpen(true)} className="flex-1 sm:flex-none gap-1.5 whitespace-nowrap">
            <RefreshCw className="h-3.5 w-3.5" />
            Đồng bộ cước/lương
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)} className="flex-1 sm:flex-none gap-1.5 whitespace-nowrap">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Nhập Excel
          </Button>
          <Button onClick={openCreate} className="flex-1 sm:flex-none gap-1.5 whitespace-nowrap">
            <Plus className="h-3.5 w-3.5" />
            Thêm cước tuyến
          </Button>
        </div>
      </div>

      <Panel flush>
        <RoutePricingTable
          data={routePricings}
          isLoading={isLoading}
          editingId={inlineEditId}
          editingField={inlineEditField}
          onStartEdit={handleStartEdit}
          onSave={handleSaveInline}
          onCancelEdit={handleCancelInline}
          onDelete={setDeleteId}
          editInitial={inlineEditInitial}
          isSaving={isUpdating}
          clients={clients}
          locations={locations}
          groups={groups}
          expandedClients={expandedClients}
          onToggleClient={toggleClient}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />
      </Panel>

      {/* Create/edit dialog */}
      <RoutePricingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        clients={clients}
        locations={locations}
      />

      {/* Delete confirmation */}
      <DangerConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Xoá cước tuyến?"
        entityName={
          (() => {
            const rp = routePricings.find(r => r.id === deleteId)
            return rp ? `${rp.pickupLocation.name} → ${rp.dropoffLocation.name}` : ''
          })()
        }
      />

      <RoutePricingImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <SyncPricingDialog
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        isPending={syncAllPricing.isPending}
        onConfirm={handleConfirmSync}
      />
    </div>
  )
}
