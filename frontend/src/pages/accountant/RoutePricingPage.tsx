import { Plus, Route } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { SettingsPageLayout } from '@/components/shared/SettingsPageLayout/SettingsPageLayout'
import { RoutePricingTable } from '@/components/route-pricing/RoutePricingTable'
import { RoutePricingFilters } from '@/components/route-pricing/RoutePricingFilters'
import { RoutePricingDialog } from '@/components/route-pricing/RoutePricingDialog'
import { useRoutePricing } from '@/components/route-pricing/useRoutePricing'

export function RoutePricingPage() {
  const {
    routePricings,
    isLoading,
    clients,
    locations,
    clientId,
    setClientId,
    operationType,
    setOperationType,
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
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm cước tuyến
        </Button>
      }
    >
      <RoutePricingFilters
        clientId={clientId}
        onClientChange={setClientId}
        operationType={operationType}
        onOperationTypeChange={setOperationType}
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

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xoá?</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
            Cước tuyến sẽ bị vô hiệu hoá. Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">
              Huỷ
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageLayout>
  )
}
