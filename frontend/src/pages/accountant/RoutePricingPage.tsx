import { Plus, Route, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { SettingsPageLayout } from '@/components/shared/SettingsPageLayout/SettingsPageLayout'
import { RoutePricingTable } from '@/components/route-pricing/RoutePricingTable'
import { RoutePricingFilters } from '@/components/route-pricing/RoutePricingFilters'
import { RoutePricingDialog } from '@/components/route-pricing/RoutePricingDialog'
import { RoutePricingImportDialog } from '@/components/route-pricing/RoutePricingImportDialog'
import { useRoutePricing } from '@/components/route-pricing/useRoutePricing'

export function RoutePricingPage() {
  const [importOpen, setImportOpen] = useState(false)
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
    openEdit,
    handleSubmit,
    handleDelete,
    isSubmitting,
  } = useRoutePricing()

  return (
    <SettingsPageLayout
      title="Cước tuyến"
      subtitle="Quản lý bảng giá cước theo tuyến đường và loại hình tác nghiệp"
      icon={Route}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Nhập Excel</span>
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Thêm cước tuyến</span>
          </Button>
        </div>
      }
    >
      <RoutePricingFilters
        clientId={clientId}
        onClientChange={setClientId}
        workType={workType}
        onWorkTypeChange={setWorkType}
        clients={clients}
      />

      <RoutePricingTable
        data={routePricings}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={setDeleteId}
      />

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
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in srgb, #ef4444 12%, transparent)' }}
              >
                <AlertTriangle className="h-5 w-5" style={{ color: '#dc2626' }} />
              </div>
              <DialogTitle>Xác nhận xoá?</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm pl-[52px]" style={{ color: 'var(--ink-3)' }}>
            Cước tuyến sẽ bị vô hiệu hoá. Hành động này không thể hoàn tác.
          </p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">
              Huỷ
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RoutePricingImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </SettingsPageLayout>
  )
}
