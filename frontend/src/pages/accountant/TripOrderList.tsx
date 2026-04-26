import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Truck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader/PageHeader'
import { Badge } from '@/components/ui/Badge/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { SheetPicker } from '@/components/shared/SheetPicker/SheetPicker'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, getTripOrderStatusBadge, WORK_TYPES, type TripOrder, type Client, type Driver, type RoutePrice, type Pricing, type WorkOrder, type WorkType } from '@/data/mockData'

interface TripForm {
  tripDate: string
  clientId: string
  workType: WorkType
  route: string
  driverId: string
  containerNumber: string
  matchedWorkOrderIds: string[]
}

const EMPTY_FORM: TripForm = {
  tripDate: new Date().toISOString().split('T')[0],
  clientId: '', workType: 'E20', route: '', driverId: '', containerNumber: '', matchedWorkOrderIds: [],
}

export function TripOrderList() {
  const [tripOrders, setTripOrders] = useState<TripOrder[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routes, setRoutes] = useState<RoutePrice[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [pricings, setPricings] = useState<Pricing[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<TripForm>(EMPTY_FORM)
  const [autoPricing, setAutoPricing] = useState<Pricing | null>(null)

  const loadData = useCallback(async () => {
    const [tRes, cRes, dRes, rRes, wRes, pRes] = await Promise.all([
      apiClient.getTripOrders(), apiClient.getClients(), apiClient.getDrivers(),
      apiClient.getRoutes(), apiClient.getWorkOrders({ status: 'PENDING' }), apiClient.getPricings(),
    ])
    if (tRes.success) setTripOrders(tRes.data)
    if (cRes.success) setClients(cRes.data)
    if (dRes.success) setDrivers(dRes.data)
    if (rRes.success) setRoutes(rRes.data)
    if (wRes.success) setWorkOrders(wRes.data)
    if (pRes.success) setPricings(pRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-fill pricing when client + workType + route are selected
  useEffect(() => {
    if (form.clientId && form.workType && form.route) {
      const found = pricings.find(p =>
        p.clientId === form.clientId && p.workType === form.workType && p.route === form.route,
      )
      setAutoPricing(found ?? null)
    } else {
      setAutoPricing(null)
    }
  }, [form.clientId, form.workType, form.route, pricings])

  const eligibleWorkOrders = useMemo(() =>
    workOrders.filter(w =>
      (!form.driverId || w.driverId === form.driverId) && w.status === 'PENDING',
    ),
    [workOrders, form.driverId],
  )

  const handleOpenCreate = useCallback(() => {
    setForm(EMPTY_FORM)
    setAutoPricing(null)
    setDialogOpen(true)
  }, [])

  const handleSubmit = useCallback(async () => {
    const client = clients.find(c => c.id === form.clientId)
    const driver = drivers.find(d => d.id === form.driverId)
    const matchedWO = workOrders.filter(w => form.matchedWorkOrderIds.includes(w.id))

    await apiClient.createTripOrder({
      tripDate: form.tripDate,
      clientId: form.clientId,
      clientName: client?.name ?? '',
      workType: form.workType,
      route: form.route,
      tractorPlate: driver?.tractorPlate ?? '',
      driverId: form.driverId,
      driverName: driver?.name ?? '',
      containerNumber: form.containerNumber,
      pricingId: autoPricing?.id ?? '',
      unitPrice: autoPricing?.unitPrice ?? 0,
      driverSalary: autoPricing?.driverSalary ?? 0,
      allowance: autoPricing?.allowance ?? 0,
      revenue: autoPricing?.unitPrice ?? 0,
      matchedWorkOrderIds: form.matchedWorkOrderIds,
    })
    setDialogOpen(false)
    setLoading(true)
    loadData()
  }, [form, clients, drivers, workOrders, autoPricing, loadData])

  const toggleWorkOrder = useCallback((woId: string) => {
    setForm(prev => ({
      ...prev,
      matchedWorkOrderIds: prev.matchedWorkOrderIds.includes(woId)
        ? prev.matchedWorkOrderIds.filter(id => id !== woId)
        : [...prev.matchedWorkOrderIds, woId],
    }))
  }, [])

  const updateField = useCallback((field: keyof TripForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  if (loading) {
    return <div className="p-4"><div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--theme-bg-tertiary)]" />)}</div></div>
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader title="Chuyến/Lệnh" subtitle={`${tripOrders.length} chuyến`} onAdd={handleOpenCreate} addLabel="Tạo chuyến" />

      <button onClick={handleOpenCreate}
        className="lg:hidden w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
        <Plus className="h-4 w-4" /> Tạo chuyến
      </button>

      <div className="space-y-2">
        {tripOrders.map(t => {
          const badge = getTripOrderStatusBadge(t.status)
          return (
            <div key={t.id}
              className="p-4 rounded-xl border space-y-2"
              style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{t.clientName}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>{t.workType}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{t.driverName} · {t.tractorPlate}</p>
                </div>
                <Badge variant={badge.variant as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'}>{badge.label}</Badge>
              </div>
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{t.route}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(t.revenue)}</p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{t.matchedWorkOrderIds.length} công đối soát</p>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo chuyến/Lệnh</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Ngày</Label>
              <Input type="date" value={form.tripDate} onChange={e => updateField('tripDate', e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Khách hàng</Label>
              <SheetPicker
                label="Chọn khách hàng"
                placeholder="Chọn khách hàng"
                value={form.clientId}
                onChange={v => updateField('clientId', v)}
                options={clients.map(c => ({ value: c.id, label: c.name }))}
              />
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
              <SheetPicker
                label="Chọn cung đường"
                placeholder="Chọn cung đường"
                value={form.route}
                onChange={v => updateField('route', v)}
                options={routes.map(r => ({ value: r.route, label: r.route }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tài xế</Label>
              <SheetPicker
                label="Chọn tài xế"
                placeholder="Chọn tài xế"
                value={form.driverId}
                onChange={v => updateField('driverId', v)}
                options={drivers.map(d => ({ value: d.id, label: `${d.name} (${d.tractorPlate})` }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số container</Label>
              <Input value={form.containerNumber} onChange={e => updateField('containerNumber', e.target.value)} placeholder="MSKU-1234567" className="text-sm" />
            </div>

            {autoPricing && (
              <div className="p-3 rounded-xl space-y-1" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Đơn giá tự động</p>
                <div className="grid grid-cols-3 gap-2 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  <span>Đơn giá: {formatCurrencyFull(autoPricing.unitPrice)}</span>
                  <span>Lương LX: {formatCurrencyFull(autoPricing.driverSalary)}</span>
                  <span>Phụ cấp: {formatCurrencyFull(autoPricing.allowance)}</span>
                </div>
              </div>
            )}

            {eligibleWorkOrders.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Đối soát số công ({eligibleWorkOrders.length} chờ)</Label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {eligibleWorkOrders.map(wo => (
                    <label key={wo.id} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer" style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <input type="checkbox" checked={form.matchedWorkOrderIds.includes(wo.id)} onChange={() => toggleWorkOrder(wo.id)} className="rounded" />
                      <span className="text-xs" style={{ color: 'var(--theme-text-primary)' }}>{wo.workOrderNumber} ({wo.workType})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleSubmit} disabled={!form.clientId || !form.route || !form.driverId} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>Xác nhận</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
