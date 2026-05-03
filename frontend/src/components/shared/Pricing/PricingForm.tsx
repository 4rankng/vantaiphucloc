import { useState, useMemo } from 'react'
import { useRoutes } from '@/hooks/use-queries'
import { type Pricing, type PricingLine } from '@/data/domain'
import { Button } from '@/components/ui'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { LineEditor } from './LineEditor'
import { X, Check } from 'lucide-react'

interface Props {
  initial?: Pricing
  clients: { id: number; name: string }[]
  /** If provided, locks the form to this client (used from detail page) */
  lockedClientId?: number
  onSave: (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  onCreateClient: () => void
}

export function PricingForm({ initial, clients, lockedClientId, onSave, onCancel, onCreateClient }: Props) {
  const { data: routes = [] } = useRoutes()

  const [clientId, setClientId] = useState(
    String(lockedClientId ?? initial?.clientId ?? ''),
  )
  const [workType, setWorkType] = useState(initial?.workType ?? 'E20')
  const [pickupLocation, setPickupLocation] = useState(initial?.pickupLocation ?? '')
  const [dropoffLocation, setDropoffLocation] = useState(initial?.dropoffLocation ?? '')
  const [lines, setLines] = useState<PricingLine[]>(
    initial?.lines?.length
      ? initial.lines
      : [{ quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }],
  )

  const clientOptions = useMemo(
    () => clients.map(c => ({ value: String(c.id), label: c.name })),
    [clients],
  )
  const workTypeOptions = [
    { value: 'E20', label: 'E20' },
    { value: 'E40', label: 'E40' },
    { value: 'F20', label: 'F20' },
    { value: 'F40', label: 'F40' },
  ]
  const pickupOptions = useMemo(
    () =>
      [...new Set(routes.map(r => r.pickupLocation).filter(Boolean) as string[])].map(loc => ({
        value: loc,
        label: loc,
      })),
    [routes],
  )
  const dropoffOptions = useMemo(
    () =>
      routes
        .filter(r => r.pickupLocation === pickupLocation)
        .map(r => ({ value: r.dropoffLocation ?? '', label: r.dropoffLocation ?? '' })),
    [routes, pickupLocation],
  )

  const clientName = clients.find(c => String(c.id) === clientId)?.name ?? ''
  const route = pickupLocation && dropoffLocation ? `${pickupLocation} - ${dropoffLocation}` : ''

  const handleSubmit = () => {
    if (!clientId || !route || lines.length === 0) return
    onSave({
      clientId: Number(clientId),
      clientName,
      workType: workType as Pricing['workType'],
      route,
      pickupLocation,
      dropoffLocation,
      lines,
    })
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '2px solid var(--theme-brand-primary)',
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
          {initial ? 'Sửa bảng giá' : 'Thêm bảng giá'}
        </p>
        <button onClick={onCancel} className="touch-manipulation" style={{ color: 'var(--theme-text-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Client selector — hidden when locked */}
        {!lockedClientId && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
              Khách hàng
            </Label>
            <InlineSelect
              options={clientOptions}
              value={clientId}
              onChange={setClientId}
              placeholder="Chọn khách hàng"
              onCreateNew={onCreateClient}
              createNewLabel="Tạo khách hàng mới"
            />
          </div>
        )}

        {/* Work type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
            Loại cont
          </Label>
          <div className="flex gap-1">
            {workTypeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setWorkType(opt.value)}
                className="px-2 py-1.5 rounded-lg text-xs font-bold touch-manipulation"
                style={{
                  background: workType === opt.value ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                  color: workType === opt.value ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
            Cung đường
          </Label>
          <div className="space-y-1.5">
            <InlineSelect
              options={pickupOptions}
              value={pickupLocation}
              onChange={v => { setPickupLocation(v); setDropoffLocation('') }}
              placeholder="Điểm lấy"
            />
            <InlineSelect
              options={dropoffOptions}
              value={dropoffLocation}
              onChange={setDropoffLocation}
              placeholder="Điểm trả"
            />
          </div>
        </div>
      </div>

      <LineEditor lines={lines} onChange={setLines} />

      <Button
        onClick={handleSubmit}
        disabled={!clientId || !route || lines.length === 0}
        className="w-full h-10 font-bold rounded-xl text-sm"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
      >
        <Check className="w-4 h-4 mr-1.5" /> {initial ? 'Lưu' : 'Thêm'}
      </Button>
    </div>
  )
}
