import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Route as RouteIcon, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InfoRow } from '@/components/shared/InfoRow'
import { useRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute } from '@/hooks/use-queries'
import { RouteDisplay } from '@/components/shared/RouteDisplay'
import { formatCurrencyFull, type RoutePrice } from '@/data/domain'

interface RouteForm {
  route: string
  pickupLocation: string
  dropoffLocation: string
  type20ft: number
  type40ft: number
  isTwoWay: boolean
}

const EMPTY_FORM: RouteForm = { route: '', pickupLocation: '', dropoffLocation: '', type20ft: 0, type40ft: 0, isTwoWay: false }

export function RouteList() {
  const { data: routes = [], isLoading: loading } = useRoutes()

  const [selected, setSelected] = useState<RoutePrice | null>(null)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRoute, setEditRoute] = useState<RoutePrice | null>(null)
  const [form, setForm] = useState<RouteForm>(EMPTY_FORM)
  const [search, setSearch] = useState('')

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return routes
    const q = search.toLowerCase()
    return routes.filter(r =>
      (r.route ?? '').toLowerCase().includes(q) ||
      (r.pickupLocation ?? '').toLowerCase().includes(q) ||
      (r.dropoffLocation ?? '').toLowerCase().includes(q)
    )
  }, [routes, search])

  const createRoute = useCreateRoute()
  const updateRoute = useUpdateRoute()
  const deleteRoute = useDeleteRoute()

  const handleOpenCreate = useCallback(() => {
    setEditRoute(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }, [])

  const handleOpenEdit = useCallback((r: RoutePrice) => {
    setEditRoute(r)
    setForm({
      route: r.route,
      pickupLocation: r.pickupLocation ?? '',
      dropoffLocation: r.dropoffLocation ?? '',
      type20ft: r.type20ft,
      type40ft: r.type40ft,
      isTwoWay: r.isTwoWay ?? false,
    })
    setSelected(null)
    setDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    if (editRoute) {
      updateRoute.mutate({ id: editRoute.id!, data: form }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createRoute.mutate(form, { onSuccess: () => setDialogOpen(false) })
    }
  }, [editRoute, form, createRoute, updateRoute])

  const handleDelete = useCallback(() => {
    if (!selected?.id) return
    deleteRoute.mutate(selected.id, {
      onSuccess: () => {
        setDeleteConfirm(false)
        setSelected(null)
      },
    })
  }, [selected, deleteRoute])

  const updateField = useCallback((field: keyof RouteForm, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="relative flex-1 mr-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm cung đường..." className="text-sm pl-9 h-9" />
        </div>
        <Button onClick={handleOpenCreate} className="h-9 px-3 shrink-0 gap-1.5 text-sm font-semibold"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
          <Plus className="w-4 h-4" /> Thêm
        </Button>
      </div>

      {/* Route list — clean cards, tap to see detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <RouteIcon className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              {search ? 'Không tìm thấy cung đường' : 'Chưa có cung đường'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
              {search ? 'Thử từ khoá khác' : 'Nhấn + để thêm cung đường mới'}
            </p>
          </div>
        ) : filtered.map((r) => (
          <button
            key={`${r.route}-${r.pickupLocation}-${r.dropoffLocation}`}
            onClick={() => setSelected(r)}
            className="w-full text-left rounded-2xl p-3 transition-all active:scale-[0.98] touch-manipulation hover:shadow-md"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--theme-brand-primary-light)' }}>
                <RouteIcon className="h-4 w-4" style={{ color: 'var(--theme-brand-primary)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <RouteDisplay route={r.route} pickupLocation={r.pickupLocation} dropoffLocation={r.dropoffLocation} />
                <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                  20ft: {formatCurrencyFull(r.type20ft)} · 40ft: {formatCurrencyFull(r.type40ft)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Route Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.route ?? ''}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-1">
              <InfoRow icon={RouteIcon} label="Tuyến" value={selected.route} />
              {selected.pickupLocation && <InfoRow label="Điểm lấy" value={selected.pickupLocation} />}
              {selected.dropoffLocation && <InfoRow label="Điểm trả" value={selected.dropoffLocation} />}
              <InfoRow label="Giá 20ft" value={formatCurrencyFull(selected.type20ft)} />
              <InfoRow label="Giá 40ft" value={formatCurrencyFull(selected.type40ft)} />
              <InfoRow label="Hai chiều" value={selected.isTwoWay ? 'Có' : 'Không'} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(true)} className="flex-1" style={{ color: 'var(--theme-status-error)' }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Xoá
            </Button>
            <Button onClick={() => handleOpenEdit(selected!)} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editRoute ? 'Sửa cung đường' : 'Thêm cung đường'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tên tuyến</Label>
              <Input value={form.route} onChange={e => updateField('route', e.target.value)} placeholder="Cát Lái - Sóng Thần" className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điểm lấy</Label>
                <Input value={form.pickupLocation} onChange={e => updateField('pickupLocation', e.target.value)} placeholder="Cảng Cát Lái" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Điểm trả</Label>
                <Input value={form.dropoffLocation} onChange={e => updateField('dropoffLocation', e.target.value)} placeholder="KCN Sóng Thần" className="text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Giá 20ft</Label>
                <Input type="number" value={form.type20ft || ''} onChange={e => updateField('type20ft', Number(e.target.value))} placeholder="0" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Giá 40ft</Label>
                <Input type="number" value={form.type40ft || ''} onChange={e => updateField('type40ft', Number(e.target.value))} placeholder="0" className="text-sm" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isTwoWay} onChange={e => updateField('isTwoWay', e.target.checked)} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>Hai chiều</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleSubmit} disabled={!form.route.trim()} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              {editRoute ? 'Cập nhật' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm} onOpenChange={() => setDeleteConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá cung đường?</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)} className="flex-1">Huỷ</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
