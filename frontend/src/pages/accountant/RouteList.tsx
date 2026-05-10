import { useCallback, useMemo, useState } from 'react'
import { Pencil, Trash2, Route as RouteIcon, Container, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { EmptyState } from '@/components/shared/EmptyState'
import { BrandIcon } from '@/components/atoms/BrandIcon'
import { fuzzyMatch } from '@/lib/search-utils'
import { useRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute, useLocations } from '@/hooks/use-queries'
import { LocationSelect } from '@/components/shared/LocationSelect/LocationSelect'
import { RouteDisplay } from '@/components/shared/RouteDisplay'
// Route type removed from domain — routes are deprecated
interface Route {
  id: number
  route: string
  pickupLocation: { id: number; name: string }
  dropoffLocation: { id: number; name: string }
}

interface RouteForm {
  route: string
  pickupLocation: string
  dropoffLocation: string
}

const EMPTY_FORM: RouteForm = { route: '', pickupLocation: '', dropoffLocation: '' }

export function RouteList() {
  const { data: routes = [], isLoading: loading } = useRoutes()
  const { data: locations = [] } = useLocations()

  const [selected, setSelected] = useState<Route | null>(null)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRoute, setEditRoute] = useState<Route | null>(null)
  const [form, setForm] = useState<RouteForm>(EMPTY_FORM)
  const [search, setSearch] = useState('')

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return routes
    const q = search
    return routes.filter(r =>
      fuzzyMatch(r.route ?? '', q) ||
      fuzzyMatch(r.pickupLocation.name, q) ||
      fuzzyMatch(r.dropoffLocation.name, q)
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

  const handleOpenEdit = useCallback((r: Route) => {
    setEditRoute(r)
    setForm({
      route: r.route,
      pickupLocation: r.pickupLocation.name,
      dropoffLocation: r.dropoffLocation.name,
    })
    setSelected(null)
    setDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    const pickupId = locations.find(l => l.name === form.pickupLocation)?.id
    const dropoffId = locations.find(l => l.name === form.dropoffLocation)?.id
    if (!pickupId || !dropoffId) return
    const payload = { route: form.route, pickupLocationId: pickupId, dropoffLocationId: dropoffId }
    if (editRoute) {
      updateRoute.mutate({ id: editRoute.id, data: payload }, { onSuccess: () => setDialogOpen(false) })
    } else {
      createRoute.mutate(payload, { onSuccess: () => setDialogOpen(false) })
    }
  }, [editRoute, form, locations, createRoute, updateRoute])

  const handleDelete = useCallback(() => {
    if (!selected?.id) return
    deleteRoute.mutate(selected.id, {
      onSuccess: () => {
        setDeleteConfirm(false)
        setSelected(null)
      },
    })
  }, [selected, deleteRoute])

  const updateField = useCallback((field: keyof RouteForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-lg skeleton-shimmer" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Actions toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm cung đường..."
          className="search-pill max-w-sm"
        />
        <button onClick={handleOpenCreate} className="btn-primary">
          <Plus size={16} strokeWidth={2.25} />
          <span>Thêm</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={search
              ? <RouteIcon className="h-6 w-6" />
              : <BrandIcon name="calkey" className="w-24 h-24" />}
            title={search ? 'Không tìm thấy cung đường' : 'Chưa có cung đường'}
            description={search ? 'Thử từ khoá khác' : 'Nhấn + để thêm cung đường mới'}
            compact
            illustration={!search}
          />
        </div>
      ) : (
        <>
          {/* Responsive card grid: 1 col mobile → 2 col lg → 3 col xl */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="card-interactive p-4 text-left"
              >
                {/* Card header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--theme-brand-primary-light)' }}>
                    <RouteIcon className="h-4 w-4" style={{ color: 'var(--theme-brand-primary)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <RouteDisplay route={r.route} pickupLocation={r.pickupLocation.name} dropoffLocation={r.dropoffLocation.name} />
                  </div>
                </div>

                {/* Divider */}
                <div className="mb-3" style={{ borderTop: '1px solid var(--theme-border-default)' }} />

                {/* Pickup / Dropoff */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide mb-0.5"
                      style={{ color: 'var(--theme-text-muted)' }}>Điểm lấy</p>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--theme-text-secondary)' }}>
                      {r.pickupLocation.name || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide mb-0.5"
                      style={{ color: 'var(--theme-text-muted)' }}>Điểm trả</p>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--theme-text-secondary)' }}>
                      {r.dropoffLocation.name || '—'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Route Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="p-0 gap-0 overflow-hidden max-w-sm [&>button]:text-white [&>button]:hover:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
          {selected && (() => {
            const parts = selected.route.split(/\s*→\s*|\s*->\s*|\s*-\s*/)
            const from = parts[0] ?? selected.route
            const to = parts[1] ?? ''
            return (
              <>
                {/* Header */}
                <div className="px-6 pt-6 pb-7" style={{ background: 'var(--theme-brand-primary)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.1em] mb-1.5"
                        style={{ color: 'rgba(255,255,255,0.5)' }}>Chi tiết tuyến</p>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-[22px] font-semibold" style={{ color: 'var(--theme-text-on-brand)' }}>{from}</span>
                        {to && (
                          <>
                            <svg width="32" height="10" viewBox="0 0 32 10">
                              <line x1="0" y1="5" x2="24" y2="5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="3 3"/>
                              <polygon points="24,0 32,5 24,10" fill="rgba(255,255,255,0.6)"/>
                            </svg>
                            <span className="text-[22px] font-semibold" style={{ color: 'var(--theme-text-on-brand)' }}>{to}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pickup / Dropoff inside header */}
                  <div className="flex gap-0 mt-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.6)' }} />
                        <span className="text-[10px] font-medium uppercase tracking-[0.08em]"
                          style={{ color: 'rgba(255,255,255,0.6)' }}>Điểm lấy</span>
                      </div>
                      <p className="text-[13px] font-semibold pl-[15px]" style={{ color: 'var(--theme-text-on-brand)' }}>
                        {selected.pickupLocation.name || '—'}
                      </p>
                    </div>
                    <div className="w-px mx-4 self-stretch" style={{ background: 'rgba(255,255,255,0.12)' }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.6)' }} />
                        <span className="text-[10px] font-medium uppercase tracking-[0.08em]"
                          style={{ color: 'rgba(255,255,255,0.6)' }}>Điểm trả</span>
                      </div>
                      <p className="text-[13px] font-semibold pl-[15px]" style={{ color: 'var(--theme-text-on-brand)' }}>
                        {selected.dropoffLocation.name || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-6 pt-5 pb-6 grid gap-2.5" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-semibold transition-colors"
                    style={{ border: '1.5px solid var(--theme-status-error)', background: 'var(--theme-bg-secondary)', color: 'var(--theme-status-error)' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--theme-status-error) 8%, transparent)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'var(--theme-bg-secondary)')}>
                    <Trash2 className="w-3.5 h-3.5" /> Xoá
                  </button>
                  <button
                    onClick={() => handleOpenEdit(selected!)}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-semibold transition-colors"
                    style={{ background: 'var(--theme-status-success)', color: 'var(--theme-text-on-brand)', border: 'none' }}
                    onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
                    onMouseOut={e => (e.currentTarget.style.opacity = '1')}>
                    <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa
                  </button>
                </div>
              </>
            )
          })()}
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
              <Label className="typo-form-label">Tên tuyến</Label>
              <Input value={form.route} onChange={e => updateField('route', e.target.value)} placeholder="Cát Lái - Sóng Thần" className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="typo-form-label">Điểm lấy</Label>
                <LocationSelect value={form.pickupLocation} onChange={v => updateField('pickupLocation', v)} placeholder="Chọn điểm lấy" />
              </div>
              <div className="space-y-2">
                <Label className="typo-form-label">Điểm trả</Label>
                <LocationSelect value={form.dropoffLocation} onChange={v => updateField('dropoffLocation', v)} placeholder="Chọn điểm trả" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleSubmit} disabled={!form.route.trim()} className="flex-1 btn-primary">
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
