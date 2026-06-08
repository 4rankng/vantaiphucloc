import { useState, useCallback } from 'react'
import { Wrench, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@/components/ui'
import { Panel } from '@/components/shared/overlays/Panel'
import { AliasManager } from '@/components/shared/cards/AliasManager'
import { useToast } from '@/components/atoms/Toast'
import { SettingsPageLayout } from '@/components/shared/layouts/SettingsPageLayout/SettingsPageLayout'
import {
  useOperationTypes,
  useCreateOperationType,
  useUpdateOperationType,
  useDeleteOperationType,
  useOperationTypeAliases,
  useCreateOperationTypeAlias,
  usePromoteOperationTypeAlias,
  useDeleteOperationTypeAlias,
} from '@/hooks/queries/operation-types'
import type { OperationTypeEntity } from '@/data/domain'

function OperationTypeRow({ t, onToggle, onEdit, onDelete }: {
  t: OperationTypeEntity
  onToggle: (t: OperationTypeEntity) => void
  onEdit: (t: OperationTypeEntity) => void
  onDelete: (t: OperationTypeEntity) => void
}) {
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const { data: aliases } = useOperationTypeAliases(expanded ? t.id : undefined)
  const createAlias = useCreateOperationTypeAlias()
  const promoteAlias = usePromoteOperationTypeAlias()
  const deleteAlias = useDeleteOperationTypeAlias()

  const aliasItems = (aliases ?? []).map(a => ({ id: a.id, alias: a.alias }))

  const handleAddAlias = useCallback(async (alias: string) => {
    await createAlias.mutateAsync({ operationTypeId: t.id, alias })
  }, [createAlias, t.id])

  const handlePromoteAlias = useCallback(async (aliasId: number) => {
    await promoteAlias.mutateAsync(aliasId)
    toast.success('Đã đặt làm tên chính')
  }, [promoteAlias, toast])

  const handleDeleteAlias = useCallback(async (aliasId: number) => {
    await deleteAlias.mutateAsync(aliasId)
    toast.success('Đã xóa tên phụ')
  }, [deleteAlias, toast])

  return (
    <div
      className="rounded-lg transition-colors"
      style={{
        background: t.isActive ? 'var(--theme-bg-secondary)' : 'var(--theme-bg-tertiary)',
        opacity: t.isActive ? 1 : 0.6,
      }}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => onToggle(t)}
          className="shrink-0"
          title={t.isActive ? 'Ẩn' : 'Kích hoạt'}
        >
          {t.isActive
            ? <ToggleRight className="w-6 h-6" style={{ color: 'var(--theme-status-success)' }} />
            : <ToggleLeft className="w-6 h-6" style={{ color: 'var(--theme-text-muted)' }} />
          }
        </button>

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="shrink-0 p-0.5 rounded transition-colors"
          style={{ color: 'var(--theme-text-muted)' }}
          title="Tên phụ"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
            {t.label}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
            {t.name}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(t)}
            className="p-1.5 rounded-md transition-colors hover:opacity-80"
            style={{ color: 'var(--theme-text-muted)' }}
            title="Sửa"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(t)}
            className="p-1.5 rounded-md transition-colors hover:opacity-80"
            style={{ color: 'var(--theme-status-danger)' }}
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 ml-9" style={{ borderTop: '1px solid var(--theme-border-default)' }}>
          <div className="pt-3">
            <AliasManager
              aliases={aliasItems}
              onAddAlias={handleAddAlias}
              onPromoteAlias={handlePromoteAlias}
              onDeleteAlias={handleDeleteAlias}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function OperationTypesPage() {
  const toast = useToast()
  const { data: types, isLoading } = useOperationTypes()
  const createType = useCreateOperationType()
  const updateType = useUpdateOperationType()
  const deleteType = useDeleteOperationType()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<OperationTypeEntity | null>(null)
  const [formName, setFormName] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<OperationTypeEntity | null>(null)

  const openCreate = useCallback(() => {
    setEditing(null)
    setFormName('')
    setFormLabel('')
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((t: OperationTypeEntity) => {
    setEditing(t)
    setFormName(t.name)
    setFormLabel(t.label)
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(() => {
    const name = formName.trim().toUpperCase()
    const label = formLabel.trim()
    if (!name || !label) {
      toast.error('Vui lòng nhập đầy đủ thông tin')
      return
    }
    if (editing) {
      updateType.mutate(
        { id: editing.id, data: { name, label } },
        {
          onSuccess: () => { toast.success('Đã cập nhật'); setDialogOpen(false) },
          onError: (err: Error) => toast.error(err.message),
        },
      )
    } else {
      createType.mutate(
        { name, label },
        {
          onSuccess: () => { toast.success('Đã thêm tác nghiệp'); setDialogOpen(false) },
          onError: (err: Error) => toast.error(err.message),
        },
      )
    }
  }, [editing, formName, formLabel, createType, updateType, toast])

  const handleToggle = useCallback((t: OperationTypeEntity) => {
    updateType.mutate(
      { id: t.id, data: { isActive: !t.isActive } },
      {
        onSuccess: () => toast.success(t.isActive ? 'Đã ẩn' : 'Đã kích hoạt'),
        onError: (err: Error) => toast.error(err.message),
      },
    )
  }, [updateType, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteType.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xóa'); setDeleteTarget(null) },
      onError: (err: Error) => { toast.error(err.message); setDeleteTarget(null) },
    })
  }, [deleteTarget, deleteType, toast])

  return (
    <SettingsPageLayout
      title="Loại tác nghiệp"
      subtitle="Quản lý các loại tác nghiệp trong hệ thống"
      icon={Wrench}
    >
      <Panel>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
            ))}
          </div>
        ) : (
          <div className="p-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {types?.length ?? 0} loại tác nghiệp
              </p>
              <Button
                size="sm"
                onClick={openCreate}
                className="gap-1.5"
                style={{
                  background: 'var(--theme-brand-primary)',
                  color: 'var(--theme-text-on-brand)',
                }}
              >
                <Plus className="w-4 h-4" />
                Thêm
              </Button>
            </div>

            {/* List */}
            <div className="space-y-2">
              {types?.map(t => (
                <OperationTypeRow
                  key={t.id}
                  t={t}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Sửa tác nghiệp' : 'Thêm tác nghiệp'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                Tên nội bộ (viết hoa)
              </label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value.toUpperCase())}
                placeholder="VD: ĐÓNG KHO"
                className="w-full h-10 rounded-lg px-3 text-sm"
                style={{
                  background: 'var(--theme-bg-tertiary)',
                  border: '1.5px solid var(--theme-border-default)',
                  color: 'var(--theme-text-primary)',
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                Nhãn hiển thị
              </label>
              <input
                value={formLabel}
                onChange={e => setFormLabel(e.target.value)}
                placeholder="VD: Đóng kho"
                className="w-full h-10 rounded-lg px-3 text-sm"
                style={{
                  background: 'var(--theme-bg-tertiary)',
                  border: '1.5px solid var(--theme-border-default)',
                  color: 'var(--theme-text-primary)',
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave}>
              {editing ? 'Cập nhật' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa tác nghiệp</DialogTitle>
          </DialogHeader>
          <p className="text-sm py-2" style={{ color: 'var(--theme-text-secondary)' }}>
            Bạn có chắc muốn xóa <strong>{deleteTarget?.label}</strong>?
            Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button
              onClick={handleDelete}
              style={{ background: 'var(--theme-status-danger)', color: '#fff' }}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPageLayout>
  )
}
