import { useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { useClients, useRoutes, useCreateTripOrder, useCreateClient, useImportTripOrders } from '@/hooks/use-queries'
import { WORK_TYPES, type WorkType } from '@/data/domain'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { ImportResultDialog } from '@/components/shared/ImportResultDialog'
import { Plus, Trash2, ArrowLeft, Upload } from 'lucide-react'
import { useToast } from '@/components/atoms/Toast'

interface CongItem {
  id: string
  workType: WorkType
  containerNumber: string
}

export function CreateTrip() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: clients = [] } = useClients()
  const { data: routes = [] } = useRoutes()
  const createTripOrder = useCreateTripOrder()
  const createClient = useCreateClient()
  const importMutation = useImportTripOrders()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null)

  const clientOptions = useMemo(() => clients.map(x => ({ value: String(x.id), label: x.name })), [clients])
  const pickupOptions = useMemo(() => [...new Set(routes.map(r => r.pickupLocation).filter(Boolean) as string[])].map(loc => ({ value: loc!, label: loc! })), [routes])
  const clientMap = useMemo(() => new Map(clients.map(x => [x.id, x.name])), [clients])

  const [clientId, setClientId] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [congItems, setCongItems] = useState<CongItem[]>([
    { id: '1', workType: 'E20', containerNumber: '' },
  ])
  const [driverSalary, setDriverSalary] = useState(0)
  const [allowance, setAllowance] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [createClientOpen, setCreateClientOpen] = useState(false)

  const addCong = () => {
    setCongItems(prev => [...prev, { id: String(prev.length + 1), workType: 'E20', containerNumber: '' }])
  }

  const removeCong = (id: string) => {
    setCongItems(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev)
  }

  const updateCong = (id: string, field: keyof CongItem, value: string | number) => {
    setCongItems(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const dropoffOptions = useMemo(() =>
    routes.filter(r => r.pickupLocation === pickupLocation).map(r => ({ value: r.dropoffLocation ?? '', label: r.dropoffLocation ?? '' })),
    [routes, pickupLocation],
  )

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const res = await importMutation.mutateAsync(file)
    if (res.success) {
      if (res.data.errors.length > 0) {
        setImportResult(res.data)
      } else {
        toast.success(`Nhập thành công ${res.data.created} lệnh`)
        navigate(-1)
      }
    } else {
      toast.error('Nhập thất bại')
    }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = () => {
    if (!clientId || !pickupLocation || !dropoffLocation || submitting) return
    setSubmitting(true)
    const firstCong = congItems[0]
    const clientName = clientMap.get(Number(clientId)) ?? ''
    const route = `${pickupLocation} - ${dropoffLocation}`
    createTripOrder.mutate({
      tripDate: new Date().toISOString().slice(0, 10),
      clientId: Number(clientId),
      clientName,
      workType: firstCong.workType,
      route,
      pickupLocation,
      dropoffLocation,
      containerNumber: firstCong.containerNumber,
      pricingId: 0,
      unitPrice: 0,
      driverSalary,
      allowance,
      revenue: 0,
      matchedWorkOrderIds: [],
    }, {
      onSuccess: () => navigate(-1),
      onError: () => setSubmitting(false),
    })
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>Tạo đơn hàng</span>
        <div className="flex-1" />
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
        >
          <Upload className="w-3.5 h-3.5" /> {importing ? 'Đang nhập...' : 'Nhập Excel'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="typo-form-label">Khách hàng</Label>
            <InlineSelect
              options={clientOptions}
              value={clientId}
              onChange={setClientId}
              placeholder="Chọn khách hàng"
              onCreateNew={() => setCreateClientOpen(true)}
              createNewLabel="Tạo khách hàng mới"
            />
          </div>

          <div className="space-y-2">
            <Label className="typo-form-label">Điểm lấy</Label>
            <InlineSelect
              options={pickupOptions}
              value={pickupLocation}
              onChange={(val: string) => { setPickupLocation(val); setDropoffLocation('') }}
              placeholder="Chọn điểm lấy"
            />
          </div>

          <div className="space-y-2">
            <Label className="typo-form-label">Điểm trả</Label>
            <InlineSelect options={dropoffOptions} value={dropoffLocation} onChange={setDropoffLocation} placeholder="Chọn điểm trả" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="typo-form-label">Lương tài xế</Label>
              <Input type="number" value={driverSalary || ''} onChange={e => setDriverSalary(Number(e.target.value))}
                placeholder="0" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Phụ cấp</Label>
              <Input type="number" value={allowance || ''} onChange={e => setAllowance(Number(e.target.value))}
                placeholder="0" className="text-sm" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="typo-form-label">Container</Label>
            <button onClick={addCong} className="flex items-center gap-1 text-xs font-medium touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>
              <Plus className="w-3.5 h-3.5" /> Thêm cont
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
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1.5 shrink-0">
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
                    className="text-sm font-mono min-w-0 flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!clientId || !pickupLocation || !dropoffLocation || submitting}
        className="w-full h-11 font-bold rounded-xl"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
        {submitting ? 'Đang tạo...' : 'Tạo chuyến'}
      </Button>

      <CreateClientDialog
        open={createClientOpen}
        onClose={() => setCreateClientOpen(false)}
        onConfirm={(data) => {
          createClient.mutate(
            { ...data, outstandingDebt: 0 },
            { onSuccess: () => setCreateClientOpen(false) },
          )
        }}
      />

      {importResult && (
        <ImportResultDialog
          open={!!importResult}
          onClose={() => setImportResult(null)}
          result={importResult}
          onCreateManual={() => setImportResult(null)}
        />
      )}
    </div>
  )
}
