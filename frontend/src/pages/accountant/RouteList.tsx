import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Route } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [form, setForm] = useState<RouteForm>(EMPTY_FORM)
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
    loadRoutes()
  }, [loadRoutes])

  const updateField = useCallback((field: keyof RouteForm, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  if (loading) {
    return <div className="p-4"><div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--theme-bg-tertiary)]" />)}</div></div>
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Cung đường" subtitle={`${routes.length} tuyến đường`} onAdd={handleOpenCreate} addLabel="Thêm cung đường" />

      <button onClick={handleOpenCreate}
        className="lg:hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
        <Plus className="h-4 w-4" /> Thêm cung đường
      </button>

      <div className="space-y-2">
        {routes.map((r, idx) => (
          <div key={idx}
            className="flex items-start gap-3 p-4 rounded-xl border"
            style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--theme-bg-tertiary)' }}>
              <Route className="h-5 w-5" style={{ color: 'var(--theme-text-muted)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{r.route}</p>
              {r.isTwoWay && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>2 chiều</span>}
              <div className="flex gap-4 mt-1">
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>20ft: {formatCurrencyFull(r.type20ft)}</p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>40ft: {formatCurrencyFull(r.type40ft)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleOpenEdit(idx)} className="h-8 w-8 flex items-center justify-center rounded-lg touch-manipulation" style={{ color: 'var(--theme-text-muted)' }} aria-label="Sửa">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => setDeleteConfirm(idx)} className="h-8 w-8 flex items-center justify-center rounded-lg touch-manipulation" style={{ color: 'var(--theme-status-error)' }} aria-label="Xoá">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
            <Button onClick={handleSubmit} disabled={!form.route.trim()}>{editIdx !== null ? 'Cập nhật' : 'Tạo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá cung đường?</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={() => deleteConfirm !== null && handleDelete(deleteConfirm)}>Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
