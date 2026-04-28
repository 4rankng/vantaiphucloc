import { useState, useEffect } from 'react'
import { useAppStore } from '@/hooks/use-app-store'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { apiClient } from '@/services/api'
import { WORK_TYPES, type Client, type Driver, type WorkType } from '@/data/mockData'
import { SheetPicker } from '@/components/shared/SheetPicker'
import { Plus, Trash2 } from 'lucide-react'

interface CongItem {
  id: string
  workType: WorkType
  containerNumber: string
}

export function CreateTrip() {
  const { goBack } = useAppStore()
  const [clients, setClients] = useState<{ value: string; label: string }[]>([])
  const [drivers, setDrivers] = useState<{ value: string; label: string }[]>([])
  const [routes, setRoutes] = useState<{ value: string; label: string }[]>([])
  const [clientMap, setClientMap] = useState<Map<string, string>>(new Map())
  const [driverMap, setDriverMap] = useState<Map<string, { name: string; plate: string }>>(new Map())

  const [clientId, setClientId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [route, setRoute] = useState('')
  const [congItems, setCongItems] = useState<CongItem[]>([
    { id: '1', workType: 'E20', containerNumber: '' },
  ])
  const [driverSalary, setDriverSalary] = useState(0)
  const [allowance, setAllowance] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([apiClient.getClients(), apiClient.getDrivers(), apiClient.getRoutes()])
      .then(([c, d, r]) => {
        if (c.success) {
          setClients(c.data.map((x: Client) => ({ value: x.id, label: x.name })))
          setClientMap(new Map(c.data.map((x: Client) => [x.id, x.name])))
        }
        if (d.success) {
          setDrivers(d.data.map((x: Driver) => ({ value: x.id, label: `${x.name} (${x.tractorPlate})` })))
          setDriverMap(new Map(d.data.map((x: Driver) => [x.id, { name: x.name, plate: x.tractorPlate }])))
        }
        if (r.success) setRoutes(r.data.map((x: { route: string }) => ({ value: x.route, label: x.route })))
      })
  }, [])

  const addCong = () => {
    setCongItems(prev => [...prev, { id: String(prev.length + 1), workType: 'E20', containerNumber: '' }])
  }

  const removeCong = (id: string) => {
    setCongItems(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev)
  }

  const updateCong = (id: string, field: keyof CongItem, value: string | number) => {
    setCongItems(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleSubmit = async () => {
    if (!clientId || !driverId || !route || submitting) return
    setSubmitting(true)
    try {
      const firstCong = congItems[0]
      const clientName = clientMap.get(clientId) ?? ''
      const driverInfo = driverMap.get(driverId) ?? { name: '', plate: '' }
      await apiClient.createTripOrder({
        tripDate: new Date().toISOString().slice(0, 10),
        clientId,
        clientName,
        workType: firstCong.workType,
        route,
        tractorPlate: driverInfo.plate,
        driverId,
        driverName: driverInfo.name,
        containerNumber: firstCong.containerNumber,
        pricingId: '',
        unitPrice: 0,
        driverSalary,
        allowance,
        revenue: 0,
        matchedWorkOrderIds: [],
      })
      goBack()
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Client */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Khách hàng</Label>
        <SheetPicker options={clients} value={clientId} onChange={setClientId} placeholder="Chọn khách hàng" />
      </div>

      {/* Route */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Cung đường</Label>
        <SheetPicker options={routes} value={route} onChange={setRoute} placeholder="Chọn cung đường" />
      </div>

      {/* Driver */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tài xế</Label>
        <SheetPicker options={drivers} value={driverId} onChange={setDriverId} placeholder="Chọn tài xế" />
      </div>

      {/* Trip-level salary & allowance */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Lương tài xế</Label>
          <Input type="number" value={driverSalary || ''} onChange={e => setDriverSalary(Number(e.target.value))}
            placeholder="0" className="text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Phụ cấp</Label>
          <Input type="number" value={allowance || ''} onChange={e => setAllowance(Number(e.target.value))}
            placeholder="0" className="text-sm" />
        </div>
      </div>

      {/* Cong items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Công</Label>
          <button onClick={addCong} className="flex items-center gap-1 text-xs font-medium touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>
            <Plus className="w-3.5 h-3.5" /> Thêm công
          </button>
        </div>
        <div className="space-y-3">
          {congItems.map((item, i) => (
            <div key={item.id} className="rounded-2xl p-3 space-y-3"
              style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Công {i + 1}</span>
                {congItems.length > 1 && (
                  <button onClick={() => removeCong(item.id)} className="touch-manipulation" style={{ color: 'var(--theme-status-error)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WORK_TYPES.map(w => (
                  <button key={w} onClick={() => updateCong(item.id, 'workType', w)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors touch-manipulation"
                    style={{
                      background: item.workType === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                      color: item.workType === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                    }}>
                    {w}
                  </button>
                ))}
              </div>
              <Input
                value={item.containerNumber}
                onChange={e => updateCong(item.id, 'containerNumber', e.target.value)}
                placeholder="Số cont"
                className="text-sm font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={!clientId || !driverId || !route || submitting}
        className="w-full h-11 font-bold rounded-xl"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
        {submitting ? 'Đang tạo...' : 'Tạo chuyến'}
      </Button>
    </div>
  )
}
