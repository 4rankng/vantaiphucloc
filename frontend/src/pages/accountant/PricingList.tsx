import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, CircleDollarSign } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, WORK_TYPES, type Pricing, type Client, type RoutePrice, type WorkType } from '@/data/mockData'

interface PricingForm {
  clientId: string
  clientName: string
  workType: WorkType
  route: string
  unitPrice: number
  driverSalary: number
  allowance: number
}

const EMPTY_FORM: PricingForm = {
  clientId: '', clientName: '', workType: 'E20', route: '', unitPrice: 0, driverSalary: 0, allowance: 0,
}

export function PricingList() {
  const [pricings, setPricings] = useState<Pricing[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [routes, setRoutes] = useState<RoutePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Pricing | null>(null)
  const [form, setForm] = useState<PricingForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [pRes, cRes, rRes] = await Promise.all([
      apiClient.getPricings(), apiClient.getClients(), apiClient.getRoutes(),
    ])
    if (pRes.success) setPricings(pRes.data)
    if (cRes.success) setClients(cRes.data)
    if (rRes.success) setRoutes(rRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleOpenCreate = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }, [])

  const handleOpenEdit = useCallback((p: Pricing) => {
    setEditing(p)
    setForm({ clientId: p.clientId, clientName: p.clientName, workType: p.workType, route: p.route, unitPrice: p.unitPrice, driverSalary: p.driverSalary, allowance: p.allowance })
    setDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (editing) {
      await apiClient.updatePricing(editing.id, form)
    } else {
      await apiClient.createPricing(form)
    }
    setDialogOpen(false)
    loadData()
  }, [editing, form, loadData])

  const handleDelete = useCallback(async (id: string) => {
    await apiClient.deletePricing(id)
    setDeleteConfirm(null)
    loadData()
  }, [loadData])

  const updateField = useCallback((field: keyof PricingForm, value: string | number) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'clientId') {
        const client = clients.find(c => c.id === value)
        if (client) next.clientName = client.name
      }
      return next
    })
  }, [clients])

  if (loading) {
    return <div className="p-4"><div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--theme-bg-tertiary)]" />)}</div></div>
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Đơn giá" subtitle={`${pricings.length} mục`} onAdd={handleOpenCreate} addLabel="Thêm đơn giá" />

      <button onClick={handleOpenCreate}
        className="lg:hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
        <Plus className="h-4 w-4" /> Thêm đơn giá
      </button>

      <div className="space-y-2">
        {pricings.map(p => (
          <div key={p.id}
            className="flex items-start gap-3 p-4 rounded-xl border"
            style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--theme-bg-tertiary)' }}>
              <CircleDollarSign className="h-5 w-5" style={{ color: 'var(--theme-text-muted)' }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{p.clientName}</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>{p.workType}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{p.route}</p>
              <div className="flex gap-3 mt-1">
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá: {formatCurrencyFull(p.unitPrice)}</p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Lương LX: {formatCurrencyFull(p.driverSalary)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleOpenEdit(p)} className="h-8 w-8 flex items-center justify-center rounded-lg touch-manipulation" style={{ color: 'var(--theme-text-muted)' }} aria-label="Sửa">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => setDeleteConfirm(p.id)} className="h-8 w-8 flex items-center justify-center rounded-lg touch-manipulation" style={{ color: 'var(--theme-status-error)' }} aria-label="Xoá">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Sửa đơn giá' : 'Thêm đơn giá'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Khách hàng</Label>
              <select value={form.clientId} onChange={e => updateField('clientId', e.target.value)}
                className="w-full h-10 rounded-lg px-3 text-sm border" style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}>
                <option value="">Chọn khách hàng</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại công</Label>
              <div className="grid grid-cols-4 gap-2">
                {WORK_TYPES.map(wt => (
                  <button key={wt} onClick={() => updateField('workType', wt)}
                    className="py-2 px-1 rounded-lg text-xs font-bold transition-colors"
                    style={{
                      background: form.workType === wt ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                      color: form.workType === wt ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                    }}>
                    {wt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Cung đường</Label>
              <select value={form.route} onChange={e => updateField('route', e.target.value)}
                className="w-full h-10 rounded-lg px-3 text-sm border" style={{ background: 'var(--theme-bg-tertiary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}>
                <option value="">Chọn cung đường</option>
                {routes.map((r, i) => <option key={i} value={r.route}>{r.route}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Đơn giá</Label>
                <Input type="number" value={form.unitPrice || ''} onChange={e => updateField('unitPrice', Number(e.target.value))} placeholder="0" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Lương LX</Label>
                <Input type="number" value={form.driverSalary || ''} onChange={e => updateField('driverSalary', Number(e.target.value))} placeholder="0" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Phụ cấp</Label>
                <Input type="number" value={form.allowance || ''} onChange={e => updateField('allowance', Number(e.target.value))} placeholder="0" className="text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
            <Button onClick={handleSubmit} disabled={!form.clientId || !form.route}>{editing ? 'Cập nhật' : 'Tạo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá đơn giá?</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Hành động này không thể hoàn tác.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
