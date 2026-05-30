import { useState, useCallback } from 'react'
import { Plus, Route, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { Panel } from '@/components/shared/overlays/Panel'
import { InlineSelect } from '@/components/shared/forms/InlineSelect/InlineSelect'
import { DangerConfirmDialog } from '@/components/shared/overlays/DangerConfirmDialog/DangerConfirmDialog'
import { VendorRoutePricingTable, type FocusableField, type VendorRoutePricingFormData } from '@/components/vendor-route-pricing/VendorRoutePricingTable'
import { VendorRoutePricingDialog } from '@/components/vendor-route-pricing/VendorRoutePricingDialog'
import { VendorRoutePricingImportDialog } from '@/components/vendor-route-pricing/VendorRoutePricingImportDialog'
import { useVendorRoutePricing } from '@/components/vendor-route-pricing/useVendorRoutePricing'
import { WORK_TYPE_LABELS } from '@/data/domain'
import type { WorkType, VendorRoutePricing } from '@/data/domain'
import type { VendorRoutePricingUpdatePayload } from '@/services/api/vendorRoutePricings.api'

export function VendorRoutePricingPage() {
  const [importOpen, setImportOpen] = useState(false)
  const [inlineEditId, setInlineEditId] = useState<number | null>(null)
  const [inlineEditField, setInlineEditField] = useState<FocusableField>('f20Price')
  const [inlineEditInitial, setInlineEditInitial] = useState<VendorRoutePricingFormData | undefined>()

  const {
    vendorRoutePricings,
    isLoading,
    vendors,
    locations,
    vendorId,
    setVendorId,
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
  } = useVendorRoutePricing()

  const handleStartEdit = useCallback((rp: VendorRoutePricing, field?: FocusableField) => {
    setInlineEditId(rp.id)
    setInlineEditField(field ?? 'f20Price')
    setInlineEditInitial({
      vendorId: rp.vendor.id,
      pickupLocationId: rp.pickupLocation.id,
      dropoffLocationId: rp.dropoffLocation.id,
      workType: rp.workType,
      f20Price: rp.f20Price?.toString() ?? '',
      f40Price: rp.f40Price?.toString() ?? '',
      e20Price: rp.e20Price?.toString() ?? '',
      e40Price: rp.e40Price?.toString() ?? '',
    })
  }, [])

  const handleSaveInline = useCallback((id: number, data: VendorRoutePricingFormData) => {
    const parsePrice = (v: string) => {
      if (!v.trim()) return null
      const n = parseInt(v.replace(/[^0-9]/g, ''), 10)
      return isNaN(n) ? null : n
    }
    const payload: VendorRoutePricingUpdatePayload = {
      vendorId: data.vendorId,
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

  const workTypeOptions = [
    { value: 'all', label: 'Tất cả tác nghiệp' },
    ...(Object.entries(WORK_TYPE_LABELS) as [WorkType, string][])
      .filter(([key]) => !['E20', 'E40', 'F20', 'F40'].includes(key))
      .map(([key, label]) => ({ value: key, label })),
  ]

  const vendorOptions = [
    { value: 'all', label: 'Tất cả nhà thầu' },
    ...vendors.map(v => ({ value: String(v.id), label: v.code ? `${v.code} – ${v.name}` : v.name })),
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Bảng phí thuê xe"
        subtitle="Quản lý bảng giá cước trả nhà thầu theo tuyến đường"
        lucideIcon={Route}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div style={{ width: 190 }}>
            <InlineSelect
              placeholder="Tất cả nhà thầu"
              value={vendorId ? String(vendorId) : 'all'}
              options={vendorOptions}
              onChange={v => setVendorId(v === 'all' ? undefined : Number(v))}
              size="md"
            />
          </div>

          <div style={{ width: 180 }}>
            <InlineSelect
              placeholder="Tất cả tác nghiệp"
              value={workType ?? 'all'}
              options={workTypeOptions}
              onChange={v => setWorkType(v === 'all' ? undefined : v)}
              size="md"
            />
          </div>

          {(vendorId || workType) && (
            <button
              className="text-xs font-medium transition-colors whitespace-nowrap"
              style={{ color: 'var(--ink-3)' }}
              onClick={() => { setVendorId(undefined); setWorkType(undefined) }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-1)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)')}
            >
              Xoá lọc
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5 whitespace-nowrap">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Nhập Excel
          </Button>
          <Button onClick={openCreate} className="gap-1.5 whitespace-nowrap">
            <Plus className="h-3.5 w-3.5" />
            Thêm cước trả
          </Button>
        </div>
      </div>

      <Panel flush>

        <VendorRoutePricingTable
          data={vendorRoutePricings}
          isLoading={isLoading}
          editingId={inlineEditId}
          editingField={inlineEditField}
          onStartEdit={handleStartEdit}
          onSave={handleSaveInline}
          onCancelEdit={handleCancelInline}
          onDelete={setDeleteId}
          editInitial={inlineEditInitial}
          isSaving={isUpdating}
          vendors={vendors}
          locations={locations}
        />
      </Panel>

      <VendorRoutePricingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        vendors={vendors}
        locations={locations}
      />

      <DangerConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Xoá cước trả?"
        entityName={
          (() => {
            const rp = vendorRoutePricings.find(r => r.id === deleteId)
            return rp ? `${rp.pickupLocation.name} → ${rp.dropoffLocation.name}` : ''
          })()
        }
      />

      <VendorRoutePricingImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
