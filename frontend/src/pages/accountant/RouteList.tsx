import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Route as RouteIcon } from 'lucide-react'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { InfoRow } from '@/components/shared/InfoRow'
import { apiClient } from '@/services/api'
import { formatCurrencyFull } from '@/data/mockData'
import type { RoutePrice } from '@/data/mockData'

interface RouteForm {
  route: string
  type20ft: number
  type40ft: number
  isTwoWay: boolean
}

const EMPTY_FORM: RouteForm = { route: '', type20ft: 0, type40ft: 0, isTwoWay: false }

export function RouteList() {
  const [routes, setRoutes] = useState<RoutePrice[]>([])
  const [loading, setLoading] = useState(true)

  // Detail dialog
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [form, setForm] = useState<RouteForm>(EMPTY_FORM)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const loadRoutes = useCallback(async () => {
    const res = await apiClient.getRoutes()
    if (res.success) setRoutes(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadRoutes() }, [loadRoutes])

  const handleOpenCreate = useCallback(() => {
    setEditIdx(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }, [])

  const handleOpenEdit = useCallback((idx: number) => {
    const r = routes[idx]
    setEditIdx(idx)
    setForm({ route: r.route, type20ft: r.type20ft, type40ft: r.type40ft, isTwoWay: r.isTwoWay ?? false })
    setSelectedIdx(null)
    setDialogOpen(true)
  }, [routes])

  const handleSubmit = useCallback(async () => {
    if (editIdx !== null) {
      await apiClient.updateRoute(editIdx, form)
    } else {
      await apiClient.createRoute(form)
    }
    setDialogOpen(false)
    loadRoutes()
  }, [editIdx, form, loadRoutes])

  const handleDelete = useCallback(async (idx: number) => {
    await apiClient.deleteRoute(idx)
    setDeleteConfirm(null)
    setSelectedIdx(null)
    loadRoutes()
  }, [loadRoutes])

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
      {/* Route list — clean cards, tap to see detail */}
      <div className="space-y-2">
        {routes.map((r, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIdx(idx)}
            className="w-full text-left rounded-2xl p-3 transition-all active:scale-[0.98] touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--theme-bg-tertiary)' }}>
                <RouteIcon className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{r.route}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                  20ft: {formatCurrencyFull(r.type20ft)} · 40ft: {formatCurrencyFull(r.type40ft)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Route Detail Dialog */}
      <Dialog open={selectedIdx !== null} onOpenChange={() => setSelectedIdx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedIdx !== null ? routes[selectedIdx]?.route : ''}</DialogTitle>
          </DialogHeader>
          {selectedIdx !== null && (
            <div className="space-y-1">
              <InfoRow icon={RouteIcon} label="Giá 20ft" value={formatCurrencyFull(routes[selectedIdx].type20ft)} />
              <InfoRow label="Giá 40ft" value={formatCurrencyFull(routes[selectedIdx].type40ft)} />
              <InfoRow label="Hai chiều" value={routes[selectedIdx].isTwoWay ? 'Có' : 'Không'} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(selectedIdx!)} className="flex-1" style={{ color: 'var(--theme-status-error)' }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Xoá
            </Button>
            <Button onClick={() => handleOpenEdit(selectedIdx!)} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editIdx !== null ? 'Sửa cung đường' : 'Thêm cung đường'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tuyến đường</Label>
              <Input value={form.route} onChange={e => updateField('route', e.target.value)} placeholder="Hải Phòng → ..." className="text-sm" />
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
              {editIdx !== null ? 'Cập nhật' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá cung đường?</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Huỷ</Button>
            <Button variant="destructive" className="flex-1" onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={handleOpenCreate} label="Thêm cung đường" />
    </div>
  )
}
