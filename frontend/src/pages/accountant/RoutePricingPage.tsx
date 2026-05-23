import { useState, useCallback } from 'react'
import { Plus, Route, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { Toolbar, ToolbarSpacer } from '@/components/shared/Toolbar'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { DangerConfirmDialog } from '@/components/shared/DangerConfirmDialog/DangerConfirmDialog'
import { RoutePricingTable, type RoutePricingFormData } from '@/components/route-pricing/RoutePricingTable'
import { RoutePricingDialog } from '@/components/route-pricing/RoutePricingDialog'
import { RoutePricingImportDialog } from '@/components/route-pricing/RoutePricingImportDialog'
import { useRoutePricing } from '@/components/route-pricing/useRoutePricing'
import { WORK_TYPE_LABELS } from '@/data/domain'
import type { WorkType, RoutePricing } from '@/data/domain'
import type { RoutePricingUpdatePayload } from '@/services/api/routePricings.api'

export function RoutePricingPage() {
  const [importOpen, setImportOpen] = useState(false)
  const [inlineEditId, setInlineEditId] = useState<number | null>(null)
  const [inlineEditField, setInlineEditField] = useState<
    'clientId' | 'pickupLocationId' | 'dropoffLocationId' | 'workType' | 'f20Price' | 'f40Price' | 'e20Price' | 'e40Price'
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

  // ─── Inline edit handlers ─────────────────────────────────────────────────

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
    })
  }, [inlineEditField])

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
    }
    updateItem(id, payload, { onSuccess: () => setInlineEditId(null) })
  }, [updateItem])

  const handleCancelInline = useCallback(() => setInlineEditId(null), [])

  // ─── Filter options ───────────────────────────────────────────────────────

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
        title="Cước tuyến"
        subtitle="Quản lý bảng giá cước theo tuyến đường và loại hình tác nghiệp"
        lucideIcon={Route}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Nhập Excel
            </Button>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Thêm cước tuyến
            </Button>
          </div>
        }
      />

      <Panel flush>
        <Toolbar bordered>
          <div style={{ width: 190 }}>
            <InlineSelect
              placeholder="Tất cả chủ hàng"
              value={clientId ? String(clientId) : 'all'}
              options={clientOptions}
              onChange={v => setClientId(v === 'all' ? undefined : Number(v))}
            />
          </div>

          <div style={{ width: 200 }}>
            <InlineSelect
              placeholder="Tất cả tác nghiệp"
              value={workType ?? 'all'}
              options={workTypeOptions}
              onChange={v => setWorkType(v === 'all' ? undefined : v)}
            />
          </div>

          {(clientId || workType) && (
            <button
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--ink-3)' }}
              onClick={() => { setClientId(undefined); setWorkType(undefined) }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-1)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)')}
            >
              Xoá lọc
            </button>
          )}

          <ToolbarSpacer />

          {!isLoading && routePricings.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
              {routePricings.length} tuyến
            </span>
          )}
        </Toolbar>

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
    </div>
  )
}
