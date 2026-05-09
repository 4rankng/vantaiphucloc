import { useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { useClients, useCreateTripOrder, useCreateClient, useImportTripOrders, useLocations } from '@/hooks/use-queries'
import { WORK_TYPES, type WorkType } from '@/data/domain'
import { PageHeader } from '@/components/shared/PageHeader'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { LocationSelect } from '@/components/shared/LocationSelect/LocationSelect'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { ImportResultDialog } from '@/components/shared/ImportResultDialog'
import { Plus, Trash2, Upload, ChevronLeft } from 'lucide-react'
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
  const { data: locations = [] } = useLocations()
  const createTripOrder = useCreateTripOrder()
  const createClient = useCreateClient()
  const importMutation = useImportTripOrders()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null)

  const clientOptions = useMemo(() => clients.map(x => ({ value: String(x.id), label: x.name })), [clients])
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
    const normalizedValue = field === 'containerNumber' && typeof value === 'string'
      ? value.replace(/-/g, '').toUpperCase()
      : value
    setCongItems(prev => prev.map(c => c.id === id ? { ...c, [field]: normalizedValue } : c))
  }

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
    const pickupId = locations.find(l => l.name === pickupLocation)?.id
    const dropoffId = locations.find(l => l.name === dropoffLocation)?.id
    if (!pickupId || !dropoffId) {
      toast.error('Vui lòng chọn điểm lấy/trả từ danh sách')
      return
    }
    setSubmitting(true)
    const route = `${pickupLocation} - ${dropoffLocation}`
    createTripOrder.mutate({
      tripDate: new Date().toISOString().slice(0, 10),
      clientId: Number(clientId),
      route,
      pickupLocationId: pickupId,
      dropoffLocationId: dropoffId,
      containers: congItems.map(item => ({ containerNumber: item.containerNumber, workType: item.workType })),
      pricingId: null,
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

  const isValid = !!clientId && !!pickupLocation && !!dropoffLocation

  return (
    <div className="page-container space-y-5 max-w-3xl">
      <PageHeader
        title="Tạo chuyến"
        breadcrumbs={
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            <ChevronLeft size={14} /> Đơn hàng
          </button>
        }
        actions={
          <>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="btn-ghost h-9 px-3 text-xs font-semibold"
            >
              <Upload className="w-3.5 h-3.5" /> {importing ? 'Đang nhập...' : 'Nhập đơn'}
            </button>
          </>
        }
      />

      {/* Form card */}
      <div className="card divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
        {/* Section 1: Khách hàng + tuyến */}
        <section className="p-5 space-y-4">
          <h3 className="typo-h3">Thông tin chung</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5 lg:col-span-3">
              <Label className="typo-form-label">Khách hàng *</Label>
              <InlineSelect
                options={clientOptions}
                value={clientId}
                onChange={setClientId}
                placeholder="Chọn khách hàng"
                onCreateNew={() => setCreateClientOpen(true)}
                createNewLabel="Tạo khách hàng mới"
              />
            </div>
            <div className="space-y-1.5 lg:col-span-1">
              <Label className="typo-form-label">Điểm lấy *</Label>
              <LocationSelect
                value={pickupLocation}
                onChange={(val: string) => { setPickupLocation(val); setDropoffLocation('') }}
                placeholder="Chọn điểm lấy"
              />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="typo-form-label">Điểm trả *</Label>
              <LocationSelect
                value={dropoffLocation}
                onChange={setDropoffLocation}
                placeholder="Chọn điểm trả"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Hàng hóa */}
        <section className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="typo-h3">Hàng hóa</h3>
            <button
              onClick={addCong}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold transition-colors"
              style={{ color: 'var(--theme-brand-primary)', background: 'var(--theme-brand-primary-light)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Thêm mục
            </button>
          </div>

          <div className="space-y-2">
            {congItems.map((item, i) => (
              <div
                key={item.id}
                className="rounded-lg p-3 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] items-center gap-3"
                style={{ background: 'var(--theme-bg-tertiary)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="typo-label" style={{ color: 'var(--theme-text-muted)' }}>#{i + 1}</span>
                  <div className="flex flex-wrap gap-1">
                    {WORK_TYPES.map(w => {
                      const active = item.workType === w
                      return (
                        <button
                          key={w}
                          onClick={() => updateCong(item.id, 'workType', w)}
                          className="h-8 px-2.5 rounded-md text-xs font-bold transition-colors"
                          style={{
                            background: active ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                            color: active ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                            border: active ? 'none' : '1px solid var(--theme-border-default)',
                          }}
                        >
                          {w}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <Input
                  value={item.containerNumber}
                  onChange={e => updateCong(item.id, 'containerNumber', e.target.value)}
                  placeholder="Số container"
                  className="text-sm font-mono h-9"
                />
                {congItems.length > 1 ? (
                  <button
                    onClick={() => removeCong(item.id)}
                    aria-label="Xoá mục"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors"
                    style={{ color: 'var(--theme-status-error)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="hidden lg:block w-9" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Lương tài xế */}
        <section className="p-5 space-y-4">
          <h3 className="typo-h3">Lương tài xế</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="typo-form-label">Lương</Label>
              <Input
                type="number"
                value={driverSalary || ''}
                onChange={e => setDriverSalary(Number(e.target.value))}
                placeholder="0"
                className="text-sm font-mono h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="typo-form-label">Phụ cấp</Label>
              <Input
                type="number"
                value={allowance || ''}
                onChange={e => setAllowance(Number(e.target.value))}
                placeholder="0"
                className="text-sm font-mono h-9"
              />
            </div>
          </div>
        </section>

        {/* Inline action footer (no sticky — keeps sidebar uncovered) */}
        <div className="px-5 py-4 flex items-center justify-end gap-2" style={{ background: 'var(--theme-bg-tertiary)' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary h-9 px-4 text-sm"
          >
            Hủy
          </button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="btn-primary h-9 px-4 text-sm"
          >
            {submitting ? 'Đang tạo...' : 'Tạo chuyến'}
          </Button>
        </div>
      </div>

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
