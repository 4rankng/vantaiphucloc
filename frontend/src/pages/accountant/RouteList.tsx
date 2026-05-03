import { useCallback, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Route as RouteIcon, Container } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
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
          <div key={i} className="h-16 rounded-lg skeleton-shimmer" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <PageHeader
        title="Cung đường"
        icon="route"
        onAdd={handleOpenCreate}
        addLabel="Thêm"
        actions={
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm cung đường..."
            className="search-pill max-w-sm"
          />
        }
      />

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<RouteIcon className="h-6 w-6" />}
            title={search ? 'Không tìm thấy cung đường' : 'Chưa có cung đường'}
            description={search ? 'Thử từ khoá khác' : 'Nhấn + để thêm cung đường mới'}
            compact
          />
        </div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="grid grid-cols-1 gap-2 lg:hidden">
            {filtered.map((r) => (
              <button
                key={`${r.route}-${r.pickupLocation}-${r.dropoffLocation}`}
                onClick={() => setSelected(r)}
                className="card-interactive p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
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

          {/* Desktop: table layout */}
          <div className="hidden lg:block card overflow-hidden">
            <table className="table-modern w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3" style={{ color: 'var(--theme-text-muted)' }}>Tuyến</th>
                  <th className="text-left px-4 py-3" style={{ color: 'var(--theme-text-muted)' }}>Điểm lấy</th>
                  <th className="text-left px-4 py-3" style={{ color: 'var(--theme-text-muted)' }}>Điểm trả</th>
                  <th className="text-right px-4 py-3" style={{ color: 'var(--theme-text-muted)' }}>Giá 20ft</th>
                  <th className="text-right px-4 py-3" style={{ color: 'var(--theme-text-muted)' }}>Giá 40ft</th>
                  <th className="text-center px-4 py-3" style={{ color: 'var(--theme-text-muted)' }}>Hai chiều</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={`${r.route}-${r.pickupLocation}-${r.dropoffLocation}`}
                    className="cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium" style={{ color: 'var(--theme-text-primary)' }}>{r.route}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--theme-text-secondary)' }}>{r.pickupLocation || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--theme-text-secondary)' }}>{r.dropoffLocation || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(r.type20ft)}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(r.type40ft)}</td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--theme-text-secondary)' }}>{r.isTwoWay ? 'Có' : 'Không'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                        {selected.pickupLocation || '—'}
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
                        {selected.dropoffLocation || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Price cards */}
                <div className="px-6 pt-5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.09em] mb-3"
                    style={{ color: 'var(--theme-text-muted)' }}>Giá cước</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: 'Container 20ft', raw: selected.type20ft },
                      { label: 'Container 40ft', raw: selected.type40ft },
                    ].map(({ label, raw }) => {
                      const full = formatCurrencyFull(raw)
                      const match = full.match(/^([\d.]+)(.*)$/)
                      const main = match?.[1] ?? full
                      const suffix = match?.[2] ?? ''
                      return (
                        <div key={label} className="rounded-lg px-4 py-3.5"
                          style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Container className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
                          </div>
                          <p className="m-0 text-[20px] font-semibold leading-none" style={{ color: 'var(--theme-text-primary)' }}>
                            {main}<span className="text-[13px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>{suffix}</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Hai chiều row */}
                <div className="px-6 pt-3.5">
                  <div className="flex items-center justify-between rounded-lg px-4 py-3.5"
                    style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--theme-text-primary)' }}>Hai chiều</span>
                    {selected.isTwoWay ? (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-sm"
                        style={{ background: 'color-mix(in srgb, var(--theme-status-success) 20%, transparent)', color: 'var(--theme-status-success)' }}>Có</span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-sm"
                        style={{ background: 'color-mix(in srgb, var(--theme-status-error) 20%, transparent)', color: 'var(--theme-status-error)' }}>Không</span>
                    )}
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
                <Input value={form.pickupLocation} onChange={e => updateField('pickupLocation', e.target.value)} placeholder="Cảng Cát Lái" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="typo-form-label">Điểm trả</Label>
                <Input value={form.dropoffLocation} onChange={e => updateField('dropoffLocation', e.target.value)} placeholder="KCN Sóng Thần" className="text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="typo-form-label">Giá 20ft</Label>
                <Input type="number" value={form.type20ft || ''} onChange={e => updateField('type20ft', Number(e.target.value))} placeholder="0" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="typo-form-label">Giá 40ft</Label>
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
